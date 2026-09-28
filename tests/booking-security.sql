-- Run inside a transaction; all synthetic rows and quota entries are rolled back.
do $$
declare
  svc public.services%rowtype;
  dates text[];
  d text;
  blocked boolean;
  n integer;
  saved_price numeric;
begin
  select * into strict svc from public.services order by private.nails_duration_minutes(duration) limit 1;
  select array_agg(day::text) into dates from (
    select ((clock_timestamp() at time zone 'America/Sao_Paulo')::date + i) as day
    from generate_series(1,31) i
    where not exists(select 1 from public.booking_slots where date=((clock_timestamp() at time zone 'America/Sao_Paulo')::date+i)::text)
    limit 6
  ) available;
  if array_length(dates,1)<6 then raise exception 'Need six empty dates for rollback-only test'; end if;
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  perform set_config('request.headers','{"cf-connecting-ip":"198.51.100.17"}',true);
  for n in 1..3 loop
    insert into public.bookings(id,service_id,service_name,price,date,time,client_name,client_phone)
    values('SECURITY_TEST_PHONE_'||n,svc.id,'tampered',0,dates[n],'09:00','Security Test','(11) 90000-0017');
  end loop;
  select price into saved_price from public.bookings where id='SECURITY_TEST_PHONE_1';
  if saved_price<>svc.price then raise exception 'Client changed canonical price'; end if;
  blocked:=false;
  begin
    insert into public.bookings(id,service_id,service_name,price,date,time,client_name,client_phone)
    values('SECURITY_TEST_PHONE_4',svc.id,svc.name,svc.price,dates[4],'09:00','Security Test','5511900000017');
  exception when sqlstate 'PT429' then blocked:=true; end;
  if not blocked then raise exception 'Phone quota did not block fourth insert'; end if;
  delete from public.bookings where id like 'SECURITY_TEST_PHONE_%';
  delete from private.nails_booking_limits where ip='198.51.100.17';
  for n in 1..5 loop
    insert into public.bookings(id,service_id,service_name,price,date,time,client_name,client_phone)
    values('SECURITY_TEST_IP_'||n,svc.id,svc.name,svc.price,dates[n],'09:00','Security Test','1190000002'||n);
  end loop;
  blocked:=false;
  begin
    insert into public.bookings(id,service_id,service_name,price,date,time,client_name,client_phone)
    values('SECURITY_TEST_IP_6',svc.id,svc.name,svc.price,dates[6],'09:00','Security Test','11900000026');
  exception when sqlstate 'PT429' then blocked:=true; end;
  if not blocked then raise exception 'IP quota did not block sixth insert'; end if;
  perform set_config('request.headers','{"cf-connecting-ip":"198.51.100.18"}',true);
  blocked:=false;
  begin
    insert into public.bookings(id,service_id,service_name,price,date,time,client_name,client_phone)
    values('SECURITY_TEST_CONFLICT',svc.id,svc.name,svc.price,dates[1],'09:00','Security Test','11900000027');
  exception when sqlstate 'PT409' then blocked:=true; end;
  if not blocked then raise exception 'Duplicate booking was accepted'; end if;
  perform set_config('request.headers','{}',true);
  blocked:=false;
  begin
    insert into public.bookings(id,service_id,service_name,price,date,time,client_name,client_phone)
    values('SECURITY_TEST_NO_IP',svc.id,svc.name,svc.price,dates[6],'09:00','Security Test','11900000028');
  exception when sqlstate 'PT400' then blocked:=true; end;
  if not blocked then raise exception 'Missing gateway identity was accepted'; end if;
  if has_table_privilege('anon','public.bookings','DELETE') then raise exception 'Public delete grant still present'; end if;
  if has_column_privilege('anon','public.booking_slots','booking_id','SELECT') then raise exception 'Public booking ID grant present'; end if;
  if not has_column_privilege('anon','public.booking_slots','date','SELECT') then raise exception 'Public availability unavailable'; end if;
end;
$$;
select 'PASS: phone/IP quotas, phone normalization, canonical price, conflict, gateway identity and grants' as result;
set local role anon;
do $$ begin
  perform date,time,duration_minutes from public.booking_slots limit 1;
  begin
    perform booking_id from public.booking_slots limit 1;
    raise exception 'Anonymous booking ID read unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.bookings where id='SECURITY_TEST_IP_1';
    raise exception 'Anonymous delete unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000001"}',true);
set local role authenticated;
do $$ declare n integer; begin
  delete from public.bookings where id='SECURITY_TEST_IP_1';
  get diagnostics n = row_count;
  if n<>0 then raise exception 'Non-admin deleted a booking'; end if;
end $$;
reset role;
select set_config('request.jwt.claims', json_build_object('role','authenticated','sub',substring(qual from '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'))::text, true)
from pg_policies where schemaname='public' and tablename='services' and policyname='services_admin_delete';
set local role authenticated;
do $$ declare n integer; begin
  delete from public.bookings where id='SECURITY_TEST_IP_1';
  get diagnostics n = row_count;
  if n<>1 then raise exception 'Existing admin could not delete a booking'; end if;
end $$;
reset role;
select 'PASS: quotas, input validation, conflicts, anonymous access and administrator deletion' as result;
