// Side Quests service worker: push notifications only (no caching, so new versions load as before).
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data.json(); } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Side Quests", {
    body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", tag: d.tag || "sq", lang: "he", dir: "rtl",
    data: { url: d.url || self.registration.scope }
  }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url.indexOf(self.registration.scope) === 0 && "focus" in c) {
        try { c.postMessage({ type: "sq-open", url: url }); } catch (x) {}
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
