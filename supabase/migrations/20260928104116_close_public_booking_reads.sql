-- Stage 2: apply only AFTER the frontend using booking_slots is deployed.
do $$
declare admin_predicate text;
begin
  select qual into admin_predicate from pg_policies
    where schemaname='public' and tablename='services' and policyname='services_admin_delete';
  if admin_predicate is null or admin_predicate='true' then raise exception 'Missing restricted services admin policy'; end if;
  execute 'create policy bookings_admin_select on public.bookings for select to authenticated using (' || admin_predicate || ')';
end;
$$;
drop policy "Public Select" on public.bookings;
drop policy "Public Select Bookings" on public.bookings;
revoke select on public.bookings from anon;
notify pgrst, 'reload schema';
