# Supabase setup (free tier)

DocSwift uses Supabase Auth + PostgreSQL for account and subscription records. The SQL schema is in `supabase/schema.sql`.

## Setup
1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor**, create a query, paste all of `supabase/schema.sql`, and run it.
3. In **Project Settings -> API**, copy the Project URL and the **publishable/anon** key for frontend auth.
4. Keep the **service_role/secret** key private; it belongs only in Render environment variables. Never use a `VITE_*` variable for a secret.
5. Set Supabase Auth's allowed site URL and redirect URLs to the deployed DocSwift frontend URL.

## Environment variables (planned integration)
Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Render backend:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not add actual keys to GitHub or commit a `.env` file. Put keys in the GitHub/Render environment settings.

## Security notes
- RLS is enabled on every application table.
- Users can read only their own profile, subscription and operation history.
- Clients cannot write subscription or payment records; only trusted server code should update entitlements after verifying Razorpay.
- Webhook event IDs are unique to support idempotent processing.
- The current frontend's localStorage Premium flag is not secure. Do not treat this schema alone as a finished billing integration; the API and frontend must be connected and tested before live payments are enabled.
