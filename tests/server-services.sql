-- Execute within BEGIN / ROLLBACK. No emails or AI requests are sent.
set local role service_role;
do $$ declare r jsonb; i integer; begin
  for i in 1..10 loop
    r:=public.nails_consume_service_quota('ai_ip','rollback-test');
    if not (r->>'allowed')::boolean then raise exception 'Quota denied too early'; end if;
  end loop;
  r:=public.nails_consume_service_quota('ai_ip','rollback-test');
  if (r->>'allowed')::boolean then raise exception 'Quota failed'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform public.nails_consume_service_quota('ai_ip','bypass');
    raise exception 'Anonymous quota RPC allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.nails_claim_notification('test','00000000-0000-4000-8000-000000000001');
    raise exception 'Anonymous notification claim allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare svc public.services%rowtype; available text; begin
  select * into svc from public.services limit 1;
  select ((clock_timestamp() at time zone 'America/Sao_Paulo')::date+i)::text into available
  from generate_series(1,31) i where not exists(select 1 from public.booking_slots where date=((clock_timestamp() at time zone 'America/Sao_Paulo')::date+i)::text) limit 1;
  if available is null then raise exception 'No empty date for rollback test'; end if;
  insert into public.bookings(id,service_id,service_name,price,date,time,client_name,client_phone,notification_receipt)
  values('ROLLBACK_NOTIFICATION_TEST',svc.id,svc.name,svc.price,available,'09:00','Synthetic Test','11900009999','00000000-0000-4000-8000-000000000001');
end $$;
set local role service_role;
do $$ declare r jsonb; begin
  r:=public.nails_claim_notification('ROLLBACK_NOTIFICATION_TEST','00000000-0000-4000-8000-000000000002');
  if r is not null then raise exception 'Wrong receipt was accepted'; end if;
  r:=public.nails_claim_notification('ROLLBACK_NOTIFICATION_TEST','00000000-0000-4000-8000-000000000001');
  if r->>'client_name' is distinct from 'Synthetic Test' then raise exception 'Canonical notification unavailable'; end if;
  r:=public.nails_claim_notification('ROLLBACK_NOTIFICATION_TEST','00000000-0000-4000-8000-000000000001');
  if r is not null then raise exception 'Duplicate claim accepted'; end if;
  perform public.nails_finish_notification('ROLLBACK_NOTIFICATION_TEST',false);
  if not exists(select 1 from private.nails_notification_outbox where booking_id='ROLLBACK_NOTIFICATION_TEST' and status='uncertain') then raise exception 'Uncertain delivery status missing'; end if;
end $$;
reset role;
select 'PASS: service quotas, private RPC permissions, receipt verification and duplicate prevention' as result;
