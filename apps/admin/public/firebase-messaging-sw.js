self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || "Lexho Admin";
  const body = notification.body || data.message || data.body || "New notification";
  const redirectType = String(data.redirectType || data.referenceType || data.notificationType || data.type || "").toUpperCase();
  const redirectValue = String(data.redirectValue || data.referenceId || data.notificationId || data.id || "").trim();

  let url = "/notifications";
  if (redirectType === "PAYMENT" && redirectValue) {
    url = `/admin-payments?search=${encodeURIComponent(redirectValue)}`;
  } else if (redirectType === "BOOKING" && redirectValue) {
    url = `/bookings?search=${encodeURIComponent(redirectValue)}`;
  } else if (redirectType === "SUPPORT" || redirectType === "TICKET") {
    url = "/support";
  } else if (redirectValue) {
    url = `/notifications/${encodeURIComponent(redirectValue)}`;
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url },
      tag: String(data.notificationId || data.id || title),
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }
        }
      }
      return clients.openWindow(targetUrl);
    })(),
  );
});
