import { useEffect, useRef } from 'react';
import { queueRows } from '../../logic.js';
import { useBoardCtx } from '../../BoardContext.js';
import QueueRow from '../QueueRow.jsx';

/** The full "Up next" line for one court. */
export default function QueueSheet() {
  const { S, adminOn, dialog, closeDialog } = useBoardCtx();
  const open = dialog?.kind === 'queue';
  const closeRef = useRef(null);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  if (!open) return null;

  const court = dialog.court;
  const rows = queueRows(S, court);
  return (
    <div className={`sheet-wrap queue-sheet-wrap${adminOn ? ' admin' : ''}`}>
      <button type="button" className="scrim" data-act="closeQueue" tabIndex={-1} aria-label="Close queue" onClick={closeDialog}></button>
      <section className="panel sheet queue-sheet" role="dialog" aria-modal="true" aria-labelledby="queue-title">
        <div className="sheet-head"><h2 id="queue-title">Court {court + 1} queue</h2>
          <button type="button" className="chip-btn" data-act="closeQueue" onClick={closeDialog} ref={closeRef}>Close</button></div>
        <div className="next queue-list" data-court={court} data-scroll="queue-dialog">
          {rows.length ? rows.map(row => <QueueRow key={row.id} row={row} />) : <p className="mute">No one is waiting.</p>}
        </div>
      </section>
    </div>
  );
}
