import { useBoardCtx } from '../BoardContext.js';
import { nameOf } from '../logic.js';

/** Pending teammate invitations for the signed-in player, cycled with arrows when there are several. */
export default function InviteBanner() {
  const { S, incoming, visibleInviteId, setVisibleInviteId, act, focusAfterRender } = useBoardCtx();
  const invites = incoming;
  if (!invites.length) return null;

  const index = Math.max(0, invites.findIndex(invite => invite.id === visibleInviteId));
  const invite = invites[index];
  const multiple = invites.length > 1;

  const cycle = (offset, action) => {
    if (invites.length < 2) return;
    setVisibleInviteId(invites[(index + offset + invites.length) % invites.length].id);
    focusAfterRender(`[data-act="${action}"]`, { preventScroll: true });
  };

  return (
    <section className={`invite-banner${multiple ? ' multiple' : ''}`} aria-label="Pending teammate invitations">
      {multiple && (
        <button type="button" className="invite-arrow" data-act="prevInvite" aria-label="Previous invite" onClick={() => cycle(-1, 'prevInvite')}>‹</button>
      )}
      <p aria-live="polite">
        <strong>{nameOf(S, invite.from)}</strong> invited you to team up.{' '}
        {multiple && <span className="invite-count">{index + 1} of {invites.length}</span>}
      </p>
      <div className="invite-actions">
        <button type="button" className="chip-btn invite-primary" data-act="acceptInvite" data-id={invite.id} onClick={() => act('respond', { id: invite.id, accept: true }, 'You’re teammates')}>Accept</button>
        <button type="button" className="chip-btn" data-act="declineInvite" data-id={invite.id} onClick={() => act('respond', { id: invite.id, accept: false }, 'Invite declined')}>Decline</button>
      </div>
      {multiple && (
        <button type="button" className="invite-arrow" data-act="nextInvite" aria-label="Next invite" onClick={() => cycle(1, 'nextInvite')}>›</button>
      )}
    </section>
  );
}
