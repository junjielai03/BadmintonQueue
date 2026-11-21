import { useBoardCtx } from '../BoardContext.js';
import { capOf, courtLayout, courtSlots, isLive, nameOf, queueRows, resolveSide } from '../logic.js';
import { courtArt } from '../pixel.js';
import QueueRow from './QueueRow.jsx';
import RawHtml from './RawHtml.jsx';

const COG = '⚙︎';

function courtLabel(S, c, slots) {
  const team = ids => ids.filter(Boolean).map(id => nameOf(S, id)).join(' and ') || 'open';
  const mode = capOf(S, c) === 1 ? ' singles' : '';
  return `Court ${c + 1}${mode}: ${team(slots.a)} versus ${team(slots.b)}.`;
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

export default function CourtBlock({ court, c, preview }) {
  const { S, sel, setSel, setDialog, adminOn, focusAfterRender, sRef } = useBoardCtx();
  const slots = courtSlots(S, c, preview);
  const picked = sel?.kind === 'court' && sel.court === c;
  const rows = queueRows(S, c);
  const single = capOf(S, c) === 1;

  const pickCourt = e => {
    const state = sRef.current;
    setSel({ kind: 'court', court: c, side: resolveSide(state, c, tappedSide(e, e.currentTarget)) });
  };
  const openQueue = () => {
    if (queueRows(sRef.current, c).length < 2) return;
    setDialog({ kind: 'queue', court: c });
    if (sel?.kind !== 'pairWith') setSel(null);
    focusAfterRender('.queue-sheet button[data-act="closeQueue"]');
  };
  const openCourtSettings = () => {
    setDialog({ kind: 'courtSettings', court: c });
    setSel(null);
    focusAfterRender('[data-court-mode]');
  };

  const more = rows.length > 1 && (
    <button type="button" className="queue-more" data-act="openQueue" data-court={c} aria-haspopup="dialog" aria-label={`See ${rows.length - 1} more in Court ${c + 1} queue`} onClick={openQueue}>
      See {rows.length - 1} more <span aria-hidden="true">›</span>
    </button>
  );
  const queue = rows.length ? (
    <div className="next" data-court={c}>
      <div className="next-head"><span>Up next</span><span className="queue-count" aria-label={`${rows.length} queue entries`}>{rows.length}</span></div>
      <div className="queue-preview">
        <div className="queue" data-scroll={c} aria-label={`Court ${c + 1} queue`}>
          {rows.map(row => <QueueRow key={row.id} row={row} />)}
        </div>
        {more}
      </div>
    </div>
  ) : adminOn ? <div className="next empty-queue" data-court={c}>Drop into queue</div> : null;

  return (
    <section className="court-col">
      <div className="court-card">
        <button type="button" className={`court${picked ? ' sel' : ''}`} data-act="pickCourt" data-court={c} aria-pressed={String(picked)} aria-label={courtLabel(S, c, slots)} onClick={pickCourt}>
          <span className="court-head">
            <span className="title">Court {c + 1}{single && <> <small>Singles</small></>}<span className="hint">Tap to join or queue</span></span>
          </span>
          <RawHtml html={courtArt(courtLayout(S, c, preview), id => nameOf(S, id), isLive(court), S.me.id)} as="span" style={{ display: 'contents' }} />
        </button>
        {adminOn && (
          <button type="button" className="cog court-cog" data-act="openCourtSettings" data-court={c} aria-label={`Court ${c + 1} settings`} aria-haspopup="dialog" onClick={openCourtSettings}>
            <span aria-hidden="true">{COG}</span>
          </button>
        )}
      </div>
      {queue}
    </section>
  );
}
