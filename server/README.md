# LitFlow Server with Supabase

LitFlow backend uses Supabase as the database layer with custom JWT auth for users and a separate JWT-based admin login.

## Required env

Copy `.env.example` to `.env` and fill at least:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLIENT_URL`
- `JWT_SECRET`
- `ADMIN_JWT_SECRET`
- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`
- `SMTP_*`
- `OPENAI_API_KEY`
- `RAZORPAY_*`

For local development:

- Main app frontend: `http://localhost:5173`
- Admin frontend: `http://localhost:5174`

Example:

```env
CLIENT_URL=http://localhost:5173,http://localhost:5174
```

## Supabase setup

1. Open your Supabase project.
2. Go to SQL Editor.
3. Run the SQL from [supabase/schema.sql](/C:/Users/Prashant%20Kumar/Desktop/LitFlow/server/supabase/schema.sql).

This creates the LitFlow public app tables:

- `users`
- `otp_verification`
- `saved_papers`

And the admin/ops tables:

- `admin_users`
- `admin_logs`
- `payments`
- `analytics_data`
- `feature_controls`
- `site_settings`
- `content_papers`

## Seed the admin account

After env setup, create the first admin user:

```bash
npm run seed:admin
```

This uses:

- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`
- `ADMIN_SEED_NAME`

Optional hardening:

- `ADMIN_SEED_RECOVERY_ENABLED=false`
  Keep this disabled unless you explicitly want env-based admin password recovery.

## Start server

```bash
npm run dev
```

## Important API groups

Public app routes:

- `POST /api/send-otp`
- `POST /api/verify-otp`
- `GET /api/search-papers`
- `POST /api/save-paper`
- `GET /api/get-user-data`

Admin routes:

- `POST /api/admin/login`
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/payments`
- `GET /api/admin/analytics`
- `GET /api/admin/controls`
- `GET /api/admin/content`
- `GET /api/admin/logs`
