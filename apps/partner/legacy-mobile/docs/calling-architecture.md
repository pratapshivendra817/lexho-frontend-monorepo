# Partner-Customer Calling Architecture

## Modules

- `callApi.ts`: call lifecycle REST commands and background incoming-call persistence.
- `callSignaling.ts`: authenticated WebSocket signaling with reconnect and pre-auth frame queueing.
- `webrtcCallService.ts`: audio-only peer connection, local microphone track, SDP, ICE, mute, speaker, and teardown.
- `callSlice.ts`: explicit call state machine and missed-call history.
- `IncomingCallScreen` and `OutgoingCallScreen`: ringing, accept/decline, mute, speaker, duration, and hangup UI.
- Firebase data pushes wake/deep-link the app; WebRTC media never travels through Firebase.

## Required Backend Contract

REST:

- `POST /api/v1/partner/orders/{orderId}/calls`
- `POST /api/v1/partner/calls/{callId}/accept`
- `POST /api/v1/partner/calls/{callId}/reject` with `{ "reason": "DECLINED" }`
- `POST /api/v1/partner/calls/{callId}/end` with `{ "reason": "HANGUP" }`
- `POST /api/v1/partner/calls/{callId}/missed`

Signaling WebSocket: `/ws/calls`

- First frame: `{ "type": "AUTH", "token": "jwt", "role": "PARTNER" }`
- Bidirectional frames: `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `RINGING`, `ACCEPTED`, `REJECTED`, and `ENDED` as typed in `CallSignal`.
- The backend must authorize both users against `orderId` and reject calls for unrelated or completed orders.

Firebase incoming-call data payload:

```json
{
  "type": "INCOMING_CALL",
  "callId": "call-123",
  "orderId": "456",
  "customerId": "customer-9",
  "customerName": "Customer",
  "expiresAt": "2026-06-14T12:00:30Z"
}
```

Use high-priority Android data messages and APNs `content-available` for background delivery. Send `CALL_MISSED` when the server-side ring timeout expires.

## Production Requirements

- Replace the public STUN-only default with backend-issued STUN/TURN credentials. TURN is mandatory for reliable carrier/NAT traversal.
- Firebase background handling persists the pending call and opens the incoming screen when the app resumes or the notification is tapped.
- A true lock-screen, full-screen native phone experience requires Android ConnectionService/CallKeep and iOS CallKit/VoIP pushes. This module does not pretend a JavaScript-only screen can replace those platform APIs.
- Android microphone, audio-route, wake-lock, and foreground-service permissions are declared. iOS microphone and background audio/remote notification modes are declared.

