# SalonSlot

Customer Android app + API for salon appointment booking (India). Demo-ready with mock auth & payments.

## Stack

- **Mobile:** Expo (React Native) + TypeScript + Expo Router + React Query + Zustand
- **API:** Node/Express + Prisma + PostgreSQL
- **Auth:** `AUTH_MODE=mock` (OTP `123456`) or Firebase
- **Payments:** `PAYMENT_PROVIDER=mock` (or Razorpay skeleton)

## Quick start

### Windows / Android Studio checklist

Install these once before running the app:

- Node.js 20 LTS
- Docker Desktop
- Android Studio, with Android SDK Platform 35, Android SDK Build-Tools, Android Emulator, and one Android Virtual Device (AVD)
- JDK 17 (Android Studio can provide this)

In Android Studio: open **More Actions → SDK Manager** and install the SDK items above. Then use **More Actions → Virtual Device Manager** to create and start a Pixel emulator. No Firebase file is required for the included mock demo mode.

### 1) Prerequisites

- Node 20+
- Docker Desktop (for Postgres) **or** any PostgreSQL 16
- Android Studio / emulator for `expo run:android`

### 2) Start Postgres

```bash
docker compose up -d
```

### 3) Install & migrate

```powershell
npm install
Copy-Item .env.example apps/api/.env
npm run db:migrate
npm run db:seed
```

### 4) Run API

```powershell
npm run dev:api
```

Health: http://localhost:4000/health · Docs: http://localhost:4000/docs

### 5) Run Android app

Keep the API terminal open. In a second PowerShell terminal at the project root, run:

```powershell
npx expo run:android --working-directory apps/mobile
```

This builds the Android development app, starts it on the running emulator, and uses the emulator API URL `http://10.0.2.2:4000` from `apps/mobile/.env`.

To open the native Android project in Android Studio after the first build:

```powershell
npx expo prebuild --platform android --clean --working-directory apps/mobile
Start-Process 'android-studio' -ArgumentList 'E:\SALON\apps\mobile\android'
```

Then choose your emulator in Android Studio and press the green **Run** button. Use `npx expo run:android --working-directory apps/mobile` again whenever native dependencies or `app.config.ts` change.

For a physical Android device, change `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env` to `http://YOUR_COMPUTER_LAN_IP:4000`, ensure your phone and computer share Wi-Fi, then rebuild the app.

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
