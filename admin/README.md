# LitFlow Admin Frontend

This folder contains the separate React admin panel for LitFlow.

## Env

Copy `.env.example` to `.env`:

```env
VITE_ADMIN_API_BASE_URL=http://localhost:5000/api/admin
```

## Start admin frontend

```bash
npm run dev
```

Default local URL:

- `http://localhost:5174`

## Build admin frontend

```bash
npm run build
```

## Admin login flow

The admin panel uses its own login system:

- Email + password
- Admin JWT
- Separate from user OTP auth

Before logging in, make sure the backend is running and the first admin account is seeded from the `server` folder:

```bash
npm run seed:admin
```

## Features included

- Dashboard metrics and charts
- User management
- Payments and manual revenue entries
- Analytics and AI usage tracking
- Feature toggles
- Content management
- Site settings editor
- Security and OTP logs
