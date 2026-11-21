import { findEntry, nameOf, placeLabel } from '../../logic.js';
import { useBoardCtx } from '../../BoardContext.js';

/** Invite / seat / swap: a searchable player list, plus the invites still awaiting acceptance. */
export default function PickerSheet() {
  const { S, dialog, dialogRef, setDialog, act, closeDialog, reloadPicker } = useBoardCtx();
  const picker = dialog;
  if (!picker || !['invite', 'seat', 'swap'].includes(picker.kind)) return null;

  const invite = picker.kind === 'invite', swap = picker.kind === 'swap';
  const skip = swap ? new Set(findEntry(S, e => e.members.includes(picker.user))?.entry.members ?? [picker.user]) : new Set();
  const pending = new Set((S.invites ?? []).map(i => i.from === S.me.id ? i.to : i.from));
  const players = picker.players.filter(p => !skip.has(p.id) && (!invite || !pending.has(p.id)));
  const q = picker.query.trim().toLowerCase();
  const rows = players.map(p => {
    const key = (invite ? p.name : `${p.name} ${p.email}`).toLowerCase();
    return { p, key, match: key.includes(q) };
  });
  const hasMatches = rows.some(r => r.match);
  const name = swap ? nameOf(S, picker.user) : '';
  const title = invite ? 'Invite a teammate' : swap ? `Swap ${name} with…` : `Add to Court ${picker.court + 1}`;
  const help = invite ? 'Choose a player. You’ll team up when they accept.'
    : swap ? `They trade places, teammates included. Pick someone who isn't signed up and they take ${name}'s spot while ${name} leaves.`
      : `${picker.side === 'a' ? 'Left' : 'Right'} side. Players already on a court or in line move here; a teammate in line keeps their spot.`;

  // Same player again: the picker must still be the open one (tokens tell apart re-opened pickers).
  const stillOpen = token => dialogRef.current?.token === token;

  async function pickPlayer(userId) {
    const current = dialogRef.current;
    const player = current?.players?.find(p => p.id === userId);
    if (!player) return;
    let ok;
    if (current.kind === 'invite') ok = await act('invite', { userId }, `Invite sent to ${player.name}`);
    else if (current.kind === 'swap') ok = await act('swap', { a: current.user, b: userId }, `Swapped ${nameOf(S, current.user)} and ${player.name}`);
    else ok = await act('seat', { court: current.court, side: current.side, userId }, `Moved ${player.name} to Court ${current.court + 1}`);
    if (ok && stillOpen(current.token)) closeDialog();
  }

  async function cancelInvite(id) {
    const current = dialogRef.current;
    if (!current) return;
    if (await act('cancelInvite', { id }, 'Invite cancelled') && stillOpen(current.token)) reloadPicker();
  }

  const results = picker.status === 'loading' ? <p className="mute" role="status">Loading players…</p>
    : picker.status === 'error' ? <p className="err" role="alert">{picker.error}</p>
      : <>
        <ul className="picks" data-scroll="picks">
          {rows.map(({ p, key, match }) => (
            <li key={p.id} hidden={!match}>
              <button type="button" className="pick" data-act="pickPick" data-user={p.id} data-search={key} onClick={() => pickPlayer(p.id)}>
                <b>{p.name}</b><span className="mute">{invite ? 'Invite' : placeLabel(S, p.id)}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mute" data-empty-picks hidden={hasMatches}>{players.length ? 'No matching players.' : 'No available players.'}</p>
      </>;

  const sent = invite ? (S.invites ?? []).filter(i => i.from === S.me.id) : [];

  return (
    <div className="sheet-wrap">
      <button type="button" className="scrim" data-act="closePicker" aria-label="Close player list" onClick={closeDialog}></button>
      <section className="panel sheet" data-scroll="picker" role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <div className="sheet-head"><h2 id="picker-title">{title}</h2><button type="button" className="chip-btn" data-act="closePicker" onClick={closeDialog}>Close</button></div>
        <p className="mute">{help}</p>
        <input type="search" data-input="pickerSearch" value={picker.query} placeholder={invite ? 'Search by name' : 'Search by name or email'} aria-label="Search players"
          onChange={e => setDialog({ ...dialogRef.current, query: e.target.value })} />
        {results}
        {sent.length > 0 && (
          <div className="sent-invites"><h3>Awaiting acceptance</h3><ul>
            {sent.map(i => (
              <li key={i.id}><span>{nameOf(S, i.to)}</span>
                <button type="button" className="link" data-act="cancelInvite" data-id={i.id} aria-label={`Cancel invite to ${nameOf(S, i.to)}`} onClick={() => cancelInvite(i.id)}>Cancel</button></li>
            ))}
          </ul></div>
        )}
      </section>
    </div>
  );
}
