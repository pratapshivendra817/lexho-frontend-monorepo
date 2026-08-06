# WebRTC Audio Calling

The calling module lives in `src/modules/calling` and is shared conceptually with the customer app.

## Runtime contract

- REST creates, accepts, rejects, ends, and marks calls missed.
- Socket.IO exchanges `call:initiate`, `call:incoming`, `call:ringing`, `call:accept`, `call:reject`, `call:busy`, `call:end`, `call:timeout`, `call:offer`, `call:answer`, and `call:ice-candidate`.
- Socket authentication sends `{ token, role }` in the Socket.IO auth payload.
- Audio is acquired with `{ audio: true, video: false }` and never opens the system dialer.
- ICE uses Google STUN first. TURN is appended when all three environment values are present.
- Failed ICE is restarted twice before the call enters `failed` state.

## Environment

Configure both mobile apps with:

```env
TURN_URL=turn:turn.example.com:3478?transport=udp
TURN_USERNAME=short-lived-username
TURN_PASSWORD=short-lived-password
```

Production credentials should be short-lived credentials issued by the backend. Do not commit static TURN secrets.

## Backend expectations

The Socket.IO server must authorize that the authenticated user belongs to the booking, prevent concurrent calls with `call:busy`, enforce ring timeouts, persist call outcomes, and relay SDP/ICE only between the two call participants. Push notifications are still required to wake a terminated mobile app; Socket.IO alone cannot do that.
