/* HealthChat AI service worker — handles Web Push and notification clicks. */

self.addEventListener("install", (event) => {
  // Activate immediately on install
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Take control of any open clients without requiring reload
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "HealthChat AI", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "HealthChat AI";
  const options = {
    body: data.body || "",
    icon: "/logo-icon.svg",
    badge: "/logo-icon.svg",
    data: { url: data.url || "/dashboard" },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus an existing tab if we can
        for (const client of clients) {
          if ("focus" in client) {
            try {
              client.navigate(url);
              return client.focus();
            } catch (e) {
              // fall through
            }
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
