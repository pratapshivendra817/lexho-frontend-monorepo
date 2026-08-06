# Lexho Frontend Monorepo

Frontend workspace for Lexho admin web and mobile partner/customer apps.

## Workspace Layout

```text
apps/
  admin/                  # Admin web app
  customer/legacy-mobile/ # Customer React Native app
  partner/legacy-mobile/  # Partner React Native app
packages/
  ...                     # Shared packages/utilities as adopted by each app
```

## Main App Pointers

- Admin web: `apps/admin`
- Customer mobile: `apps/customer/legacy-mobile`
- Partner mobile: `apps/partner/legacy-mobile`

Partner app readiness summary is documented in `apps/partner/legacy-mobile/README.md`.

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Run the app you need from its workspace/package scripts.

3. Use app-specific docs where available for setup, environment, and verification notes.
