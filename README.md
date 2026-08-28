# DupDub Frontend

> Merchant dashboard and customer payment portal for the DupDub crypto-to-fiat settlement platform.

This is the Next.js app merchants use to manage payments and settlements, and the page customers land on to pay a merchant with USDC on Stellar. It talks exclusively to the [`dupdap-backend`](../dupdap-backend) REST API — there is no direct on-chain write path from the frontend itself beyond what the customer's wallet signs.

Related repos:
- [`dupdap-backend`](../dupdap-backend) — the API this app calls (`NEXT_PUBLIC_API_URL`)
- [`dupdapp_stellar`](../dupdapp_stellar) — the Soroban contracts (`payment_escrow`, etc.) that the customer payment flow ultimately settles into

## Why Stellar

The customer-facing payment flow here is built around Stellar, not a generic multi-chain wallet connector:

- **One asset, one chain to reason about** — the payment page only needs to handle Stellar/USDC, so there's no chain-switching UX, no gas-token juggling, and no per-network RPC config on the client.
- **Sub-second-feeling confirmations** — Stellar's ~5s ledger close means the "waiting for payment" state on `/pay/[paymentId]` resolves fast enough to keep a checkout flow feeling responsive.
- **Escrow, not a bare wallet transfer** — the customer flow is approve → deposit into the `payment_escrow` Soroban contract, not a raw transfer to a merchant address, so funds are held under contract logic until settlement conditions are met (see [`dupdapp_stellar`](../dupdapp_stellar)).
- **Fees low enough for small payments** — near-zero base fees keep the platform viable for low-ticket merchant transactions.

## Architecture

### App structure (`src/app`, Next.js App Router)

```
/                       marketing/landing page
/waitlist               public waitlist signup
/auth/login             merchant login
/auth/register          merchant registration
/pay/[paymentId]        customer-facing payment page (approve → deposit → status → receipt)
/dashboard              merchant dashboard shell (layout.tsx wraps the routes below)
  /dashboard            overview
  /dashboard/payments   payment list/detail
  /dashboard/settlements merchant settlement tracking
  /dashboard/analytics  revenue/conversion analytics
  /dashboard/webhooks   webhook endpoint management
  /dashboard/settings   profile, API keys, notification prefs
  /dashboard/admin      internal/admin views
    /dashboard/admin/settlements
```

### State & data flow

- **`src/lib/api.ts`** — a single Axios instance (`NEXT_PUBLIC_API_URL`, default `http://localhost:3000/api/v1`) with:
  - a request interceptor that attaches `Authorization: Bearer <token>` from `localStorage`
  - a response interceptor that clears the token and redirects to `/auth/login` on `401`
  - grouped API helpers (`authApi`, `paymentsApi`, …) rather than ad-hoc fetches scattered through components
- **`src/lib/store.ts`** — Zustand + `persist` for auth state (`token`, `merchant`), persisted to `localStorage` under the `dupdub-auth` key. This is the only global client state; everything else (payment lists, analytics, etc.) is fetched per-page through `api.ts`.
- **`src/lib/utils.ts`** — shared formatting/className helpers (`clsx` + `tailwind-merge`).

### Customer payment flow (`/pay/[paymentId]`)

1. Approve USDC allowance for the escrow contract (`approve(escrow_contract, amount)`)
2. Deposit into escrow (`deposit()`), which pulls funds via `transfer_from`
3. Customer confirms/signs in their own wallet — the app never touches a private key
4. Frontend polls the backend for payment status (`GET /payments/:id/status`) until it's confirmed/settled
5. Receipt view once settled

## Tech stack

- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS (custom `brand` color scale in `tailwind.config.ts`)
- **State**: Zustand (with `persist` for auth)
- **HTTP**: Axios, with interceptors for auth + 401 handling
- **Blockchain**: `@stellar/stellar-sdk` (client-side Stellar operations for the payment flow)
- **UI utilities**: `lucide-react` (icons), `clsx` + `tailwind-merge`, `react-hot-toast` (notifications)
- **Data viz**: `recharts` (dashboard analytics)
- **QR codes**: `qrcode.react` (payment request QR codes)
- **Dates**: `date-fns`

> Note: this app does not currently use a wallet-connector library (wagmi/viem/RainbowKit) or ship a PWA manifest/service worker — if you've seen references to those in older platform docs, treat them as roadmap items, not what's implemented today.

## Getting started

### Prerequisites

- Node.js 18+
- A running [`dupdap-backend`](../dupdap-backend) instance (or a deployed API you can point at)

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local — see below

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint
npm run lint
```

The app runs at `http://localhost:3001` by default (or whatever port `next dev` picks if 3000 — the backend's default — is taken).

## Environment variables

Full list in [`.env.local.example`](.env.local.example):

```bash
# Backend API base URL — must include the /api/v1 prefix
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

That's the only required variable today. `next.config.js` also falls back to `http://localhost:3000/api/v1` if it's unset, so local dev works against a locally-running backend with zero config.

If you're pointing this at a deployed backend, set it to that backend's public URL including the `/api/v1` prefix, e.g.:

```bash
NEXT_PUBLIC_API_URL=https://api.dupdub.xyz/api/v1
```

## API integration

This app is a pure client of [`dupdap-backend`](../dupdap-backend)'s REST API — see that repo's README for the full endpoint list and its Swagger docs (`/docs` on the backend) for request/response shapes. The helpers in `src/lib/api.ts` currently cover:

- `authApi` — register/login
- `paymentsApi` — create/list/get/stats for payments
- `adminApi` — list/retry/approve settlements (admin views)

Extend `api.ts` with additional grouped helpers (e.g. `settlementsApi`, `webhooksApi`, `merchantsApi`) as dashboard pages need them, rather than calling `api.get(...)` directly from components, to keep endpoint paths in one place.

## Testing & linting

```bash
npm run lint      # next lint (ESLint, see .eslintrc.json)
```

There is no test suite in this repo yet — if you add one, wire it into this section and into CI.

## Deployment

```bash
vercel --prod
```

The app is a standard Next.js app, so any platform that supports Next.js (Vercel, Railway, etc.) works. The only required runtime config is `NEXT_PUBLIC_API_URL` pointed at the deployed backend.
