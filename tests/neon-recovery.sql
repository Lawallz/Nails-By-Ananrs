DO $test$
DECLARE d text; total numeric;
BEGIN
 BEGIN
  INSERT INTO private.admin_users(user_id) VALUES('__recovery_admin');
  PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"__recovery_admin"}',true);
  INSERT INTO public.services(id,name,price,duration,image) VALUES('__recovery_service','Teste',100,'90 min','');
  SELECT day::date::text INTO d FROM generate_series(current_date+1,current_date+30,interval '1 day') day
  WHERE extract(dow from day)<>0 AND NOT EXISTS(SELECT 1 FROM public.booking_slots WHERE date=day::date::text)
  AND NOT EXISTS(SELECT 1 FROM public.schedule_blocks WHERE date=day::date::text) LIMIT 1;
  INSERT INTO public.bookings(id,service_id,date,time,client_name,client_phone) VALUES('__recovery_booking','__recovery_service',d,'09:00','Teste','11999999999');
  IF NOT EXISTS(SELECT 1 FROM public.booking_slots WHERE booking_id='__recovery_booking' AND duration_minutes=90) THEN RAISE EXCEPTION 'Missing slot'; END IF;
  BEGIN
   INSERT INTO public.bookings(id,service_id,date,time,client_name,client_phone) VALUES('__recovery_overlap','__recovery_service',d,'10:00','Teste','11999999998');
   RAISE EXCEPTION 'Overlap accepted';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
  BEGIN
   INSERT INTO public.schedule_blocks(date,start_time,end_time) VALUES(d,'10:00','11:00');
   RAISE EXCEPTION 'Block over booking accepted';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
  UPDATE public.bookings SET time='11:00' WHERE id='__recovery_booking';
  INSERT INTO public.schedule_blocks(date,start_time,end_time) VALUES(d,'09:00','10:00');
  INSERT INTO public.booking_payments(booking_id,amount,kind,method) VALUES('__recovery_booking',30,'deposit','pix');
  SELECT paid_amount INTO total FROM public.bookings WHERE id='__recovery_booking';
  IF total<>30 THEN RAISE EXCEPTION 'Payment not synced'; END IF;
  BEGIN
   INSERT INTO public.booking_payments(booking_id,amount,kind,method) VALUES('__recovery_booking',71,'payment','pix');
   RAISE EXCEPTION 'Overpayment accepted';
  EXCEPTION WHEN SQLSTATE 'PT400' THEN NULL; END;
  UPDATE public.bookings SET status='cancelled',cancellation_reason='Teste' WHERE id='__recovery_booking';
  IF EXISTS(SELECT 1 FROM public.booking_slots WHERE booking_id='__recovery_booking') THEN RAISE EXCEPTION 'Cancellation kept slot'; END IF;
  INSERT INTO public.booking_payments(booking_id,amount,kind,method,note) VALUES('__recovery_booking',30,'refund','pix','Teste');
  SELECT paid_amount INTO total FROM public.bookings WHERE id='__recovery_booking';
  IF total<>0 THEN RAISE EXCEPTION 'Refund not synced'; END IF;
  PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
  PERFORM set_config('request.headers','{"cf-connecting-ip":"198.51.100.17"}',true);
  BEGIN
   UPDATE public.bookings SET client_name='Não autorizado' WHERE id='__recovery_booking';
   RAISE EXCEPTION 'Anonymous update accepted';
  EXCEPTION WHEN SQLSTATE 'PT403' THEN NULL; END;
  BEGIN
   INSERT INTO public.bookings(id,service_id,date,time,client_name,client_phone,status) VALUES('__recovery_spoof','__recovery_service',d,'15:00','Teste','11999999998','completed');
   RAISE EXCEPTION 'Administrative status accepted';
  EXCEPTION WHEN SQLSTATE 'PT403' THEN NULL; END;
  INSERT INTO public.bookings(id,service_id,service_name,price,date,time,client_name,client_phone) VALUES('__recovery_public','__recovery_service','tampered',1,d,'15:00','Teste','11999999998');
  IF NOT EXISTS(SELECT 1 FROM public.bookings WHERE id='__recovery_public' AND price=100 AND service_name='Teste') THEN RAISE EXCEPTION 'Tampered price accepted'; END IF;
  RAISE EXCEPTION USING ERRCODE='Z0001',MESSAGE='All checks passed; rollback fixtures';
 EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM public.bookings WHERE id LIKE '__recovery_%') THEN RAISE EXCEPTION 'Fixtures not rolled back'; END IF;
END $test$;
