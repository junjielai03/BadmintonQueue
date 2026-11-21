import { useBoardCtx } from '../BoardContext.js';
import { nameOf } from '../logic.js';

/** The bottom action buttons for the current selection. Server actions go through act(); local ones change the selection. */
export default function ActionBar({ st }) {
  const { S, sel, setSel, openPicker, act } = useBoardCtx();
  if (!st) return null;

  const onClick = btn => {
    if (btn.action) {
      const { k, b } = btn.action;
      act(k, b, k === 'invite' ? `Invite sent to ${nameOf(S, b.userId)}` : undefined);
    } else if (btn.local === 'clear') {
      setSel(null);
    } else if (btn.local === 'pairStart') {
      if (sel?.user) setSel({ kind: 'pairWith', user: sel.user });
    } else if (btn.local === 'swapPick') {
      if (sel?.user) openPicker({ kind: 'swap', user: sel.user });
    }
  };

  return (
    <div className={`bar${st.buttons.length > 1 ? ' stack' : ''}`}>
      {st.buttons.map((btn, i) => {
        const dataAct = btn.action ? 'do' : btn.local ?? undefined;
        return (
          <button
            key={i}
            type="button"
            className={`cta${btn.secondary ? ' alt' : ''}`}
            data-act={dataAct}
            data-k={btn.action ? btn.action.k : undefined}
            data-b={btn.action ? JSON.stringify(btn.action.b) : undefined}
            aria-disabled={String(btn.disabled)}
            onClick={() => onClick(btn)}
          >
            {btn.label}
          </button>
        );
      })}
    </div>
  );
}
