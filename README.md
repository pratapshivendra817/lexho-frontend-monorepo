# Lexho Monorepo

Scalable workspace architecture for Lexho multi-app products.

## Workspace Layout

```text
apps/
  admin/      # Existing app (migrated)
  customer/   # Future app shell
  partner/    # Future app shell
packages/
  ui/         # Shared UI primitives
  api/        # Axios client and interceptors
  auth/       # JWT, OTP payloads, token/session helpers
  constants/  # Roles, environments, endpoint constants
  hooks/      # Shared hooks (useAuth, useApi)
  utils/      # Validation and helper utilities
```

## Getting Started

1. Install dependencies
```bash
npm install
```

2. Run admin app
```bash
npm run dev
```

3. Build admin app
```bash
npm run build:admin
```

## Environment Strategy

Admin app supports:
- `.env.development`
- `.env.staging`
- `.env.production`

See `apps/admin/.env.*`.

## Migration Guide

Read `MONOREPO_MIGRATION.md` for step-by-step migration from single app into feature modules and shared packages.
