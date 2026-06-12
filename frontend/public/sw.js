/* TechnoKick 2026 — service worker for web push notifications */

self.addEventListener("push", function (event) {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: "TechnoKick 2026", body: event.data.text() };
        }
    }
    const title = data.title || "TechnoKick 2026 📣";
    const options = {
        body: data.body || "",
        icon: "/mavs-logo.png",
        badge: "/mavs-logo.png",
        data: { url: data.url || "/" },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || "/";
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
            for (const client of clientList) {
                if (client.url.startsWith(self.location.origin) && "focus" in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
