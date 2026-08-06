# Partner Order Chat Architecture

## Frontend ownership

- `src/types/chat.ts`: transport and Redux domain types.
- `src/services/chatApi.ts`: durable REST history, send, and read operations.
- `src/services/chatSocket.ts`: authenticated real-time transport, subscriptions, typing, receipts, and reconnect backoff.
- `src/redux/slices/chatSlice.ts`: normalized per-order timelines, optimistic delivery, pagination, typing, connection state, and unread badges.
- `src/hooks/usePartnerChatSocket.ts`: authenticated app-level socket bridge.
- `ChatListScreen` and `ChatScreen`: list and order-scoped conversation UI.

## Required backend contract

REST:

- `GET /api/v1/partner/chats?page=0&size=20`
- `GET /api/v1/partner/orders/{orderId}/chat/messages?page=0&size=30`
- `POST /api/v1/partner/orders/{orderId}/chat/messages` with `{ "text": "...", "clientId": "..." }`
- `PATCH /api/v1/partner/orders/{orderId}/chat/read` with `{ "messageIds": ["..."] }`

The list responses may use Spring `content`, `items`, `chats`, or `messages`. Message responses must include a stable `id`, `orderId`, `senderType`, text/message body, and timestamp. Echoing `clientId` is strongly recommended for optimistic reconciliation.

WebSocket:

- Endpoint: `/ws/chat`
- First client frame: `{ "type": "AUTH", "token": "jwt", "role": "PARTNER" }`
- Subscription: `{ "type": "SUBSCRIBE", "orderId": 123 }`
- Typing: `{ "type": "TYPING", "orderId": 123, "typing": true, "senderType": "PARTNER" }`
- Read: `{ "type": "READ", "orderId": 123, "messageIds": ["m1"] }`
- Server events: `MESSAGE`, `TYPING`, `READ`, and `DELIVERED` as defined in `ChatSocketEvent`.

Firebase chat pushes should set `data.redirectType` to `CHAT` or `CHAT_MESSAGE` and `data.redirectValue` to the order ID. Push is a wake-up/deep-link mechanism; REST remains the durable source of truth.

## Behavior

- Messages are optimistically inserted with `sending`, replaced by the server message, and marked `failed` on error.
- Tapping a failed bubble retries with the same `clientId`.
- Only one app-level socket is active. Screens subscribe/unsubscribe by order.
- Reconnect uses capped exponential backoff.
- Older pages are prepended while an inverted list stays anchored to the latest message.
- Incoming customer messages increment thread unread counts; opening and reading the thread clears them.

