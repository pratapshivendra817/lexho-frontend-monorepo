# WebRTC Audio Calling

See the partner app's `docs/webrtc-audio-calling.md` for the shared signaling and ICE contract. Customer REST endpoints use `/api/v1/customer/bookings/{bookingId}/calls` and `/api/v1/customer/calls/{callId}/...`; customer Socket.IO authentication uses role `CUSTOMER`.

TURN credentials are read from `TURN_URL`, `TURN_USERNAME`, and `TURN_PASSWORD`. Use short-lived backend-issued credentials in production.
