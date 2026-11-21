import { useEffect, useLayoutEffect, useRef } from 'react';
import { useBoardCtx } from '../BoardContext.js';
import { useAdminDrag } from '../hooks/useAdminDrag.js';
import { adminButtons, buttonState, capOf, findEntry, myPlace, nameOf, pairAction, queueRows, resolveSide } from '../logic.js';
import { toast } from '../toast.js';
import ActionBar from './ActionBar.jsx';
import CourtBlock from './CourtBlock.jsx';
import InviteBanner from './InviteBanner.jsx';
import SettingsSheet from './sheets/SettingsSheet.jsx';
import CourtSettingsSheet from './sheets/CourtSettingsSheet.jsx';
import PickerSheet from './sheets/PickerSheet.jsx';
import QueueSheet from './sheets/QueueSheet.jsx';
import ViewersSheet from './sheets/ViewersSheet.jsx';

const INVITE_OFF = 'Invites are available when off court, unpaired, and outside a singles queue';
// What a tap on the dimmed scrim may act on: the court, queue row, or header control underneath it.
const UNDER_SCRIM = '[data-act="pickCourt"],[data-act="pickEntry"],[data-act="openQueue"],[data-act="openCourtSettings"],[data-act="settings"],[data-act="openViewers"]';

/** The element under the pointer that a scrim tap should act on, or null. */
function underScrim(e) {
  return document.elementsFromPoint(e.clientX, e.clientY).map(el => el.closest(UNDER_SCRIM)).find(Boolean) || null;
}

/** Which half of the court was tapped: a "+" spot's own side, else the half under the pointer (null for keyboard). */
function tappedSide(e, courtButton) {
  const spot = e.target.closest('.open');
  if (spot) return spot.dataset.side;
  if (!e.detail) return null;
  const art = courtButton.querySelector('.art')?.getBoundingClientRect();
  if (!art) return null;
  return e.clientX < art.left + art.width / 2 ? 'a' : 'b';
}

