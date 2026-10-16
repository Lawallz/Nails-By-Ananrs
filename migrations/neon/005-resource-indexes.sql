-- Additive indexes for date-scoped availability, reports and bounded quota cleanup.
CREATE INDEX IF NOT EXISTS booking_slots_date_time_idx ON public.booking_slots(date,time);
CREATE INDEX IF NOT EXISTS schedule_blocks_date_time_idx ON public.schedule_blocks(date,start_time);
CREATE INDEX IF NOT EXISTS booking_payments_booking_date_idx ON public.booking_payments(booking_id,paid_on,id);
CREATE INDEX IF NOT EXISTS booking_payments_date_idx ON public.booking_payments(paid_on,id);
CREATE INDEX IF NOT EXISTS service_quotas_window_idx ON private.nails_service_quotas(window_start);
CREATE INDEX IF NOT EXISTS booking_limits_recorded_idx ON private.nails_booking_limits(recorded_at);
