-- Additive infrastructure. Existing frontend keeps working until release.
create table private.nails_service_quotas (
  scope text not null,
  subject text not null,
  window_start timestamptz not null,
  used integer not null check (used >= 0),
  primary key (scope, subject, window_start)
);
alter table private.nails_service_quotas enable row level security;
revoke all on private.nails_service_quotas from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.nails_service_quotas to service_role;
create index nails_service_quota_expiry on private.nails_service_quotas(window_start);

create function public.nails_consume_service_quota(p_scope text, p_subject text)
returns jsonb language plpgsql security invoker set search_path='' as $$
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
$$;
revoke all on function public.nails_consume_service_quota(text,text) from public, anon, authenticated;
grant execute on function public.nails_consume_service_quota(text,text) to service_role;

alter table public.bookings add column notification_receipt uuid;
create table private.nails_notification_outbox (
  booking_id text primary key references public.bookings(id) on delete cascade,
  receipt_hash text not null,
  status text not null default 'pending' check(status in ('pending','sending','sent','uncertain')),
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table private.nails_notification_outbox enable row level security;
revoke all on private.nails_notification_outbox from public, anon, authenticated;
grant select, update on private.nails_notification_outbox to service_role;

create function private.nails_enqueue_notification() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if current_setting('request.jwt.claims',true)::jsonb->>'role'='authenticated' and auth.uid() is null then
    raise sqlstate 'PT401' using message='Sessão inválida.';
  end if;
  -- Old clients have no receipt and continue using their existing notification path.
  if new.notification_receipt is not null then
    insert into private.nails_notification_outbox(booking_id,receipt_hash)
      values(new.id,encode(sha256(convert_to(new.notification_receipt::text,'UTF8')),'hex'));
  end if;
  return new;
end;
$$;
revoke all on function private.nails_enqueue_notification() from public,anon,authenticated;
create trigger nails_enqueue_notification after insert on public.bookings
for each row execute function private.nails_enqueue_notification();

create function public.nails_claim_notification(p_booking_id text,p_receipt uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
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
$$;
revoke all on function public.nails_claim_notification(text,uuid) from public,anon,authenticated;
grant execute on function public.nails_claim_notification(text,uuid) to service_role;

create function public.nails_finish_notification(p_booking_id text,p_sent boolean)
returns void language sql security invoker set search_path='' as $$
  update private.nails_notification_outbox
    set status=case when p_sent then 'sent' else 'uncertain' end,completed_at=clock_timestamp()
    where booking_id=p_booking_id and status='sending';
$$;
revoke all on function public.nails_finish_notification(text,boolean) from public,anon,authenticated;
grant execute on function public.nails_finish_notification(text,boolean) to service_role;
notify pgrst,'reload schema';
