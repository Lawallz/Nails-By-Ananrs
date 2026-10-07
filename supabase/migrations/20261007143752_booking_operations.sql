-- Preserve the existing appointment history; never infer completion or payment.
alter table public.bookings
  add column status text not null default 'scheduled' check (status in ('scheduled','confirmed','completed','cancelled','no_show')),
  add column cancellation_reason text not null default '' check (length(cancellation_reason) <= 1000),
  add column client_notes text not null default '' check (length(client_notes) <= 3000),
  add column paid_amount numeric(10,2) not null default 0 check (paid_amount >= 0),
  add column client_phone_key text generated always as (
    case when length(regexp_replace(client_phone,'[^0-9]','','g')) in (12,13)
      and left(regexp_replace(client_phone,'[^0-9]','','g'),2)='55'
    then substring(regexp_replace(client_phone,'[^0-9]','','g') from 3)
    else regexp_replace(client_phone,'[^0-9]','','g') end
  ) stored;
create index bookings_client_history on public.bookings(client_phone_key,date desc);
grant update(status,cancellation_reason,client_notes) on public.bookings to authenticated;
-- Cancellation replaces deletion for regular admin use.
revoke delete on public.bookings from authenticated;
drop policy if exists bookings_admin_delete on public.bookings;

create table public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null references public.bookings(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  kind text not null check (kind in ('deposit','payment','refund')),
  method text not null check (method in ('pix','cash','debit','credit','transfer','other')),
  paid_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  note text not null default '' check (length(note) <= 500),
  created_at timestamptz not null default now()
);
alter table public.booking_payments enable row level security;
revoke all on public.booking_payments from public, anon, authenticated;
grant select, insert on public.booking_payments to authenticated;
create policy booking_payments_admin_read on public.booking_payments for select to authenticated
using ((select auth.uid()) = '62eeb246-e764-44d5-b976-e596d8cb6be9'::uuid);
create policy booking_payments_admin_insert on public.booking_payments for insert to authenticated
with check ((select auth.uid()) = '62eeb246-e764-44d5-b976-e596d8cb6be9'::uuid);
create index booking_payments_booking on public.booking_payments(booking_id);
create index booking_payments_paid_on on public.booking_payments(paid_on);
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
  if TG_OP = 'INSERT' then
    if new.status <> 'scheduled' or new.paid_amount <> 0 or new.client_notes <> '' or new.cancellation_reason <> '' then
      raise sqlstate 'PT403' using message = 'Campos administrativos não permitidos na criação.';
    end if;
  else
    new.created_at := old.created_at;
    if new.status = 'cancelled' and length(btrim(new.cancellation_reason)) = 0 then
      raise sqlstate 'PT400' using message = 'Informe o motivo do cancelamento.';
    end if;
    if new.status in ('completed','no_show') and new.date::date > local_today then
      raise sqlstate 'PT400' using message = 'Não é possível concluir ou registrar falta em uma data futura.';
    end if;
    if old.status in ('completed','cancelled','no_show') and
       (new.service_id,new.date,new.time) is distinct from (old.service_id,old.date,old.time) then
      raise sqlstate 'PT400' using message = 'Preserve este atendimento no histórico. Use Nova manutenção.';
    end if;
    if (new.service_id,new.date,new.time) is not distinct from (old.service_id,old.date,old.time)
      and not (old.status in ('cancelled','no_show') and new.status not in ('cancelled','no_show')) then
      -- Status, notes, client corrections and ledger sync must work for past appointments too.
      new.service_name := old.service_name; new.price := old.price;
      if new.client_name is null or length(btrim(new.client_name)) not between 2 and 120
        or length(regexp_replace(coalesce(new.client_phone,''),'[^0-9]','','g')) not between 10 and 13 then
        raise sqlstate 'PT400' using message = 'Confira nome e telefone.';
      end if;
      if new.status in ('cancelled','no_show') then
        perform pg_catalog.pg_advisory_xact_lock(731949, 1);
      end if;
      return new;
    end if;
    if new.status in ('completed','cancelled','no_show') then
      raise sqlstate 'PT400' using message = 'Altere o status separadamente antes de reagendar.';
    end if;
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
  if new.price < new.paid_amount then
    raise sqlstate 'PT400' using message = 'O novo valor é menor que o recebido. Registre o estorno necessário antes de trocar o serviço.';
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

create or replace function private.nails_sync_booking_slot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and (new.service_id,new.date,new.time,new.status) is not distinct from (old.service_id,old.date,old.time,old.status) then
    return new;
  end if;
  if new.status in ('cancelled','no_show') then
    delete from public.booking_slots where booking_id=new.id;
    return new;
  end if;
  if TG_OP = 'UPDATE' and (new.service_id,new.date,new.time) is not distinct from (old.service_id,old.date,old.time)
     and old.status not in ('cancelled','no_show') then return new; end if;
  insert into public.booking_slots(booking_id,date,time,duration_minutes)
  values(new.id,new.date,new.time,private.nails_duration_minutes((select duration from public.services where id=new.service_id)))
  on conflict(booking_id) do update set date=excluded.date,time=excluded.time,duration_minutes=excluded.duration_minutes;
  return new;
end;
$$;
revoke all on function private.nails_sync_booking_slot() from public, anon, authenticated;

create function private.nails_guard_payment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare b public.bookings%rowtype; available numeric;
begin
  if auth.uid() is distinct from '62eeb246-e764-44d5-b976-e596d8cb6be9'::uuid then
    raise sqlstate 'PT403' using message = 'Somente a administradora pode registrar pagamentos.';
  end if;
  select * into b from public.bookings where id=new.booking_id for update;
  if not found then raise sqlstate 'PT404' using message = 'Agendamento não encontrado.'; end if;
  if new.paid_on > (clock_timestamp() at time zone 'America/Sao_Paulo')::date then
    raise sqlstate 'PT400' using message = 'Informe a data em que o valor foi recebido ou estornado.';
  end if;
  if new.kind='refund' then
    if exists(select 1 from public.booking_payments where booking_id=new.booking_id and paid_on>new.paid_on) then
      raise sqlstate 'PT400' using message = 'O estorno deve ser registrado na data do último lançamento ou depois dela.';
    end if;
    select coalesce(sum(case when kind='refund' then -amount else amount end),0) into available
    from public.booking_payments where booking_id=new.booking_id and paid_on<=new.paid_on;
    if new.amount > least(b.paid_amount,available) then
      raise sqlstate 'PT400' using message = 'O estorno não pode superar o valor recebido até essa data.';
    end if;
    if length(btrim(new.note))=0 then raise sqlstate 'PT400' using message = 'Informe o motivo do estorno.'; end if;
  else
    if b.status in ('cancelled','no_show') then
      raise sqlstate 'PT400' using message = 'Este atendimento está encerrado. Apenas estornos podem ser registrados.';
    end if;
    if b.paid_amount + new.amount > b.price then
      raise sqlstate 'PT400' using message = 'O recebimento supera o saldo pendente.';
    end if;
  end if;
  new.created_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function private.nails_guard_payment() from public, anon, authenticated;
create trigger nails_guard_payment before insert on public.booking_payments
for each row execute function private.nails_guard_payment();

create function private.nails_sync_payment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.bookings set paid_amount=paid_amount + case when new.kind='refund' then -new.amount else new.amount end where id=new.booking_id;
  return new;
end;
$$;
revoke all on function private.nails_sync_payment() from public, anon, authenticated;
create trigger nails_sync_payment after insert on public.booking_payments
for each row execute function private.nails_sync_payment();
notify pgrst, 'reload schema';
