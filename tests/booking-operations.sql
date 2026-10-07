begin;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"62eeb246-e764-44d5-b976-e596d8cb6be9"}',true);
set local role authenticated;
insert into public.services(id,name,price,duration,image) values('__ops_service','Teste temporário',100,'30 min','');
do $$
declare d text; amount numeric;
begin
 select day::date::text into d from generate_series(current_date+1,current_date+30,interval '1 day') day
 where extract(dow from day)<>0 and not exists(select 1 from public.booking_slots s where s.date=day::date::text)
 and not exists(select 1 from public.schedule_blocks b where b.date=day::date::text) limit 1;
 if d is null then raise exception 'No available fixture date'; end if;
 perform set_config('ops.day',d,true);
 insert into public.bookings(id,service_id,date,time,client_name,client_phone) values('__ops_booking','__ops_service',d,'09:00','Cliente Teste','+55 (11) 99999-9999');
 if not exists(select 1 from public.bookings where id='__ops_booking' and client_phone_key='11999999999' and status='scheduled') then raise exception 'Phone/status defaults'; end if;
 update public.bookings set status='confirmed',client_notes='Preferência de teste' where id='__ops_booking';
 if not exists(select 1 from public.booking_slots where date=d and time='09:00') then raise exception 'Confirmation lost slot'; end if;
 begin
   update public.bookings set status='completed' where id='__ops_booking';
   raise exception 'Future completion accepted';
 exception when sqlstate 'PT400' then null; end;
 begin
   update public.bookings set status='cancelled' where id='__ops_booking';
   raise exception 'Missing cancellation reason accepted';
 exception when sqlstate 'PT400' then null; end;
 insert into public.booking_payments(booking_id,amount,kind,method,paid_on) values('__ops_booking',30,'deposit','pix',current_date);
 insert into public.booking_payments(booking_id,amount,kind,method,paid_on) values('__ops_booking',70,'payment','credit',current_date);
 select paid_amount into amount from public.bookings where id='__ops_booking';
 if amount<>100 then raise exception 'Ledger total incorrect'; end if;
 begin
   insert into public.booking_payments(booking_id,amount,kind,method) values('__ops_booking',1,'payment','pix');
   raise exception 'Overpayment accepted';
 exception when sqlstate 'PT400' then null; end;
 begin
   update public.bookings set paid_amount=999 where id='__ops_booking';
   raise exception 'Direct amount update allowed';
 exception when insufficient_privilege then null; end;
 update public.bookings set status='cancelled',cancellation_reason='Teste' where id='__ops_booking';
 if exists(select 1 from public.booking_slots where date=d and time='09:00') then raise exception 'Cancellation did not release slot'; end if;
 if not exists(select 1 from public.bookings where id='__ops_booking' and paid_amount=100 and client_notes='Preferência de teste') then raise exception 'Cancellation destroyed history'; end if;
 begin
   delete from public.bookings where id='__ops_booking';
   raise exception 'Admin deletion allowed';
 exception when insufficient_privilege then null; end;
 begin
   insert into public.booking_payments(booking_id,amount,kind,method,note) values('__ops_booking',101,'refund','pix','Teste');
   raise exception 'Excess refund accepted';
 exception when sqlstate 'PT400' then null; end;
 insert into public.booking_payments(booking_id,amount,kind,method,note) values('__ops_booking',100,'refund','pix','Devolução teste');
 select paid_amount into amount from public.bookings where id='__ops_booking';
 if amount<>0 then raise exception 'Refund total incorrect'; end if;
 if exists(select 1 from public.booking_slots where date=d and time='09:00') then raise exception 'Refund recreated cancelled slot'; end if;
 insert into public.bookings(id,service_id,date,time,client_name,client_phone) values('__ops_booking2','__ops_service',d,'09:00','Cliente Teste','11999999999');
 begin
   update public.bookings set status='scheduled' where id='__ops_booking';
   raise exception 'Conflicting reactivation accepted';
 exception when sqlstate 'PT409' then null; end;
 update public.bookings set status='cancelled',cancellation_reason='Teste' where id='__ops_booking2';
 update public.bookings set status='scheduled' where id='__ops_booking';
 if not exists(select 1 from public.booking_slots where date=d and time='09:00') then raise exception 'Reactivation missing slot'; end if;
 if (select count(*) from public.bookings where client_phone_key='11999999999' and id like '__ops_%')<>2 then raise exception 'History normalization failed'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 begin
   insert into public.bookings(id,service_id,date,time,client_name,client_phone,status) values('__ops_spoof','__ops_service',current_setting('ops.day'),'11:00','Cliente Teste','11999999999','completed');
   raise exception 'Public status spoofing accepted';
 exception when sqlstate 'PT403' then null; end;
 begin perform * from public.booking_payments; raise exception 'Anonymous ledger read'; exception when insufficient_privilege then null; end;
 begin insert into public.booking_payments(booking_id,amount,kind,method) values('__ops_booking',10,'payment','pix'); raise exception 'Anonymous ledger write'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.booking_payments where booking_id='__ops_booking') then raise exception 'Other user can read payments'; end if;
 begin insert into public.booking_payments(booking_id,amount,kind,method) values('__ops_booking',10,'payment','pix'); raise exception 'Other user payment allowed'; exception when sqlstate 'PT403' or insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: status, notes, cancellation, restoration/conflicts, deposits, payments, refunds, history, spoofing and RLS; all fixtures rolled back' as result;
