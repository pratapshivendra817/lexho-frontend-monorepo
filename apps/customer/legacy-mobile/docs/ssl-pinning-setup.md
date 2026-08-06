# SSL Pinning Setup

This app now includes an install-ready SSL pinning client scaffold in:

- `src/services/security/sslApiClient.ts`

It stays in safe fallback mode until native dependency installation and certificate bundling are completed.

## Env configuration

Set these values in your local `.env`:

```properties
SSL_PINNING_ENABLED=true
SSL_PINNING_CERT_NAME=lexho_api
```

## 1. Install dependency

From `apps/customer/legacy-mobile`:

```sh
npm install
```

## 2. iOS setup

Run CocoaPods after dependency install:

```sh
cd ios
pod install
```

Add your certificate file:

- Place `lexho_api.cer` in `ios/LexhoCustomer/SSLPinning/`
- Open Xcode
- Add the file to the `LexhoCustomer` target
- Verify it appears under `Copy Bundle Resources`

## 3. Android setup

Add your certificate file:

- Place `lexho_api.cer` in `android/app/src/main/assets/certs/`

Then sync Gradle from Android Studio or rebuild the app.

Helpful verification command:

```sh
npm run android:verify:ssl
```

Variant behavior:

- `debug` keeps cleartext traffic allowed for local development
- `release` disables cleartext traffic and expects HTTPS-only networking

## 4. Production expectations

- Use a real production certificate for the API domain
- Do not commit private keys
- Coordinate certificate rotation with backend/devops
- Test both valid-cert and invalid-cert behavior before release

## 5. Fallback behavior

If `SSL_PINNING_ENABLED=false` or the native module is unavailable, the app falls back to the normal Axios client and logs:

- `ssl_pinning_fallback_http_client`

That fallback is useful for local development, but it is not a production security control.
