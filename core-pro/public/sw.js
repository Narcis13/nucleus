// Service worker for Web Push notifications.
//
// The server delivers a JSON payload via lib/notifications/push.ts with the
// shape: { title, body?, url?, icon?, tag? }. We show a notification and,
// when clicked, focus an open tab on `url` (or open a new one).
//
// Registration lives in components/shared/notifications/push-subscription.tsx.
// This file intentionally has no build step — keep it plain ES2018 so it runs
// in every evergreen browser without transpilation.

self.addEventListener("install", (event) => {
  // Take over as soon as possible so push events work on first visit.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  let data = { title: "Notification", body: "", url: "/", tag: undefined }
  if (event.data) {
    try {
      data = Object.assign({}, data, event.data.json())
    } catch {
      // Non-JSON payloads are treated as plain text bodies.
      data.body = event.data.text()
    }
  }
  const options = {
    body: data.body,
    icon: data.icon || "/favicon.ico",
    badge: "/favicon.ico",
    tag: data.tag,
    data: { url: data.url || "/" },
  }
  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clientsList) => {
        for (const client of clientsList) {
          // Focus the first tab already pointed at our origin — saves opening
          // a duplicate when the user already has the app open.
          if (new URL(client.url).origin === self.location.origin) {
            client.focus()
            if ("navigate" in client) {
              return client.navigate(targetUrl)
            }
            return undefined
          }
        }
        return self.clients.openWindow(targetUrl)
      },
    ),
  )
})
