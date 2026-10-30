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

## Run both mobile apps on one Android phone (Windows)

Connect a phone with USB debugging enabled (or pair it with wireless adb), then run from the repository root:

```powershell
npm run mobile:both
```

This builds, installs, and launches both apps on the same device. Customer uses Metro port `8081`; partner uses `8084`. Both remain installed, and you can switch between them from Android's recent apps. Metro opens in two visible PowerShell windows titled `Lexho customer Metro - 8081` and `Lexho partner Metro - 8084`. Select the corresponding window and press `r` to reload that app. Keep both windows open while developing; logs appear in each window.

To choose a specific connected device, use `npm run mobile:both -- -DeviceId SERIAL`. To preview commands without installing, use `npm run mobile:both -- -DryRun`. The existing `npm run mobile:customer` and `npm run mobile:partner` commands also use these separate ports. Backend services must be started separately.

The root commands `npm run customer`, `npm run partner`, `npm run android:customer`, and `npm run android:partner` also target physical phones only. They never fall back to an emulator, even when `RN_ALLOW_EMULATOR_FALLBACK=1`. Enable Developer options and USB debugging on the phone, connect a USB data cable, and accept the debugging authorization prompt. Run `adb devices -l` to confirm the phone shows state `device` before launching.

## Run customer and partner side by side in Android emulators (Windows)

```powershell
npm run mobile:emulators
```

This starts two separate emulator windows: customer on `emulator-5554` (`Lexho_Customer_API33`) and partner on `emulator-5556` (`Lexho_Partner_API33`). Missing AVDs are created from the installed `system-images;android-33-ext4;google_apis_playstore;x86_64` image. Install that image through Android Studio SDK Manager first if needed, or pass `-SystemImage` for another installed image. Both apps keep their own login sessions. Customer Metro uses `8081`, partner Metro uses `8084`; localhost backend ports `8082` and `8083` are forwarded to each device.

Use `npm run mobile:emulators -- -DryRun` to inspect the launch commands. To use other AVDs, pass `-CustomerAvd NAME -PartnerAvd NAME`. Keep your backend running and configure both apps for the same backend/database. Set each emulator's location to the same serviceable area through its Extended Controls, log into the partner account and go online/start a shift, then create a customer booking, accept the job in the partner window, and check customer status updates as you complete it. Dispatch still depends on partner approval, eligible skills, availability, and backend configuration. Partner device security checks allow debug emulators for local testing; release checks remain enabled.

The launcher boots devices one at a time, uses automatic graphics with Vulkan disabled, and reports an emulator process exit immediately. If a window closes during boot, inspect the `%TEMP%\lexho-customer-emulator.log` / `.err.log` (or partner equivalents) and free RAM by closing unused applications. For graphics troubleshooting, close the emulator windows and retry `npm run mobile:emulators -- -Gpu software`. The boot timeout can be adjusted with `-BootTimeoutMinutes 8`; this only helps a slow boot, not an emulator that exits.

## Partner App API Reference

The Partner React Native client implementation is in `apps/partner/legacy-mobile/src/services/partnerService.ts`.
Partner API requests use the authenticated Axios client and send the Partner JWT as:

```http
Authorization: Bearer <partner-token>
```

### Read Partner Profile

```http
GET /api/v1/partner/profile
```

The client has a compatibility fallback to `GET /api/partner/profile`.

### Update Partner Profile

```http
PUT /api/v1/partner/profile
Content-Type: application/json
```

```json
{
  "fullName": "Rahul Sharma",
  "phone": "9876543210",
  "email": "rahul@example.com",
  "city": "Gurugram",
  "pincode": "122001",
  "address": "Sector 44, Gurugram, Haryana"
}
```

The client has a compatibility fallback to `PUT /api/partner/profile`.

### Upload Partner Profile Image

```http
POST /api/v1/partner/profile-image
Content-Type: multipart/form-data
```

Multipart field:

```text
file: <JPG/JPEG/PNG image>
```

The client has a compatibility fallback to `POST /api/partner/profile-image`.

### Upload Partner Documents

Each document is uploaded in a separate request:

```http
POST /api/partner/documents/upload
Content-Type: multipart/form-data
```

Multipart fields:

```text
providerId: 12
documentType: AADHAAR_FRONT
file: <document file>
```

Supported document types and file formats:

| `documentType` | Allowed format |
| --- | --- |
| `AADHAAR_FRONT` | JPG, JPEG, PNG |
| `AADHAAR_BACK` | JPG, JPEG, PNG |
| `PAN` | JPG, JPEG, PNG |
| `PROFILE_PHOTO` | JPG, JPEG, PNG |
| `CERTIFICATE` | PDF |

Maximum file size is 5 MB. The upload service sends `providerId`, `documentType`, and `file` in the same multipart form-data request.
