self.addEventListener("push", function (event) {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icon-192x192.png",
      badge: "/icon-192x192.png",
      vibrate: [100, 50, 100],
    })
  )
})

self.addEventListener("notificationclick", function (event) {
  event.notification.close()
  event.waitUntil(clients.openWindow("/"))
})