export default function Board() {
  const ctx = useBoardCtx();
  const { S, sel, setSel, dialog, setDialog, adminOn, viewers, openPicker, signOut, act, focusAfterRender, sRef, dialogRef } = ctx;
  // Read by the native click listener below, which is registered once.
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const selRef = useRef(sel);
  selRef.current = sel;
  const menuRef = useRef(null);  // the header <details> menu; its open state stays in the DOM
  const closeMenu = () => { if (menuRef.current) menuRef.current.open = false; };
  useAdminDrag();

  // A click anywhere outside the header menu closes it.
  useEffect(() => {
    const onClick = e => {
      const menu = menuRef.current;
      if (menu?.open && !e.target.closest?.('.top-actions')) menu.open = false;
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Admin taps run before everything else, in capture phase on the document, before React handlers see the click.
  useEffect(() => {
    const adminTap = (e, c) => {
      const state = c.sRef.current, sl = selRef.current;
      if (e.target.closest('.bar, .top')) return false;
      const open = e.target.closest('.open[data-side]');
      if (open && sl?.kind !== 'pairWith') {
        c.openPicker({ kind: 'seat', court: +open.closest('.court').dataset.court, side: open.dataset.side });
        return true;
      }
      let user = e.target.closest('.tag[data-user]:not(.preview), .mem[data-user], .tm[data-user]')?.dataset.user;
      if (!user && sl?.kind === 'pairWith') {  // a tap on a single's row also counts as that player
        const row = e.target.closest('.row[data-id]'), found = row && findEntry(state, x => x.id === row.dataset.id);
        if (found?.entry.members.length === 1) user = found.entry.members[0];
      }
      if (!user) return false;
      if (sl?.kind === 'pairWith') {
        const a = pairAction(state, sl.user, user);
        if (a?.error) toast(a.error);
        else if (a) c.act(a.k, a.b, a.msg);
        return true;
      }
      if (c.dialogRef.current?.kind === 'queue') c.setDialog(null);
      c.setSel(sl?.kind === 'player' && sl.user === user ? null : { kind: 'player', user });
      return true;
    };
    const onClick = e => {
      const c = ctxRef.current;
      if (!document.getElementById('app')?.contains(e.target)) return;
      const state = c.sRef.current, d = c.dialogRef.current;
      if (!(state?.me?.isAdmin && (!d || d.kind === 'queue'))) return;
      if (adminTap(e, c)) { e.stopPropagation(); e.preventDefault(); }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Marks every copy of the selected player (on court, in line, in the sheets) with .picked, after each render.
  useLayoutEffect(() => {
    document.querySelectorAll('#app .picked').forEach(el => el.classList.remove('picked'));
    if (sel?.user) document.querySelectorAll(`#app [data-user="${CSS.escape(sel.user)}"]`).forEach(el => el.classList.add('picked'));
  });

  const adm = adminOn;
  const picking = adm && (sel?.kind === 'player' || sel?.kind === 'pairWith');
  const st = picking ? adminButtons(S, sel) : buttonState(S, sel);
  const dim = !!sel && !picking;

  const place = myPlace(S);
  const canInvite = !S.readyTeammate && (!place || (place.where === 'queue' && place.entry.members.length === 1 && capOf(S, place.court) === 2));
  const placedPartner = place?.entry.members.find(id => id !== S.me.id);
  const teammateName = S.readyTeammate?.name ?? (placedPartner ? nameOf(S, placedPartner) : null);
  const hasSent = !!S.invites?.some(i => i.from === S.me.id);
  const inviteOk = canInvite || hasSent;

  const openSettings = () => {
    closeMenu();
    setDialog({ kind: 'settings', resetWord: null });
    setSel(null);
    focusAfterRender('[data-act="closeSettings"]:not(.scrim)');
  };
  const openViewers = () => {
    setDialog({ kind: 'viewers' });
    setSel(null);
    focusAfterRender('.sheet [data-act="closeViewers"]');
  };
  const leaveTeam = () => act('leaveTeam', {}, 'You left the team');

  // A tap on the dimmed scrim runs the action of whatever is under the pointer, else clears the selection.
  const onScrim = e => {
    const el = underScrim(e);
    if (!el) { setSel(null); return; }
    const d = el.dataset;
    const S_ = sRef.current;
    switch (d.act) {
      case 'pickCourt': {
        const c = +d.court;
        setSel({ kind: 'court', court: c, side: resolveSide(S_, c, tappedSide(e, el)) });
        break;
      }
      case 'pickEntry': {
        const fromQueue = dialogRef.current?.kind === 'queue';
        if (fromQueue) setDialog(null);
        setSel(sel?.kind === 'entry' && sel.id === d.id ? null : { kind: 'entry', id: d.id });
        if (fromQueue) focusAfterRender('.bar button[data-act]', { preventScroll: true });
        break;
      }
      case 'openQueue': {
        const c = +d.court;
        if (queueRows(S_, c).length < 2) break;
        setDialog({ kind: 'queue', court: c });
        if (sel?.kind !== 'pairWith') setSel(null);
        focusAfterRender('.queue-sheet button[data-act="closeQueue"]');
        break;
      }
      case 'openCourtSettings':
        setDialog({ kind: 'courtSettings', court: +d.court });
        setSel(null);
        focusAfterRender('[data-court-mode]');
        break;
      case 'settings': openSettings(); break;
      case 'openViewers': openViewers(); break;
      default: break;
    }
  };

  return (
    <>
      <div className={`board${dim ? ' has-sel' : ''}${adm ? ' admin' : ''}${sel?.kind === 'pairWith' ? ' pairing' : ''}`} inert={dialog ? true : undefined}>
        <InviteBanner />
        <header className={`top${teammateName !== null ? ' has-teammate' : ''}`}>
          <div className="board-brand">
            <div className="brand"><span>Slugminton</span></div>
            <button type="button" className={`viewer-count${viewers === null ? '' : ' connected'}`} data-act="openViewers" aria-haspopup="dialog" onClick={openViewers}>
              <span className="viewer-dot" aria-hidden="true"></span><span data-viewer-count="">{viewers === null ? 'Online' : `${viewers.length} Online`}</span>
            </button>
          </div>
          {teammateName !== null && (
            <div className="teammate">
              <span>Teammate: <strong>{teammateName}</strong></span>
              {!!S.readyTeammate && <button type="button" className="link" data-act="leaveTeam" onClick={leaveTeam}>Leave team</button>}
            </div>
          )}
          <details className="top-actions" ref={menuRef}>
            <summary aria-label="Menu"><span className="hamburger" aria-hidden="true"></span></summary>
            <div className="top-actions-list">
              <button type="button" data-act="openInvite" aria-haspopup="dialog" disabled={!inviteOk} title={inviteOk ? undefined : INVITE_OFF} onClick={() => { closeMenu(); openPicker({ kind: 'invite' }); }}>Invite</button>
              {adm && <button type="button" data-act="settings" aria-haspopup="dialog" onClick={openSettings}>Admin settings</button>}
              <button type="button" data-act="out" onClick={() => { closeMenu(); signOut(); }}>Sign out</button>
            </div>
          </details>
        </header>
        <div className="courts">
          {S.courts.map((court, c) => <CourtBlock key={c} court={court} c={c} preview={st?.preview} />)}
        </div>
        {dim && <button type="button" className="scrim" data-act="clear" aria-label="Close selection" onClick={onScrim}></button>}
        <ActionBar st={st} />
        {adm && <div className="bin" aria-hidden="true">Drop here to remove</div>}
      </div>
      <SettingsSheet />
      <CourtSettingsSheet />
      <PickerSheet />
      <QueueSheet />
      <ViewersSheet />
    </>
  );
}
