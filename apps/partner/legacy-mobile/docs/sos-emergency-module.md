# SOS Emergency Module

The authenticated partner app shows a floating SOS control. Hold it for three seconds, confirm, and the app captures a fresh high-accuracy GPS snapshot and alerts the admin team.

API endpoints are `POST /api/v1/emergency/sos`, `GET /api/v1/emergency/history`, and `POST /api/v1/emergency/contact`. Offline SOS requests are queued in AsyncStorage and retried in order when connectivity returns. Escalation is admin-only; the app does not call police or dispatch police notifications.
