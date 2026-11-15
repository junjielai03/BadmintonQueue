export function createBoardPresence(client, onViewers) {
  let active = null;
  let closing = Promise.resolve();
  let viewerId = null;

  return async viewer => {
    const id = viewer?.id ?? null;
    if (id === viewerId) return;
    viewerId = id;
    if (active) {
      closing = client.removeChannel(active).catch(() => {});
      active = null;
    }
    onViewers(null);
    if (!viewer) return;

    // Supabase reuses channels with the same topic until removal finishes.
    await closing;
    if (viewerId !== id || active) return;
    const channel = client.channel('court-board-viewers', { config: { private: true } });
    active = channel;
    channel.on('presence', { event: 'sync' }, () => {
      if (active !== channel) return;
      const names = new Map();
      for (const { id, name } of Object.values(channel.presenceState()).flat()) {
        if (typeof id === 'string' && typeof name === 'string' && name.trim()) {
          names.set(id, name.trim().slice(0, 80));
        }
      }
      onViewers([...names.values()].sort((a, b) => a.localeCompare(b)));
    }).subscribe(async status => {
      if (active !== channel) return;
      if (status === 'SUBSCRIBED') {
        try {
          const result = await channel.track({ id, name: viewer.name });
          if (active === channel && result !== 'ok') onViewers(null);
        } catch {
          if (active === channel) onViewers(null);
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        onViewers(null);
      }
    });
  };
}
