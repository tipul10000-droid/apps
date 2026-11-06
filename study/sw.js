// Service worker של Study: מקבל התראות (Web Push) ופותח את הדף הנכון בלחיצה. אין כאן מטמון בכוונה.
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data.json(); } catch (err) { d = {body: e.data ? e.data.text() : ""}; }
  e.waitUntil(self.registration.showNotification(d.title || "📚 Study Monster", {
    body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", tag: d.tag, lang: "he", dir: "rtl",
    data: {url: d.url || self.registration.scope}
  }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(clients.matchAll({type: "window", includeUncontrolled: true}).then(function (list) {
    for (var i = 0; i < list.length; i++) if (list[i].url.indexOf(self.registration.scope) === 0 && "navigate" in list[i]) return list[i].navigate(url).then(function (c) { return c && c.focus(); });
    return clients.openWindow(url);
  }));
});
