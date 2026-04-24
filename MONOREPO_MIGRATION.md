# Monorepo Migration Plan (LexhoAdmin)

## Target Architecture

```text
apps/
  admin/
    src/
      features/
        auth/
        dashboard/
        users/
        partners/
      navigation/
      store/
      services/
  customer/
    src/
      features/
      navigation/
  partner/
    src/
      features/
      navigation/
packages/
  ui/
  api/
  auth/
  constants/
  hooks/
  utils/
```

## Migration Steps

1. Move app source into `apps/admin` (done).
2. Keep existing behavior stable; do not refactor all features at once.
3. Identify duplicated logic in `src/api`, `src/hooks`, `src/utils`, `src/constants`.
4. Move shared logic into `packages/*` module-by-module.
5. Replace local imports with package imports (`@lexho/*`).
6. Extract shared auth/session behavior into `@lexho/auth`.
7. Extract API client/interceptors into `@lexho/api`.
8. Migrate UI primitives into `@lexho/ui`.
9. Add app-specific navigation per workspace (`admin`, `customer`, `partner`).
10. Enforce role-based route guards using `UserRole` from `@lexho/constants`.

## Role-Based Design

Use `UserRole` enum from `@lexho/constants` and enforce permissions in:
- route guards
- API permission checks
- feature toggles

## State Management

`@lexho/hooks/useAuth` provides a shared Zustand auth store.
You can keep existing app stores and migrate to shared slices gradually.

## Best Practices for Scale

- Keep business rules inside feature modules.
- Keep cross-app contracts in `packages/constants`.
- Keep app-specific styling in app workspace, shared primitives in `packages/ui`.
- Prefer dependency injection for storage and transport layers.
- Add tests at package boundary first (`auth`, `api`, `utils`).
