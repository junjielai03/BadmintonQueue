import { useEffect, useRef } from 'react';
import { capOf } from '../../logic.js';
import { useBoardCtx } from '../../BoardContext.js';

/** Admin settings for one court: singles or doubles. */
export default function CourtSettingsSheet() {
  const { S, adminOn, dialog, dialogRef, act, closeDialog, focusAfterRender } = useBoardCtx();
  const open = adminOn && dialog?.kind === 'courtSettings';
  const selectRef = useRef(null);
  useEffect(() => { if (open) selectRef.current?.focus(); }, [open]);
  if (!open) return null;

  const c = dialog.court;
  const singles = capOf(S, c) === 1;

  async function changeMode(e) {
    const mode = e.target.value;
    await act('courtMode', { court: c, mode }, `Court ${c + 1} switched to ${mode}`);
    const current = dialogRef.current;
    if (current?.kind === 'courtSettings' && current.court === c) {
      focusAfterRender(`[data-court-mode="${c}"]`, { preventScroll: true });
    }
  }

  return (
    <div className="sheet-wrap"><button type="button" className="scrim" data-act="closeSettings" tabIndex={-1} aria-label="Close court settings" onClick={closeDialog}></button>
      <section className="panel sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="sheet-head"><h2 id="settings-title">Court {c + 1} settings</h2>
          <button type="button" className="chip-btn" data-act="closeSettings" onClick={closeDialog}>Done</button></div>
        <label className="court-mode"><span>Mode</span>
          <select data-court-mode={c} aria-label={`Court ${c + 1} mode`} value={singles ? 'singles' : 'doubles'} onChange={changeMode} ref={selectRef}>
            <option value="doubles">Doubles</option>
            <option value="singles">Singles</option>
          </select></label>
      </section>
    </div>
  );
}
