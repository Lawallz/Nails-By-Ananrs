-- Admin calendar, editing and public availability blocks.
alter table public.services add column if not exists description text not null default '';
create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  date text not null check (date ~ '^\d{4}-\d{2}-\d{2}$'),
  start_time text not null check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  end_time text not null check (end_time ~ '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$'),
  check (start_time < end_time)
);
alter table public.schedule_blocks enable row level security;
revoke all on public.schedule_blocks from public, anon, authenticated;
grant select(date,start_time,end_time) on public.schedule_blocks to anon;
grant select, insert, delete on public.schedule_blocks to authenticated;
create index schedule_blocks_date on public.schedule_blocks(date);
create policy schedule_blocks_read on public.schedule_blocks for select to anon, authenticated using (true);
create policy schedule_blocks_admin_insert on public.schedule_blocks for insert to authenticated
with check ((select auth.uid()) = '62eeb246-e764-44d5-b976-e596d8cb6be9'::uuid);
create policy schedule_blocks_admin_delete on public.schedule_blocks for delete to authenticated
using ((select auth.uid()) = '62eeb246-e764-44d5-b976-e596d8cb6be9'::uuid);
grant update(service_id, service_name, price, date, time, client_name, client_phone) on public.bookings to authenticated;
create policy bookings_admin_update on public.bookings for update to authenticated
using ((select auth.uid()) = '62eeb246-e764-44d5-b976-e596d8cb6be9'::uuid)
with check ((select auth.uid()) = '62eeb246-e764-44d5-b976-e596d8cb6be9'::uuid);

create or replace function private.nails_duration_minutes(value text) returns integer
language sql immutable set search_path = '' as $$
select greatest(1, least(720, case
 when value ~ '^\d{1,2}:\d{2}$' then split_part(value, ':', 1)::integer * 60 + split_part(value, ':', 2)::integer
 when value ~* '\d+\s*h' then (regexp_match(value, '(\d+)\s*h', 'i'))[1]::integer * 60
   + coalesce((regexp_match(value, '(\d+)\s*min', 'i'))[1]::integer, (regexp_match(value, 'h\s*(\d+)', 'i'))[1]::integer, 0)
 else coalesce(substring(value from '\d+')::integer, 60) end));
$$;
revoke all on function private.nails_duration_minutes(text) from public, anon, authenticated;
create or replace function private.nails_guard_booking() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  request_role text := current_setting('request.jwt.claims', true)::jsonb->>'role';
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  client_ip inet;
  phone_digits text;
  service public.services%rowtype;
  duration integer;
  start_minute integer;
  is_admin boolean := coalesce(auth.uid() = '62eeb246-e764-44d5-b976-e596d8cb6be9'::uuid, false);
  local_today date := (clock_timestamp() at time zone 'America/Sao_Paulo')::date;
begin
  -- Trigger-only entry point; RLS is enforced on the outer mutation.
  if TG_OP = 'UPDATE' and not is_admin then
    raise sqlstate 'PT403' using message = 'Somente a administradora pode editar agendamentos.';
  end if;
  if TG_OP = 'UPDATE' and new.id is distinct from old.id then
    raise sqlstate 'PT400' using message = 'O identificador não pode ser alterado.';
  end if;
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
    if (not is_admin and (new.date::date <= local_today or new.date::date > local_today + 31)) or (is_admin and new.date::date < local_today) then
      raise sqlstate 'PT400' using message = 'Escolha uma data nos próximos 31 dias.';
    end if;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise sqlstate 'PT400' using message = 'Data inválida.';
  end;
  if extract(dow from new.date::date) = 0 then
    raise sqlstate 'PT400' using message = 'Domingo é folga. Escolha de segunda a sábado.';
  end if;
  select * into service from public.services where id = new.service_id;
  if not found then
    raise sqlstate 'PT400' using message = 'Serviço indisponível. Atualize a página.';
  end if;
  new.service_name := service.name;
  new.price := service.price;
  if TG_OP = 'INSERT' then
    new.created_at := clock_timestamp();
  else
    new.created_at := old.created_at;
    if new.service_id = old.service_id then
      new.service_name := old.service_name; new.price := old.price;
    end if;
  end if;
  duration := private.nails_duration_minutes(service.duration);
  start_minute := split_part(new.time, ':', 1)::integer * 60;

  -- Serialize the short insert transaction to avoid quota and booking races.
  perform pg_catalog.pg_advisory_xact_lock(731949, 1);
  if TG_OP = 'INSERT' and (request_role = 'anon' or (request_role = 'authenticated' and not is_admin)) then
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
    select 1 from public.booking_slots s where s.date=new.date and s.booking_id <> new.id
      and start_minute < split_part(s.time,':',1)::integer*60 + split_part(s.time,':',2)::integer + s.duration_minutes
      and start_minute + duration > split_part(s.time,':',1)::integer*60 + split_part(s.time,':',2)::integer
  ) then
    raise sqlstate 'PT409' using message = 'Este horário acabou de ser ocupado. Escolha outro horário.';
  end if;
  if exists (select 1 from public.schedule_blocks b where b.date = new.date
    and start_minute < extract(epoch from b.end_time::time)/60
    and start_minute + duration > extract(epoch from b.start_time::time)/60) then
    raise sqlstate 'PT409' using message = 'Este período está bloqueado na agenda. Escolha outro horário.';
  end if;
  return new;
end;
$$;
revoke all on function private.nails_guard_booking() from public, anon, authenticated;
drop trigger nails_guard_booking on public.bookings;
create trigger nails_guard_booking before insert or update on public.bookings
for each row execute function private.nails_guard_booking();


create function private.nails_guard_block() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is distinct from '62eeb246-e764-44d5-b976-e596d8cb6be9'::uuid then
    raise sqlstate 'PT403' using message = 'Somente a administradora pode bloquear a agenda.';
  end if;
  if new.date::date < (clock_timestamp() at time zone 'America/Sao_Paulo')::date then
    raise sqlstate 'PT400' using message = 'Escolha uma data atual ou futura.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(731949, 1);
  if exists (select 1 from public.booking_slots s where s.date = new.date
    and extract(epoch from new.start_time::time)/60 < extract(epoch from s.time::time)/60 + s.duration_minutes
    and new.end_time::time > s.time::time) then
    raise sqlstate 'PT409' using message = 'Há cliente agendada neste período. Reagende antes de bloquear.';
  end if;
  if exists (select 1 from public.schedule_blocks b where b.date = new.date
    and new.start_time < b.end_time and new.end_time > b.start_time) then
    raise sqlstate 'PT409' using message = 'Já existe um bloqueio neste período.';
  end if;
  return new;
end;
$$;
revoke all on function private.nails_guard_block() from public, anon, authenticated;
create trigger nails_guard_block before insert on public.schedule_blocks
for each row execute function private.nails_guard_block();
notify pgrst, 'reload schema';
