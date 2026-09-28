-- Stage 1: compatible with the currently deployed BookingWizard.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.nails_booking_limits (
  id bigint generated always as identity primary key,
  ip inet not null,
  phone text not null,
  recorded_at timestamptz not null default clock_timestamp()
);
alter table private.nails_booking_limits enable row level security;
revoke all on private.nails_booking_limits from public, anon, authenticated;
create index nails_limits_ip_time on private.nails_booking_limits(ip, recorded_at);
create index nails_limits_phone_time on private.nails_booking_limits(phone, recorded_at);
create index nails_limits_time on private.nails_booking_limits(recorded_at);

create function private.nails_duration_minutes(value text) returns integer
language sql immutable set search_path = '' as $$
  select greatest(1, least(720, case
    when value ~ '^\d{1,2}:\d{2}$' then split_part(value, ':', 1)::integer * 60 + split_part(value, ':', 2)::integer
    else coalesce(substring(value from '\d+')::integer, 60) end));
$$;
revoke all on function private.nails_duration_minutes(text) from public, anon, authenticated;

-- This separate table contains no customer names, phone numbers, or prices.
create table public.booking_slots (
  booking_id text primary key references public.bookings(id) on delete cascade on update cascade,
  date text not null,
  time text not null,
  duration_minutes integer not null check (duration_minutes between 1 and 720)
);
alter table public.booking_slots enable row level security;
revoke all on public.booking_slots from public, anon, authenticated;
grant select(date, time, duration_minutes) on public.booking_slots to anon, authenticated;
create policy booking_slots_public_read on public.booking_slots for select to anon, authenticated using (true);
create index booking_slots_date on public.booking_slots(date);
insert into public.booking_slots (booking_id, date, time, duration_minutes)
select b.id, b.date, b.time, private.nails_duration_minutes(s.duration)
from public.bookings b left join public.services s on s.id = b.service_id;

create function private.nails_guard_booking() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  request_role text := current_setting('request.jwt.claims', true)::jsonb->>'role';
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  client_ip inet;
  phone_digits text;
  service public.services%rowtype;
  duration integer;
  start_minute integer;
  local_today date := (clock_timestamp() at time zone 'America/Sao_Paulo')::date;
begin
  -- Trigger-only entry point; no EXECUTE grant or exposed RPC.
  if request_role = 'authenticated' and auth.uid() is null then
    raise sqlstate 'PT401' using message = 'Sessão inválida.';
  end if;
  new.client_name := btrim(new.client_name);
  phone_digits := regexp_replace(coalesce(new.client_phone, ''), '[^0-9]', '', 'g');
  if length(phone_digits) in (12,13) and left(phone_digits,2)='55' then
    phone_digits := substring(phone_digits from 3);
  end if;
  if new.client_name is null or length(new.client_name) not between 2 and 120
     or length(phone_digits) not between 10 and 11 or length(new.client_phone)>30
     or new.id is null or length(new.id) not between 1 and 80 then
    raise sqlstate 'PT400' using message = 'Confira nome e telefone do agendamento.';
  end if;
  if new.date is null or new.date !~ '^\d{4}-\d{2}-\d{2}$'
     or new.time is null or new.time !~ '^(09|1[0-9]):00$' then
    raise sqlstate 'PT400' using message = 'Data ou horário inválido.';
  end if;
  begin
    if new.date::date <= local_today or new.date::date > local_today + 31 then
      raise sqlstate 'PT400' using message = 'Escolha uma data nos próximos 31 dias.';
    end if;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise sqlstate 'PT400' using message = 'Data inválida.';
  end;
  select * into service from public.services where id = new.service_id;
  if not found then
    raise sqlstate 'PT400' using message = 'Serviço indisponível. Atualize a página.';
  end if;
  new.service_name := service.name;
  new.price := service.price;
  new.created_at := clock_timestamp();
  duration := private.nails_duration_minutes(service.duration);
  start_minute := split_part(new.time, ':', 1)::integer * 60;

  -- Serialize the short insert transaction to avoid quota and booking races.
  perform pg_catalog.pg_advisory_xact_lock(731949, 1);
  if request_role in ('anon', 'authenticated') then
    -- Verified on the hosted gateway: spoofed X-Forwarded-For is appended,
    -- while CF-Connecting-IP is the gateway's observed IP. Never use XFF[0].
    begin
      client_ip := nullif(headers->>'cf-connecting-ip','')::inet;
    exception when invalid_text_representation then
      raise sqlstate 'PT400' using message = 'Origem da requisição inválida.';
    end;
    if client_ip is null then
      raise sqlstate 'PT400' using message = 'Não foi possível validar a origem da requisição.';
    end if;
    delete from private.nails_booking_limits where recorded_at < clock_timestamp() - interval '24 hours';
    if (select count(*) from private.nails_booking_limits where ip=client_ip and recorded_at > clock_timestamp()-interval '15 minutes') >= 5
       or (select count(*) from private.nails_booking_limits where phone=phone_digits and recorded_at > clock_timestamp()-interval '1 hour') >= 3 then
      raise sqlstate 'PT429' using message = 'Muitos agendamentos em pouco tempo. Aguarde e tente novamente.';
    end if;
    insert into private.nails_booking_limits(ip,phone) values(client_ip,phone_digits);
  end if;

  if exists (
    select 1 from public.booking_slots s where s.date=new.date
      and start_minute < split_part(s.time,':',1)::integer*60 + split_part(s.time,':',2)::integer + s.duration_minutes
      and start_minute + duration > split_part(s.time,':',1)::integer*60 + split_part(s.time,':',2)::integer
  ) then
    raise sqlstate 'PT409' using message = 'Este horário acabou de ser ocupado. Escolha outro horário.';
  end if;
  return new;
end;
$$;
revoke all on function private.nails_guard_booking() from public, anon, authenticated;
create trigger nails_guard_booking before insert on public.bookings
for each row execute function private.nails_guard_booking();

create function private.nails_sync_booking_slot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('request.jwt.claims', true)::jsonb->>'role' = 'authenticated' and auth.uid() is null then
    raise sqlstate 'PT401' using message = 'Sessão inválida.';
  end if;
  insert into public.booking_slots(booking_id,date,time,duration_minutes)
  values(new.id,new.date,new.time,private.nails_duration_minutes((select duration from public.services where id=new.service_id)))
  on conflict(booking_id) do update set date=excluded.date,time=excluded.time,duration_minutes=excluded.duration_minutes;
  return new;
end;
$$;
revoke all on function private.nails_sync_booking_slot() from public, anon, authenticated;
create trigger nails_sync_booking_slot after insert or update on public.bookings
for each row execute function private.nails_sync_booking_slot();

-- Inherit exactly the existing services administrator, rather than allowing any login.
do $$
declare admin_predicate text;
begin
  select qual into admin_predicate from pg_policies
    where schemaname='public' and tablename='services' and policyname='services_admin_delete';
  if admin_predicate is null or admin_predicate='true' then raise exception 'Missing restricted services admin policy'; end if;
  execute 'create policy bookings_admin_delete on public.bookings for delete to authenticated using (' || admin_predicate || ')';
end;
$$;
drop policy "Public Delete Bookings" on public.bookings;
revoke delete, update, truncate, references, trigger on public.bookings from anon;
revoke update, truncate, references, trigger on public.bookings from authenticated;
notify pgrst, 'reload schema';
