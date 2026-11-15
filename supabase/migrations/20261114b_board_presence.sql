-- Share live board presence with signed-in users on this private topic only.
create policy "signed-in users can see board presence"
on realtime.messages for select to authenticated
using (auth.uid() is not null and extension = 'presence' and realtime.topic() = 'court-board-viewers');

create policy "signed-in users can track board presence"
on realtime.messages for insert to authenticated
with check (auth.uid() is not null and extension = 'presence' and realtime.topic() = 'court-board-viewers');
