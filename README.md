# SCORE
Private, mobile-first daily contribution board for up to 8 users + 1 admin.

### Rules
- User: username + 4-digit PIN (the app internally maps this to a Supabase Auth password; the PIN is never stored as plain text in the browser).
- Admin PIN: `20365`.
- Amounts: ৳10 / ৳20 / ৳30 / ৳50.
- One contribution per user per Bangladesh calendar day.
- Before contributing, the user sees no amounts or total.
- After contributing, the user sees the board up to that moment and future contributions in real time.
- Admin sees everything and can manually reset.

### Setup
1. Create a free Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. On your PC, run `npm install`.
4. In PowerShell, set the one-time setup variables:
   `$env:SUPABASE_URL="YOUR_URL"`
   `$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"`
5. Run `node scripts/create-users.mjs`.
6. Copy `.env.example` to `.env.local` and fill the VITE variables using the Supabase project URL and anon/publishable key.
7. Test with `npm run dev`.

**Never upload the service-role key or `.env.local` to GitHub/Vercel.**

### GitHub
`git init` → `git add .` → `git commit -m "Initial SCORE app"` → create an empty GitHub repo → `git remote add origin YOUR_REPO_URL` → `git branch -M main` → `git push -u origin main`.

### Vercel
Import the GitHub repo, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables, then deploy.

### Automatic midnight reset
Manual reset is included. For a true automatic 12:00 AM Asia/Dhaka reset, add a Supabase scheduled Edge Function/cron that runs the reset operation server-side. This should not expose the service-role key to the browser.
