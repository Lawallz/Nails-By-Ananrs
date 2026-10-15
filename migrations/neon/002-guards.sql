CREATE OR REPLACE FUNCTION public.nails_claim_notification(p_booking_id text, p_receipt uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare claimed text;
begin
  update private.nails_notification_outbox set status='sending',claimed_at=clock_timestamp()
  where booking_id=p_booking_id and status='pending'
    and created_at>clock_timestamp()-interval '1 day'
    and receipt_hash=encode(sha256(convert_to(p_receipt::text,'UTF8')),'hex')
  returning booking_id into claimed;
  if claimed is null then return null; end if;
  return (select jsonb_build_object('booking_id',id,'client_name',client_name,
    'client_phone',client_phone,'service_name',service_name,'booking_date',date,'booking_time',time)
    from public.bookings where id=claimed);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.nails_consume_service_quota(p_scope text, p_subject text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  window_seconds integer;
  quota integer;
  bucket timestamptz;
  request_count integer;
begin
  case p_scope
    when 'ai_ip' then window_seconds:=3600; quota:=10;
    when 'ai_global' then window_seconds:=86400; quota:=100;
    when 'notify_ip' then window_seconds:=3600; quota:=30;
    else raise exception 'Unsupported quota scope';
  end case;
  if p_subject is null or length(p_subject) not between 1 and 128 then raise exception 'Invalid quota subject'; end if;
  if p_scope='ai_global' then p_subject:='global'; end if;
  bucket:=to_timestamp(floor(extract(epoch from clock_timestamp())/window_seconds)*window_seconds);
  delete from private.nails_service_quotas where window_start < clock_timestamp()-interval '2 days';
  insert into private.nails_service_quotas(scope,subject,window_start,used)
    values(p_scope,p_subject,bucket,1)
    on conflict(scope,subject,window_start) do update
      set used=private.nails_service_quotas.used+1
      where private.nails_service_quotas.used < quota
    returning used into request_count;
  return jsonb_build_object('allowed',request_count is not null,
    'retry_after',greatest(1,ceil(extract(epoch from bucket+make_interval(secs=>window_seconds)-clock_timestamp()))::integer));
end;
$function$
;

CREATE OR REPLACE FUNCTION private.nails_duration_minutes(value text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
select greatest(1, least(720, case
 when value ~ '^\d{1,2}:\d{2}$' then split_part(value, ':', 1)::integer * 60 + split_part(value, ':', 2)::integer
 when value ~* '\d+\s*h' then (regexp_match(value, '(\d+)\s*h', 'i'))[1]::integer * 60
   + coalesce((regexp_match(value, '(\d+)\s*min', 'i'))[1]::integer, (regexp_match(value, 'h\s*(\d+)', 'i'))[1]::integer, 0)
 else coalesce(substring(value from '\d+')::integer, 60) end));
$function$
;

CREATE OR REPLACE FUNCTION private.nails_enqueue_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if current_setting('request.jwt.claims',true)::jsonb->>'role'='authenticated' and nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub' is null then
    raise sqlstate 'PT401' using message='Sessão inválida.';
  end if;
  -- Old clients have no receipt and continue using their existing notification path.
  if new.notification_receipt is not null then
    insert into private.nails_notification_outbox(booking_id,receipt_hash)
      values(new.id,encode(sha256(convert_to(new.notification_receipt::text,'UTF8')),'hex'));
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.nails_finish_notification(p_booking_id text, p_sent boolean)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  update private.nails_notification_outbox
    set status=case when p_sent then 'sent' else 'uncertain' end,completed_at=clock_timestamp()
    where booking_id=p_booking_id and status='sending';
$function$
;

CREATE OR REPLACE FUNCTION private.nails_guard_block()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if NOT private.is_admin() then
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
$function$
;

CREATE OR REPLACE FUNCTION private.nails_guard_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  request_role text := nullif(current_setting('request.jwt.claims', true),'')::jsonb->>'role';
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  client_ip inet;
  phone_digits text;
  service public.services%rowtype;
  duration integer;
  start_minute integer;
  is_admin boolean := coalesce(private.is_admin(), false);
  local_today date := (clock_timestamp() at time zone 'America/Sao_Paulo')::date;
begin
  -- Trigger-only entry point; RLS is enforced on the outer mutation.
  if TG_OP = 'UPDATE' and not is_admin then
    raise sqlstate 'PT403' using message = 'Somente a administradora pode editar agendamentos.';
  end if;
  if TG_OP = 'UPDATE' and new.id is distinct from old.id then
    raise sqlstate 'PT400' using message = 'O identificador não pode ser alterado.';
  end if;
  if request_role = 'authenticated' and nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub' is null then
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
$function$
;

CREATE OR REPLACE FUNCTION private.nails_guard_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare b public.bookings%rowtype; available numeric;
begin
  if NOT private.is_admin() then
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
$function$
;

CREATE OR REPLACE FUNCTION private.nails_sync_booking_slot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION private.nails_sync_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.bookings set paid_amount=paid_amount + case when new.kind='refund' then -new.amount else new.amount end where id=new.booking_id;
  return new;
end;
$function$
;

CREATE TRIGGER nails_sync_booking_slot AFTER INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION private.nails_sync_booking_slot();

CREATE TRIGGER nails_enqueue_notification AFTER INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION private.nails_enqueue_notification();

CREATE TRIGGER nails_guard_booking BEFORE INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION private.nails_guard_booking();

CREATE TRIGGER nails_guard_block BEFORE INSERT ON public.schedule_blocks FOR EACH ROW EXECUTE FUNCTION private.nails_guard_block();

CREATE TRIGGER nails_guard_payment BEFORE INSERT ON public.booking_payments FOR EACH ROW EXECUTE FUNCTION private.nails_guard_payment();

CREATE TRIGGER nails_sync_payment AFTER INSERT ON public.booking_payments FOR EACH ROW EXECUTE FUNCTION private.nails_sync_payment();

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;

REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;

ALTER TABLE public."services" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."booking_slots" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."ai_color_catalog" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."schedule_blocks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."bookings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."booking_payments" ENABLE ROW LEVEL SECURITY;

CREATE INDEX bookings_date_time_idx ON public.bookings(date,time);

CREATE INDEX bookings_phone_idx ON public.bookings(client_phone_key);

CREATE INDEX booking_limits_ip_time_idx ON private.nails_booking_limits(ip,recorded_at);

CREATE INDEX booking_limits_phone_time_idx ON private.nails_booking_limits(phone,recorded_at);
