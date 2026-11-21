import { Fragment } from 'react';
import { useBoardCtx } from '../BoardContext.js';
import { nameOf } from '../logic.js';

/** One team or player in a court's line. Tapping it selects the entry (and closes the queue sheet it came from). */
export default function QueueRow({ row }) {
  const { S, sel, setSel, setDialog, dialogRef, adminOn, focusAfterRender } = useBoardCtx();
  const selected = sel?.kind === 'entry' && sel.id === row.id;

  const pickEntry = () => {
    const fromQueue = dialogRef.current?.kind === 'queue';
    if (fromQueue) setDialog(null);
    setSel(sel?.kind === 'entry' && sel.id === row.id ? null : { kind: 'entry', id: row.id });
    if (fromQueue) focusAfterRender('.bar button[data-act]', { preventScroll: true });
  };

  const names = adminOn
    ? row.members.map((id, i) => (
      <Fragment key={id}>
        {i > 0 && ' & '}
        <span className="mem" data-user={id}>{nameOf(S, id)}</span>
      </Fragment>
    ))
    : row.names;

  return (
    <button type="button" className={`row${selected ? ' sel' : ''}`} data-act="pickEntry" data-id={row.id} aria-pressed={String(selected)} onClick={pickEntry}>
      <span className="n">{row.n}</span><span>{names}</span>
    </button>
  );
}
