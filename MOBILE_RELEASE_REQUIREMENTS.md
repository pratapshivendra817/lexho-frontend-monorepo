# Mobile Release Requirements

Customer and Partner Android release builds are fail-closed. They cannot be
signed with the debug keystore and require these CI secret/environment values:

- `LEXHO_RELEASE_STORE_FILE`: absolute path to the release keystore on the CI runner
- `LEXHO_RELEASE_STORE_PASSWORD`: keystore password
- `LEXHO_RELEASE_KEY_ALIAS`: release key alias
- `LEXHO_RELEASE_KEY_PASSWORD`: release key password
- `LEXHO_ANDROID_VERSION_CODE`: monotonically increasing Android version code

Keep these values in the CI secret manager. Do not add them to `.env` files or
commit a keystore to this repository.

## Customer Release Gate

Before creating a Customer release, install the production TLS certificate at:

`apps/customer/legacy-mobile/android/app/src/main/assets/certs/lexho_api.cer`

Then set `SSL_PINNING_ENABLED=true` in the release environment and run:

```powershell
npm run android:verify:ssl --prefix apps/customer/legacy-mobile
```

## Device Validation

Install each release artifact on a physical Android device and verify login,
push registration, a core booking/order flow, and a foreground/background
notification before publishing.
