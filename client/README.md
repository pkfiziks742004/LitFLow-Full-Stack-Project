# LitFlow Client

This folder contains the main LitFlow user-facing frontend.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- LitFlow backend API on `/api`

## Environment

Copy `.env.example` to `.env` if you want to override local defaults:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_URL=http://localhost:5173
```

## Run locally

```bash
npm run dev
```

Default local URL:

- `http://localhost:5173`

The dev server proxies API requests to the backend on port `5000`.

## Build

```bash
npm run build
```

## Main features

- Public landing page and pricing flow
- OTP-based user login
- Research paper search and graph workspace
- Saved papers and collections
- AI summaries
- Account center and plan management
