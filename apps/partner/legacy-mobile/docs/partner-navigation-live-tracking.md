# Partner Navigation & Live Tracking

## Overview

This module adds in-app partner navigation with Mapbox rendering, backend ETA consumption, route deviation detection, and live GPS updates.

## Folder Structure

`src/modules/navigation`

- `screens`
- `hooks`
- `services`
- `store`
- `types`

## Backend Contract Assumption

The app first tries these route endpoints:

- `/api/v1/partner/navigation/route`
- `/api/v1/partner/route`
- `/api/v1/navigation/route`
- `/api/partner/navigation/route`

Expected query params:

- `bookingId`
- `originLat`
- `originLng`
- `destinationLat`
- `destinationLng`

Supported response shapes:

- explicit `coordinates`
- `polylineCoordinates`
- encoded `polyline`
- `steps` or `instructions`

If no endpoint exists yet, the app falls back to a direct line route so the UI still works without crashing.

## Runtime Behavior

- Route preview is available from `OrderDetails` and `ActiveJob`
- ETA refresh happens every 30 seconds during live tracking
- GPS stream is throttled by native watch options
- Route refresh is triggered when deviation exceeds 100 meters
- Redux Persist keeps navigation state available across app restarts

## Environment

Add to `.env`:

```properties
MAPBOX_PUBLIC_TOKEN=pk.your_public_mapbox_token
```
