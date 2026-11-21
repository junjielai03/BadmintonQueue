import { useEffect, useRef, useState } from 'react';
import { useBoardCtx } from '../../BoardContext.js';

/** Admin settings: losers rejoin the queue, admins, and the practice reset. */
export default function SettingsSheet() {
  const { S, adminOn, dialog, dialogRef, setDialog, act, closeDialog, focusAfterRender } = useBoardCtx();
  const open = adminOn && dialog?.kind === 'settings';
  const doneRef = useRef(null);
  // Bumped when a losers change fails, so the checkbox snaps back to the server value.
  const [resync, setResync] = useState(0);
  useEffect(() => { if (open) doneRef.current?.focus(); }, [open]);
  if (!open) return null;

  const admins = S.admins?.list ?? [];
  const n = S.queue.concat(...S.courts.flatMap(c => [c.a, c.b])).reduce((sum, e) => sum + e.members.length, 0);
  const resetWord = dialog.resetWord;

  async function setLoserBack(e) {
    const loserBack = e.target.checked;
    const ok = await act('loser', { loserBack }, loserBack ? 'Losers now rejoin the queue' : 'Losers now leave the court');
    if (!ok) setResync(v => v + 1);
  }

  function removeAdmin(email) {
    const self = email === S.me.email?.toLowerCase();
    if (window.confirm(self ? 'Remove your own admin access? You will lose the admin tools.' : `Remove ${email} as an admin?`)) {
      act('allow', { email, add: false }, 'Admin removed');
    }
  }

  async function addAdmin(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get('email')).trim();
    if (await act('allow', { email, add: true }, 'Admin added')) form.reset();
  }

  async function resetDo() {
    if (dialogRef.current?.resetWord?.trim() !== 'CLEAR') return;
    if (await act('reset', { confirm: 'CLEAR' }, 'All courts and queues are cleared') && dialogRef.current?.kind === 'settings') closeDialog();
  }

  return (
    <div className="sheet-wrap"><button type="button" className="scrim" data-act="closeSettings" aria-label="Close settings" onClick={closeDialog}></button>
      <section className="panel sheet" data-scroll="settings" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="sheet-head"><h2 id="settings-title">Settings</h2><button type="button" className="chip-btn" data-act="closeSettings" onClick={closeDialog} ref={doneRef}>Done</button></div>
        <label className="switch"><input type="checkbox" data-act="loser" defaultChecked={!!S.loserBack} key={`${!!S.loserBack}-${resync}`} onChange={setLoserBack} /><b>Losers rejoin the queue</b></label>
        <div className="admins"><h3>Admins</h3>
          <ul>{admins.map(m => (
            <li key={m}><span>{m}</span><button type="button" className="link" data-act="rmAdmin" data-email={m} aria-label={`Remove ${m} as admin`} onClick={() => removeAdmin(m)}>Remove</button></li>
          ))}</ul>
          <form data-form="allow" className="add" onSubmit={addAdmin}>
            <input type="email" name="email" placeholder="name@ucsc.edu" required aria-label="New admin email" />
            <button className="cta">Add</button>
          </form></div>
        {resetWord === null ? (
          <div className="danger"><h3>Practice reset</h3><p className="mute">Take everyone off every court and out of every queue.</p>
            <button type="button" className="chip-btn warn" data-act="resetStart" onClick={() => {
              setDialog({ ...dialogRef.current, resetWord: '' });
              focusAfterRender('[data-input="resetWord"]');
            }}>Clear all courts and queues…</button></div>
        ) : (
          <div className="danger confirm" role="alert"><h3>Clear everything?</h3>
            <p>This removes all {n} {n === 1 ? 'player' : 'players'} from every court and queue. It can't be undone.</p>
            <label>Type <b>CLEAR</b> to confirm<input type="text" data-input="resetWord" value={resetWord} autoComplete="off" autoCapitalize="characters" spellCheck={false}
              onChange={e => setDialog({ ...dialogRef.current, resetWord: e.target.value })} /></label>
            <div className="row-btns"><button type="button" className="chip-btn" data-act="resetCancel" onClick={() => setDialog({ ...dialogRef.current, resetWord: null })}>Cancel</button>
              <button type="button" className="chip-btn warn" data-act="resetDo" aria-disabled={String(resetWord.trim() !== 'CLEAR')} onClick={resetDo}>Clear all courts and queues</button></div></div>
        )}
      </section>
    </div>
  );
}
