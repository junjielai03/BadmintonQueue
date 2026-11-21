import { useEffect, useRef } from 'react';
import { useBoardCtx } from '../../BoardContext.js';

function viewerList(viewers) {
  if (viewers === null) return <p className="mute">Checking who’s online…</p>;
  if (!viewers.length) return <p className="mute">No one is online.</p>;
  return <ul className="viewer-names">{viewers.map((name, i) => <li key={i}>{name}</li>)}</ul>;
}

/** Who else is looking at the courts right now. */
export default function ViewersSheet() {
  const { viewers, dialog, closeDialog } = useBoardCtx();
  const open = dialog?.kind === 'viewers';
  const closeRef = useRef(null);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  if (!open) return null;

  return (
    <div className="sheet-wrap">
      <button type="button" className="scrim" data-act="closeViewers" tabIndex={-1} aria-label="Close Online" onClick={closeDialog}></button>
      <section className="panel sheet" role="dialog" aria-modal="true" aria-labelledby="viewers-title" data-scroll="viewers">
        <div className="sheet-head"><h2 id="viewers-title">Online</h2>
          <button type="button" className="chip-btn" data-act="closeViewers" onClick={closeDialog} ref={closeRef}>Close</button></div>
        <div data-viewer-list>{viewerList(viewers)}</div>
      </section>
    </div>
  );
}
