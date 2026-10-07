-- Integration checks: all fixtures are rolled back, including on assertion failures.
begin;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"62eeb246-e764-44d5-b976-e596d8cb6be9"}', true);
set local role authenticated;
insert into public.services(id,name,price,duration,image,description)
values ('__agenda_test_service','Teste de agenda',100,'90 min','','Teste temporário');
insert into public.services(id,name,price,duration,image)
values ('__agenda_test_service2','Outro serviço',150,'120 min','');
do $$
declare
  d text;
  d2 text;
  sunday text;
  count_rows integer;
begin
  select day::date::text into d from generate_series(current_date+1, current_date+30, interval '1 day') day
  where extract(dow from day) <> 0 and not exists (select 1 from public.booking_slots s where s.date=day::date::text)
  and not exists (select 1 from public.schedule_blocks b where b.date=day::date::text) limit 1;
  if d is null then raise exception 'No empty fixture day available'; end if;
  select day::date::text into d2 from generate_series(current_date+400, current_date+410, interval '1 day') day
  where extract(dow from day) <> 0 and not exists (select 1 from public.booking_slots s where s.date=day::date::text) limit 1;
  select day::date::text into sunday from generate_series(current_date+1, current_date+7, interval '1 day') day where extract(dow from day)=0;
  insert into public.bookings(id,service_id,date,time,client_name,client_phone)
  values('__agenda_test_booking','__agenda_test_service',d,'09:00','Cliente Teste','11999999999');
  update public.bookings set client_name='Cliente Editada' where id='__agenda_test_booking';
  if not exists(select 1 from public.bookings where id='__agenda_test_booking' and client_name='Cliente Editada') then raise exception 'Edit failed'; end if;
  begin
    insert into public.schedule_blocks(date,start_time,end_time) values(d,'10:00','11:00');
    raise exception 'Block over booking was accepted';
  exception when sqlstate 'PT409' then null; end;
  insert into public.schedule_blocks(date,start_time,end_time) values(d,'12:00','13:00');
  begin
    update public.bookings set time='11:00' where id='__agenda_test_booking';
    raise exception 'Service overlapping block was accepted';
  exception when sqlstate 'PT409' then null; end;
  begin
    update public.bookings set date=sunday where id='__agenda_test_booking';
    raise exception 'Sunday accepted';
  exception when sqlstate 'PT400' then null; end;
  insert into public.bookings(id,service_id,date,time,client_name,client_phone)
  values('__agenda_test_booking2','__agenda_test_service',d,'15:00','Cliente Teste','11999999999');
  begin
    update public.bookings set time='14:00' where id='__agenda_test_booking';
    raise exception 'Overlapping edit accepted';
  exception when sqlstate 'PT409' then null; end;
  update public.bookings set date=d2,time='10:00',service_id='__agenda_test_service2' where id='__agenda_test_booking';
  if not exists(select 1 from public.bookings where id='__agenda_test_booking' and price=150 and service_name='Outro serviço') then raise exception 'Service snapshot failed'; end if;
  if not exists(select 1 from public.booking_slots where date=d2 and time='10:00' and duration_minutes=120) then raise exception 'Availability did not move'; end if;
  if exists(select 1 from public.booking_slots where date=d and time='09:00') then raise exception 'Old slot not released'; end if;
  insert into public.schedule_blocks(date,start_time,end_time) values(d,'00:00','09:00');
  insert into public.schedule_blocks(date,start_time,end_time) values(d,'17:00','24:00');
  begin
    update public.bookings set date=d,time='19:00' where id='__agenda_test_booking';
    raise exception 'Evening block accepted';
  exception when sqlstate 'PT409' then null; end;
  delete from public.schedule_blocks where date=d;
  update public.bookings set date=d,time='09:00' where id='__agenda_test_booking';
  update public.bookings set status='cancelled', cancellation_reason='Teste de liberação' where id in ('__agenda_test_booking','__agenda_test_booking2');
  insert into public.schedule_blocks(date,start_time,end_time) values(d,'00:00','24:00');
  perform set_config('agenda.test_day',d,true);
end $$;
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.headers', '{"cf-connecting-ip":"192.0.2.219"}', true);
set local role anon;
do $$
begin
  perform date,start_time,end_time from public.schedule_blocks;
  begin
    insert into public.bookings(id,service_id,date,time,client_name,client_phone)
    values('__agenda_test_public','__agenda_test_service',current_setting('agenda.test_day'),'09:00','Cliente Teste','11999999999');
    raise exception 'Public booking in full-day block accepted';
  exception when sqlstate 'PT409' then null; end;
  begin
    update public.bookings set client_name='Unauthorized' where id='__agenda_test_booking';
    raise exception 'Anonymous update granted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.schedule_blocks(date,start_time,end_time) values(current_setting('agenda.test_day'),'09:00','10:00');
    raise exception 'Anonymous block granted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}', true);
set local role authenticated;
do $$
declare n integer;
begin
  update public.bookings set client_name='Unauthorized' where id='__agenda_test_booking';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Non-admin update accepted'; end if;
  begin
    insert into public.schedule_blocks(date,start_time,end_time) values(current_setting('agenda.test_day'),'09:00','10:00');
    raise exception 'Non-admin block accepted';
  exception when sqlstate 'PT403' or insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: editing, service changes, slot synchronization, overlap checks, Sundays, full/partial blocks, public access and admin permissions' as result;
