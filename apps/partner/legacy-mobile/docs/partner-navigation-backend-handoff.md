# Partner Navigation Backend Handoff

## Purpose

Partner mobile navigation is now wired in the app. Backend route and ETA data can be plugged in without changing the screen flow.

## App Entry Points

- `OrderDetails -> Open Route Map`
- `ActiveJob -> Open In-App Navigation`
- `RouteMap -> Start Navigation`

## Backend Endpoint Expected

The app tries these endpoints in order:

1. `GET /api/v1/partner/navigation/route`
2. `GET /api/v1/partner/route`
3. `GET /api/v1/navigation/route`
4. `GET /api/partner/navigation/route`

## Query Params

```http
bookingId=<number>
originLat=<number>
originLng=<number>
destinationLat=<number>
destinationLng=<number>
```

## Response Shapes Supported

Any one of these route geometry forms works:

### Option A: explicit coordinates

```json
{
  "data": {
    "route": {
      "coordinates": [
        { "latitude": 28.6139, "longitude": 77.2090 },
        { "latitude": 28.6201, "longitude": 77.2151 }
      ],
      "etaSeconds": 780,
      "distanceMeters": 4200,
      "trafficDelaySeconds": 120,
      "deviationThresholdMeters": 100,
      "steps": [
        {
          "id": "step-1",
          "text": "Turn left in 120 meters",
          "distanceMeters": 120,
          "durationSeconds": 45,
          "maneuverType": "turn",
          "modifier": "left",
          "coordinate": { "latitude": 28.6150, "longitude": 77.2105 }
        }
      ]
    }
  }
}
```

### Option B: encoded polyline

```json
{
  "data": {
    "route": {
      "polyline": "encoded-polyline-value",
      "etaSeconds": 780,
      "distanceMeters": 4200,
      "trafficDelaySeconds": 120,
      "steps": []
    }
  }
}
```

## Frontend Behavior

- ETA refresh every 30 seconds
- Route recalculation when partner deviates by more than 100 meters
- If endpoint is missing or returns `404`, app falls back to a direct line route
- Live GPS continues through existing partner tracking flow

## Backend Ask

Please expose one stable route endpoint returning:

- route geometry
- ETA in seconds
- remaining distance in meters
- traffic delay in seconds
- turn-by-turn steps
- optional custom deviation threshold

## Validation Checklist

- Route response returns real geometry, not only origin/destination
- ETA updates after partner location changes
- Traffic delay changes when route congestion changes
- Step list matches actual route order
- Response works for both accepted and started bookings
