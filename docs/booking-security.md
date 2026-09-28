# Booking security

## Release order

1. Apply `booking_guard_and_public_slots` (already applied to Nails By Ananrs on 2026-09-28).
2. Deploy the updated `BookingWizard.tsx`. Confirm public requests use `booking_slots?select=date,time,duration_minutes`.
3. Apply `close_public_booking_reads` only after step 2. This removes public access to customer names, phones and booking IDs.

The SQL files assume the existing bookings/services schema and the restricted `services_admin_delete` policy. Administrator authorization is copied from that policy without creating users or granting every logged-in user admin privileges.

## Limits and validation

- Maximum **5 successful booking inserts per IP in a sliding 15-minute window**.
- Maximum **3 successful booking inserts per normalized Brazilian phone number in a sliding hour**.
- Limits cover direct Data API calls too, because enforcement runs in a database trigger.
- Rejected/rolled-back operations do not consume quota. This is a booking creation limit, not a firewall or total HTTP request limit.
- The hosted gateway's `cf-connecting-ip` identifies the address. Missing/invalid gateway identity fails closed for API users. A test confirmed a forged `x-forwarded-for` is appended by the gateway; never trust its first entry.
- SQL/admin maintenance without an anon/authenticated JWT is not subject to the public quota.
- A transaction advisory lock serializes inserts to enforce quotas and avoid overlapping bookings.
- Name, phone, date and time are validated. The current UI offers 09:00–19:00 start times; dates are limited to the next 31 days. Price and service name come from the database, not client input.
- Availability snapshots keep the duration that was booked, even if a service changes later.
- No changes to existing bookings. Deleting a booking also removes its availability slot.
- Quota metadata is private, has no client grants, and entries older than 24 hours are pruned on the next accepted booking attempt.

## Verification

- `npm run lint`
- `npm run build`
- Execute `tests/booking-security.sql` inside `BEGIN; ... ROLLBACK;` (requires six dates without bookings). Tests use synthetic rows and reserved documentation IP addresses.
- HTTP: public availability 200; anonymous booking ID read 401; anonymous delete 401; invalid booking 400.
- After stage 2: anonymous bookings SELECT must fail; another authenticated user must see zero rows; the existing administrator must retain SELECT/DELETE access.

## Rollback

Prefer reverting the frontend only before stage 2. If reverting it after stage 2, keep customer data private and update the old frontend to query booking_slots; do not restore public customer access.

For an emergency quota-only rollback (keeps public delete blocked):

```sql
alter table public.bookings disable trigger nails_guard_booking;
```

Re-enable after resolving the issue. Disabling the guard also disables input canonicalization and overlap enforcement, so keep the interval short.

## Separate work still needed

This does not rate-limit catalogue reads, Auth, Storage, EmailJS or Gemini. Supabase Auth has its own settings; configure them in the dashboard. The Gemini component still calls Google from the browser. Move it to a server/Edge Function with a private key and independent limits before treating it as protected. Rotate any Gemini key previously bundled as `VITE_GEMINI_API_KEY` and remove that public build variable. No key values belong in Git.

Supabase advisor: private quota table deliberately has RLS with no client policies (deny all). Leaked-password protection is disabled in the existing Auth configuration; see https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
