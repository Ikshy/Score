# SCORE
Private, mobile-first daily contribution board for up to 8 users + 1 admin.

### Rules
- User: username + 4-digit PIN (the app internally maps this to a Supabase Auth password; the PIN is never stored as plain text in the browser).
- Amounts: ৳10 / ৳20 / ৳30 / ৳50.
- One contribution per user per Bangladesh calendar day.
- Before contributing, the user sees no amounts or total.
- After contributing, the user sees the board up to that moment and future contributions in real time.
- Admin sees everything and can manually reset.

### Automatic midnight reset
Manual reset is included. For a true automatic 12:00 AM Asia/Dhaka reset, add a Supabase scheduled Edge Function/cron that runs the reset operation server-side. This should not expose the service-role key to the browser.
