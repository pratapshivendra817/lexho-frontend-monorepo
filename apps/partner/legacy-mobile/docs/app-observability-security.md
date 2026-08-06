# Partner App Observability & Security

## Added in this rollout

- Firebase Crashlytics service wrapper
- Firebase Analytics service wrapper
- Navigation screen tracking
- Acceptance-rate Redux slice
- Online-hours lifecycle service
- Offline queue and retry engine
- Order cache layer for list and detail fallback
- Background-location compliance helpers
- Root-detection guard screen
- JWT refresh single-flight hardening

## Notes

- Crashlytics, device info, SSL pinning, and JailMonkey are wired as optional runtime dependencies so the app stays buildable before native install finishes.
- SSL pinning service is scaffolded for `react-native-ssl-pinning`; native certificate configuration still has to be added during Android/iOS release setup.
- Root detection blocks sensitive usage through an app-level security gate.
