// ---- data layer: every change is a Postgres function in the Supabase project ----
export const RPC = {
  state: ['get_state', () => ({})],
  join: ['join_queue', b => ({ p_court: b.court })],
  joinCourt: ['join_court', b => ({ p_court: b.court, p_side: b.side })],
  leave: ['leave_queue', () => ({})],
  leaveTeam: ['leave_ready_team', () => ({})],
  switchCourt: ['switch_court', b => ({ p_court: b.court, p_side: b.side ?? null })],
  moveQueue: ['move_queue', b => ({ p_court: b.court })],
  invite: ['invite_player', b => ({ p_user: b.userId })],
  candidates: ['invite_candidates', () => ({})],
  respond: ['respond_invite', b => ({ p_id: b.id, p_accept: b.accept })],
  cancelInvite: ['cancel_invite', b => ({ p_id: b.id })],
  win: ['report_win', b => ({ p_court: b.court, p_side: b.side })],
  // admin
  place: ['admin_place', b => ({ p_court: b.court, p_side: b.side, p_entry: b.entryId ?? null, p_user: b.userId ?? null })],
  queue: ['admin_queue', b => ({ p_queue_court: b.court, p_before: b.before ?? null, p_entry: b.entryId ?? null, p_user: b.userId ?? null })],
  swap: ['admin_swap', b => ({ p_a: b.a, p_b: b.b })],
  kick: ['admin_kick', b => ({ p_user: b.userId })],
  removePair: ['admin_remove_pair', b => ({ p_entry: b.entryId })],
  pair: ['admin_pair', b => ({ p_user: b.userId, p_target: b.targetId })],
  split: ['admin_split', b => ({ p_user: b.userId })],
  seat: ['admin_seat', b => ({ p_court: b.court, p_side: b.side, p_user: b.userId })],
  swapEntries: ['admin_swap_entries', b => ({ p_a: b.a, p_b: b.b })],
  players: ['admin_players', () => ({})],
  reset: ['admin_reset', b => ({ p_confirm: b.confirm })],
  allow: ['admin_allow', b => ({ p_email: b.email, p_add: b.add })],
  loser: ['admin_set_loser_back', b => ({ p_loser_back: b.loserBack })],
  courtMode: ['admin_set_court_mode', b => ({ p_court: b.court, p_mode: b.mode })],
};

export const makeApi = sb => async (k, b = {}) => {
  const [fn, m] = RPC[k];
  const { data, error } = await sb.rpc(fn, m(b));
  if (error) throw new Error(error.message);
  return data;
};
