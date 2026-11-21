import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useBoardCtx } from '../BoardContext.js';
import { dropAction, findEntry, nameOf, teamName } from '../logic.js';
import { toast } from '../toast.js';

// Admin drag and drop: pointer events, so it works with a mouse and (after a press and hold) on touch.
// All drag state lives in refs. The ghost and the drop-on / data-drop classes are DOM operations, so the
// board does not re-render under the pointer. New server state is held until the drop (holdRenders).
const HOLD_MS = 300;

export function useAdminDrag() {
  const ctx = useBoardCtx();
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const dragRef = useRef(null);      // {src, label, x, y, pointerId, touch, timer, active, ghost, over, me, admin}
  const swallowRef = useRef(false);  // true right after a drop, so the click that follows doesn't also select something
  const endRef = useRef(null);

  useEffect(() => {
    const serverState = () => ctxRef.current.sRef.current;
    const adminOn = () => !!serverState()?.me?.isAdmin;
    const queueOpen = () => ctxRef.current.dialogRef.current?.kind === 'queue';

    function dragSource(el) {
      const S = serverState();
      const mem = el.closest('.mem[data-user]');
      if (mem) return { src: { kind: 'player', user: mem.dataset.user }, label: nameOf(S, mem.dataset.user) };
      const team = el.closest('.tag.team[data-entry]');
      if (team) {
        const found = findEntry(S, e => e.id === team.dataset.entry);
        return found ? { src: { kind: 'entry', id: team.dataset.entry }, label: teamName(S, found.entry.members) } : null;
      }
      const tag = el.closest('.tag[data-user]:not(.preview)');
      if (tag) return { src: { kind: 'player', user: tag.dataset.user }, label: nameOf(S, tag.dataset.user) };
      const row = el.closest('.row[data-id]');
      if (row) {
        const found = findEntry(S, e => e.id === row.dataset.id);
        return found ? { src: { kind: 'entry', id: row.dataset.id }, label: teamName(S, found.entry.members) } : null;
      }
      return null;
    }

    /** What is under the pointer: the bin, a player, a queue row, a queue, or a court half. */
    function dropTarget(x, y) {
      const d = dragRef.current;
      for (const el of document.elementsFromPoint(x, y)) {
        if (el.closest('.bin')) return { el: el.closest('.bin'), t: { kind: 'bin' } };
        const team = el.closest('.tag.team[data-entry]');
        if (team && team.dataset.entry !== d?.src.id) return { el: team, t: { kind: 'team', id: team.dataset.entry } };
        const tag = el.closest('.tag[data-user]:not(.preview)');
        if (tag && tag.dataset.user !== d?.src.user) return { el: tag, t: { kind: 'player', user: tag.dataset.user } };
        const row = el.closest('.row[data-id]');
        if (row && row.dataset.id !== d?.src.id) return { el: row, t: { kind: 'row', court: +row.closest('.next').dataset.court, id: row.dataset.id } };
        const next = el.closest('.next[data-court]');
        if (next) return { el: next, t: { kind: 'queueEnd', court: +next.dataset.court } };
        const court = el.closest('.court[data-court]');
        if (court) {
          const art = court.querySelector('.art').getBoundingClientRect();
          return { el: court, t: { kind: 'side', court: +court.dataset.court, side: x < art.left + art.width / 2 ? 'a' : 'b' } };
        }
      }
      return null;
    }

    function moveDrag(x, y) {
      const d = dragRef.current;
      d.x = x; d.y = y;
      d.ghost.style.transform = `translate(${x}px, ${y}px)`;
      const over = dropTarget(x, y);
      if (d.over?.el !== over?.el || d.over?.t.side !== over?.t.side) {
        if (d.over) { d.over.el.classList.remove('drop-on'); delete d.over.el.dataset.drop; }
        if (over) { over.el.classList.add('drop-on'); if (over.t.kind === 'side') over.el.dataset.drop = over.t.side; }
      }
      d.over = over;
    }

    function startDrag(x, y) {
      const d = dragRef.current;
      if (!d || d.active) return;
      clearTimeout(d.timer);
      const px = x ?? d.x, py = y ?? d.y;
      const { sel, setSel, holdRenders } = ctxRef.current;
      // flushSync commits the selection change now, before the board classes are added below. Otherwise React's
      // re-render would overwrite the board's className and drop 'dragging'. It also runs before holdRenders.
      if (sel) flushSync(() => setSel(null));
      holdRenders(true);
      d.active = true;
      navigator.vibrate?.(30);
      d.ghost = Object.assign(document.createElement('div'), { className: 'drag-ghost', textContent: d.label });
      document.body.append(d.ghost);
      const board = document.querySelector('#app .board');
      board?.classList.add('dragging');
      if (board && queueOpen()) {
        board.inert = false;
        document.querySelector('#app .queue-sheet-wrap')?.classList.add('queue-dragging');
      }
      moveDrag(px, py);
    }

    function endDrag(drop = false) {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      clearTimeout(d.timer);
      if (!d.active) return;
      const { holdRenders, act } = ctxRef.current;
      d.ghost.remove();
      if (d.over) { d.over.el.classList.remove('drop-on'); delete d.over.el.dataset.drop; }
      const board = document.querySelector('#app .board');
      board?.classList.remove('dragging');
      if (board && queueOpen()) {
        board.inert = true;
        document.querySelector('#app .queue-sheet-wrap')?.classList.remove('queue-dragging');
      }
      swallowRef.current = true;
      setTimeout(() => { swallowRef.current = false; }, 400);
      holdRenders(false);
      if (!drop) return;
      const S = serverState();
      // The signed-in user or admin rights changed during the drag: drop nothing.
      if (!S?.me || S.me.id !== d.me || !!S.me.isAdmin !== d.admin) return;
      const a = dropAction(S, d.src, d.over?.t);
      if (a?.error) toast(a.error);
      else if (a) act(a.k, a.b, a.msg);
    }
    endRef.current = () => endDrag();

    const onPointerDown = e => {
      const dialog = ctxRef.current.dialogRef.current;
      if (!adminOn() || (dialog && dialog.kind !== 'queue') || dragRef.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const s = dragSource(e.target); if (!s) return;
      const touch = e.pointerType !== 'mouse';
      const d = {
        ...s, x: e.clientX, y: e.clientY, pointerId: e.pointerId, touch, active: false,
        timer: null, ghost: null, over: null,
        me: serverState().me.id, admin: !!serverState().me.isAdmin,
      };
      dragRef.current = d;
      if (touch) d.timer = setTimeout(() => startDrag(), HOLD_MS);
    };
    const onPointerMove = e => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      if (d.active) { moveDrag(e.clientX, e.clientY); return; }
      const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
      if (!d.touch && dist > 5) startDrag(e.clientX, e.clientY);
      else if (d.touch && dist > 10) endDrag();  // moved before the hold: let the page scroll
    };
    const onPointerUp = e => { const d = dragRef.current; if (d && e.pointerId === d.pointerId) endDrag(true); };
    const onPointerCancel = e => { const d = dragRef.current; if (d && e.pointerId === d.pointerId) endDrag(); };
    const onTouchMove = e => { if (dragRef.current?.active) e.preventDefault(); };  // no scrolling mid-drag
    const onContextMenu = e => { if (adminOn() && dragSource(e.target)) e.preventDefault(); };
    const onClick = e => {
      if (!swallowRef.current) return;
      swallowRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    };
    const onKeyDown = e => {
      if (e.key !== 'Escape' || !dragRef.current) return;
      endDrag();
      e.stopPropagation();  // App's Escape handler must not also close a dialog or clear the selection
    };

    const appEl = document.getElementById('app');
    appEl.addEventListener('pointerdown', onPointerDown);
    appEl.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKeyDown, true);

    return () => {
      endDrag();
      endRef.current = null;
      appEl.removeEventListener('pointerdown', onPointerDown);
      appEl.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
      document.removeEventListener('touchmove', onTouchMove, { passive: false });
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, []);

  // Sign-in or admin rights changed: end any drag without dropping it (main.js called endDrag() from load()).
  useEffect(() => {
    endRef.current?.();
  }, [ctx.S?.me?.id, ctx.adminOn]);
}
