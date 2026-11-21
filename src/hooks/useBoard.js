import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { makeApi } from '../api.js';
import { validSelection } from '../logic.js';
import { createBoardPresence } from '../presence.js';
import { toast } from '../toast.js';

const incomingOf = state => state?.invites?.filter(invite => invite.to === state.me?.id) ?? [];
const PICKERS = ['invite', 'seat', 'swap'];

// State with a ref that is updated synchronously, so long-lived callbacks always read the latest value.
function useSyncedState(initial) {
  const [value, setValue] = useState(initial);
  const ref = useRef(initial);
  const set = useCallback(next => {
    const v = typeof next === 'function' ? next(ref.current) : next;
    ref.current = v;
    setValue(v);
  }, []);
  return [value, set, ref];
}

/** All board state: server data, selection, open sheet, auth form, and the load/act/sign-out flow. */
export function useBoard(sb) {
  const api = useMemo(() => makeApi(sb), [sb]);

  const [S, setSState] = useState(null);
  const [booted, setBooted] = useState(false);
  const [viewers, setViewers] = useState(null);
  const [sel, setSel, selRef] = useSyncedState(null);
  const [dialog, setDialog, dialogRef] = useSyncedState(null);
  const [visibleInviteId, setVisibleInviteId, visibleRef] = useSyncedState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authErr, setAuthErr] = useState('');
  const [authMsg, setAuthMsg] = useState('');

  const sRef = useRef(null);
  const holdRef = useRef(false);
  const heldRef = useRef(false);
  const pendingFocus = useRef(null);
  const pickerSeq = useRef(0);
  const guard = useRef({ requestId: 0, loadingRequest: null, sessionUser: null, signingOut: false, mutation: null }).current;

  const [syncPresence] = useState(() => createBoardPresence(sb, names => setViewers(names)));

  // New server state goes to sRef always; to React state only when not held (a drag is active).
  const commitS = useCallback(next => {
    sRef.current = next;
    if (holdRef.current) heldRef.current = true;
    else setSState(next);
  }, []);

  const holdRenders = useCallback(on => {
    holdRef.current = on;
    if (!on && heldRef.current) {
      heldRef.current = false;
      setSState(sRef.current);
    }
  }, []);

  const load = useCallback(async force => {
    const g = guard;
    if (g.signingOut || (!force && g.loadingRequest !== null)) return;
    const request = ++g.requestId;
    g.loadingRequest = request;
    try {
      const { data: { session }, error } = await sb.auth.getSession();
      if (request !== g.requestId) return;
      const user = session?.user.id ?? null;
      if (user !== g.sessionUser) {
        g.sessionUser = user;
        commitS(null);
        setDialog(null);
        setSel(null);
        g.mutation = null;
        setVisibleInviteId(null);
        void syncPresence(null);
      }
      if (error) throw error;
      const next = user ? await api('state') : null;
      if (request !== g.requestId || (next?.me && next.me.id !== user)) return;

      const prev = sRef.current;
      let d = dialogRef.current, s = selRef.current;
      const changedAdmin = prev?.me?.isAdmin !== next?.me?.isAdmin;
      if (changedAdmin && !next?.me?.isAdmin) {
        if (['settings', 'courtSettings', 'seat', 'swap'].includes(d?.kind)) d = null;
        if (s?.user) s = null;
      }
      const invites = incomingOf(next);
      let vis = visibleRef.current;
      if (!invites.some(invite => invite.id === vis)) vis = invites[0]?.id ?? null;

      // Keep the old object when the content is unchanged, so an identical poll does not re-render the board.
      commitS(JSON.stringify(prev) === JSON.stringify(next) ? prev : next);
      void syncPresence(next?.me);
      if (d?.court != null && !next?.courts?.[d.court]) d = null;
      s = next?.me ? validSelection(next, s) : null;
      setDialog(d);
      setSel(s);
      setVisibleInviteId(vis);
      setBooted(true);
    } catch (error) {
      if (request !== g.requestId) return;
      setBooted(true);
      toast(error.message);
    } finally {
      if (g.loadingRequest === request) g.loadingRequest = null;
    }
  }, [sb, api, guard, commitS, syncPresence, dialogRef, selRef, visibleRef, setDialog, setSel, setVisibleInviteId]);

  const act = useCallback(async (k, b, done) => {
    const g = guard;
    if (g.mutation || g.signingOut) return false;
    const current = {};
    g.mutation = current;
    try {
      await api(k, b);
      if (g.mutation !== current || g.signingOut) return false;
      setSel(null);
      await load(true);
      if (g.mutation !== current || g.signingOut) return false;
      if (done) toast(done);
      return true;
    } catch (error) {
      if (g.mutation === current && !g.signingOut) {
        toast(error.message);
        await load(true);
      }
      return false;
    } finally {
      if (g.mutation === current) g.mutation = null;
    }
  }, [guard, api, load, setSel]);

  const signOut = useCallback(async () => {
    const g = guard;
    if (g.signingOut) return;
    g.signingOut = true;
    void syncPresence(null);
    g.requestId++;
    g.mutation = null;
    try {
      const { error } = await sb.auth.signOut();
      if (error) toast(error.message);
    } catch (error) {
      toast(error.message);
    } finally {
      g.signingOut = false;
      await load(true);
    }
  }, [guard, sb, syncPresence, load]);

  // Runs after every commit of this component tree (App owns the state, so it re-renders on every change here).
  useLayoutEffect(() => {
    const p = pendingFocus.current;
    if (!p) return;
    pendingFocus.current = null;
    const el = typeof p.target === 'function' ? p.target() : document.querySelector(p.target);
    el?.focus(p.opts);
  });

  const focusAfterRender = useCallback((target, opts) => {
    pendingFocus.current = { target, opts };
  }, []);

  const closeDialog = useCallback(() => {
    const previous = dialogRef.current;
    setDialog(null);
    if (!previous) return;
    focusAfterRender(() => {
      const $ = q => document.querySelector(q);
      // Invite and admin settings open from the header menu, which closes on the way: return focus to its button.
      if (previous.kind === 'invite' || previous.kind === 'settings') return $('.top-actions summary');
      if (previous.kind === 'viewers') return $('[data-act="openViewers"]');
      if (previous.kind === 'courtSettings') return $(`[data-act="openCourtSettings"][data-court="${previous.court}"]`);
      if (previous.kind === 'queue') {
        const more = $(`[data-act="openQueue"][data-court="${previous.court}"]`);
        const court = $(`[data-act="pickCourt"][data-court="${previous.court}"]`);
        return more?.getClientRects().length ? more : court;
      }
      return null;
    }, { preventScroll: previous.kind === 'queue' });
  }, [dialogRef, setDialog, focusAfterRender]);

  // Fills in the players for one picker, but only if that same picker is still open.
  const loadPicker = useCallback(async picker => {
    const { token } = picker;
    let patch;
    try {
      const players = await api(picker.kind === 'invite' ? 'candidates' : 'players');
      patch = { players, status: 'ready' };
    } catch (error) {
      patch = { status: 'error', error: error.message };
    }
    setDialog(d => (d?.token === token ? { ...d, ...patch } : d));
  }, [api, setDialog]);

  const openPicker = useCallback(what => {
    const token = ++pickerSeq.current;
    const picker = { ...what, token, status: 'loading', query: '', players: [] };
    setDialog(picker);
    setSel(null);
    focusAfterRender('[data-input="pickerSearch"]');
    void loadPicker(picker);
  }, [setDialog, setSel, focusAfterRender, loadPicker]);

  const reloadPicker = useCallback(() => {
    const d = dialogRef.current;
    if (d && PICKERS.includes(d.kind)) void loadPicker(d);
  }, [dialogRef, loadPicker]);

  // Realtime, the slow poll, and the auth listener. Set up once; everything called here is stable.
  useEffect(() => {
    let t;
    const poke = () => { clearTimeout(t); t = setTimeout(() => load(false), 150); };
    const ch = sb.channel('queue');
    ['entries', 'entry_members', 'invites'].forEach(table => ch.on('postgres_changes', { event: '*', schema: 'public', table }, poke));
    ch.subscribe();
    const sub = sb.auth.onAuthStateChange(() => { setTimeout(() => load(true), 0); });
    const interval = setInterval(() => load(false), 6000);
    load(true);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
      sub?.data?.subscription?.unsubscribe?.();
      sb.removeChannel(ch);
    };
  }, [sb, load]);

  const incoming = useMemo(() => incomingOf(S), [S]);

  return {
    S, booted, viewers,
    adminOn: !!S?.me?.isAdmin,
    sel, setSel,
    dialog, setDialog,
    visibleInviteId, setVisibleInviteId,
    authMode, setAuthMode, authErr, setAuthErr, authMsg, setAuthMsg,
    api, act, load, signOut,
    sRef, dialogRef,
    holdRenders,
    openPicker, reloadPicker, closeDialog, focusAfterRender,
    incoming,
  };
}
