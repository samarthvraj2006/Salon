# SalonSlot

Customer Android app + API for salon appointment booking (India). Demo-ready with mock auth & payments.

## Stack

- **Mobile:** Expo (React Native) + TypeScript + Expo Router + React Query + Zustand
- **API:** Node/Express + Prisma + PostgreSQL
- **Auth:** `AUTH_MODE=mock` (OTP `123456`) or Firebase
- **Payments:** `PAYMENT_PROVIDER=mock` (or Razorpay skeleton)

## Quick start

### 1) Prerequisites

- Node 20+
- Docker Desktop (for Postgres) **or** any PostgreSQL 16
- Android Studio / emulator for `expo run:android`

### 2) Start Postgres

```bash
docker compose up -d
```

### 3) Install & migrate

```bash
npm install
cp .env.example apps/api/.env   # already created for local demo
npm run db:migrate
npm run db:seed
```

### 4) Run API

```bash
npm run dev:api
```

Health: http://localhost:4000/health · Docs: http://localhost:4000/docs

### 5) Run Android app

```bash
cd apps/mobile
npx expo start
# or native build:
npx expo run:android
```

Emulator API URL defaults to `http://10.0.2.2:4000`. Physical device: set `EXPO_PUBLIC_API_BASE_URL` to your LAN IP.

## Demo credentials

- Phone: any valid 10-digit (e.g. `9876543210`)
- OTP (mock): `123456`
- Google / Email: mock login buttons on Login screen
- Coupon: `FIRST20` or `FLAT50`

## Demo click path

Login → Location → Home → Search/Map → Salon → Services → Stylist → Slot → Summary → Pay (optional) → Confirmed → Pass (QR) → Cancel/Reschedule → Review

## Architecture

```
apps/api        Express modules (auth, salons, slots, appointments, payments, promotions, notifications)
apps/mobile     Expo Router customer app (glass UI, booking flow, maps)
packages/shared Shared zod schemas + INR helpers
```

Slot engine enforces staff/service duration, breaks, holidays, and DB exclusion constraint against overlaps. Customer JWTs cannot access `/owner/*` or `/admin/*`.

## Env modes

| Var | Values | Notes |
|-----|--------|-------|
| `AUTH_MODE` | `mock` / `firebase` | Mock skips Firebase billing |
| `PAYMENT_PROVIDER` | `mock` / `razorpay` | Razorpay needs keys |

See root `.env.example` for all keys (Firebase, Maps, FCM, Razorpay).

## Tests

```bash
npm run test -w @salonslot/api
```
