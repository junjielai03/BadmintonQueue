create function admin_set_court_mode(p_court int, p_mode text) returns void
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform need_admin();
  perform lock_q();
  select courts_count into n from settings where id = 1;
  if p_court is null or p_court < 0 or p_court >= n then
    raise exception 'No such court.';
  end if;
  if p_mode is null or p_mode not in ('singles', 'doubles') then
    raise exception 'Choose singles or doubles.';
  end if;

  if p_mode = 'singles' then
    if side_count(p_court, 'a') > 1 or side_count(p_court, 'b') > 1 then
      raise exception 'Move extra players off this court before switching to singles.';
    end if;
    if exists (
      select 1 from entries e
      where e.court is null and e.queue_court = p_court and entry_size(e.id) > 1
    ) then
      raise exception 'Move waiting teams out of this court’s queue before switching to singles.';
    end if;
    update settings set singles_courts = array_append(singles_courts, p_court)
    where id = 1 and array_position(singles_courts, p_court) is null;
  else
    update settings set singles_courts = array_remove(singles_courts, p_court) where id = 1;
  end if;
end $$;

revoke execute on function admin_set_court_mode(int, text) from public, anon, authenticated;
grant execute on function admin_set_court_mode(int, text) to authenticated;
