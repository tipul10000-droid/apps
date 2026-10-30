// מחליף את window.claude.use("db") כדי שהדף יעבוד מחוץ ל-Claude.
// הנתונים ב-Supabase (פרויקט family-apps, טבלה sq_docs), דרך פונקציות sq_list / sq_put (מחיקה רכה עם _deleted).
// הגישה: ב-Side Quests קוד של 6 ספרות במסך כניסה (window.SQ_PIN), נשמר רק לפתיחה הנוכחית.
// ברשימת הסרטים מפתח אישי בכתובת (?k=...). אף אחד מהם לא נמצא בקוד.
// 5 ניסיונות שגויים נועלים ל-30 דקות (בשרת, sq_auth).
// מפתח Supabase כאן הוא הציבורי (publishable) בלבד.
(function () {
  var URL_ = "https://emgtyfksnofzzlutngbf.supabase.co";
  var ANON = "sb_publishable_Pa6-CuUavcT0rpD8ei_cxA_8oZ-Ykku";
  var APP = window.SQ_APP;
  var LS = "sq_key";

  var PIN = !!window.SQ_PIN;
  function getKey() {
    if (PIN) { try { return sessionStorage.getItem("sq_pin") || ""; } catch (e) { return ""; } }
    var k = new URLSearchParams(location.search).get("k");
    try { if (k) localStorage.setItem(LS, k); else k = localStorage.getItem(LS); } catch (e) {}
    return k || "";
  }
  var key = getKey();

  function rpc(name, args) {
    return fetch(URL_ + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON },
      body: JSON.stringify(Object.assign({ p_key: key, p_app: APP }, args || {}))
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = t ? JSON.parse(t) : null;
        if (!r.ok) { var e = new Error((j && j.message) || ("HTTP " + r.status)); e.badKey = /bad key/.test(e.message); throw e; }
        return j;
      });
    });
  }

  var docs = {}; // "collection/id" -> data
  var subs = []; // {coll, id?, cb, err}
  var loaded = false;

  function snapFor(s) {
    if (s.id) {
      var d = docs[s.coll + "/" + s.id];
      return { exists: !!d, id: s.id, data: function () { return d ? JSON.parse(JSON.stringify(d)) : undefined; } };
    }
    var list = [];
    Object.keys(docs).forEach(function (k) {
      var i = k.indexOf("/");
      if (k.slice(0, i) === s.coll) {
        var d = docs[k];
        list.push({ id: k.slice(i + 1), exists: true, data: function () { return JSON.parse(JSON.stringify(d)); } });
      }
    });
    return { docs: list, size: list.length, empty: !list.length };
  }
  function emit() { if (!loaded) return; subs.forEach(function (s) { try { s.cb(snapFor(s)); } catch (e) { console.error(e); } }); }

  var lastJson = "";
  function refresh() {
    return rpc("sq_open").then(function (res) {
      if (!res || res.status !== "ok") { var e = new Error(res && res.status === "locked" ? "locked" : "bad key"); e.badKey = true; e.locked = res && res.status === "locked"; throw e; }
      var rows = res.rows, next = {};
      (rows || []).forEach(function (r) { if (!(r.data && r.data._deleted)) next[r.collection + "/" + r.id] = r.data || {}; });
      var j = JSON.stringify(next);
      loaded = true;
      window.SQ_LAST_REFRESH = Date.now();
      try { window.dispatchEvent(new Event("sq-refreshed")); } catch (x) {}
      if (j !== lastJson) { lastJson = j; docs = next; emit(); }
    }).catch(function (e) {
      subs.forEach(function (s) { if (s.err) try { s.err(e); } catch (x) {} });
      if (e.badKey) askKey(e.locked);
      throw e;
    });
  }

  function askKey(locked) {
    if (PIN) return pinScreen(locked ? "יותר מדי ניסיונות. נסה שוב בעוד חצי שעה." : (key ? "קוד שגוי" : ""));
    if (document.getElementById("sq-key")) return;
    var box = document.createElement("div");
    box.id = "sq-key";
    box.style.cssText = "position:fixed;inset:auto 12px 12px 12px;z-index:9999;background:#fff;color:#111;border-radius:14px;padding:14px;box-shadow:0 8px 30px rgba(0,0,0,.25);font:16px system-ui;direction:rtl";
    box.innerHTML = '<div style="margin-bottom:8px">צריך את המפתח האישי כדי לראות את הנתונים.</div>' +
      '<input id="sq-key-in" style="width:100%;box-sizing:border-box;padding:10px;font-size:16px;border:1px solid #ccc;border-radius:10px" placeholder="מפתח" dir="ltr">' +
      '<button id="sq-key-go" style="margin-top:8px;padding:10px 16px;font-size:16px;border:0;border-radius:10px;background:#1d4ed8;color:#fff">שמירה</button>';
    document.body.appendChild(box);
    document.getElementById("sq-key-go").onclick = function () {
      var v = document.getElementById("sq-key-in").value.trim();
      if (!v) return;
      try { localStorage.setItem(LS, v); } catch (e) {}
      var u = new URL(location.href); u.searchParams.set("k", v); location.replace(u.toString());
    };
  }

  function okPut(v) { if (v === -1) { var e = new Error("bad key"); e.badKey = true; askKey(); throw e; } return v; }

  // מסך כניסה עם קוד. נפתח מעל הדף עד שהשרת מאשר את הקוד.
  var pinWaiters = [];
  function pinScreen(msg) {
    var box = document.getElementById("sq-pin");
    if (!box) {
      box = document.createElement("div");
      box.id = "sq-pin";
      box.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#123b31;direction:rtl;font-family:system-ui,-apple-system,sans-serif";
      box.innerHTML = '<form id="sq-pin-f" style="width:min(320px,90vw);text-align:center;color:#fff">' +
        '<svg viewBox="0 0 24 24" width="56" height="56" aria-hidden="true" style="margin-bottom:10px;fill:none;stroke:#f2a93b;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" fill="rgba(242,169,59,.15)"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.2" r="1.4" fill="#f2a93b" stroke="none"/><path d="M12 16.4v1.6"/></svg>' +
        '<div style="font-size:30px;font-weight:800;margin-bottom:6px">Side Quests</div>' +
        '<div style="opacity:.8;margin-bottom:18px">הקלד את הקוד</div>' +
        '<input id="sq-pin-in" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="current-password" dir="ltr" ' +
        'style="width:100%;box-sizing:border-box;padding:14px;font-size:28px;letter-spacing:12px;text-align:center;border:0;border-radius:14px">' +
        '<div id="sq-pin-msg" style="min-height:22px;margin-top:10px;color:#ffc46b"></div></form>';
      document.body.appendChild(box);
      var inp = document.getElementById("sq-pin-in");
      inp.addEventListener("input", function () { if (inp.value.length === 6) submit(); });
      document.getElementById("sq-pin-f").onsubmit = function (ev) { ev.preventDefault(); submit(); };
      function submit() {
        var v = inp.value.trim();
        if (!/^[0-9]{6}$/.test(v)) { document.getElementById("sq-pin-msg").textContent = "6 ספרות"; return; }
        key = v; inp.value = "";
        refresh().then(function () {
          try { sessionStorage.setItem("sq_pin", v); } catch (e) {}
          box.remove();
          var w = pinWaiters; pinWaiters = []; w.forEach(function (f) { f(db); });
        }).catch(function () {});
      }
    }
    document.getElementById("sq-pin-msg").textContent = msg || "";
    setTimeout(function () { var i = document.getElementById("sq-pin-in"); if (i) i.focus(); }, 50);
  }

  function write(coll, id, data, merge) {
    var k = coll + "/" + id;
    docs[k] = merge ? Object.assign({}, docs[k] || {}, data) : data;
    lastJson = JSON.stringify(docs); emit();
    return rpc("sq_put", { p_collection: coll, p_id: id, p_data: data, p_merge: !!merge })
      .then(okPut).catch(function (e) { refresh().catch(function () {}); throw e; });
  }
  function remove(coll, id) {
    delete docs[coll + "/" + id];
    lastJson = JSON.stringify(docs); emit();
    // מחיקה רכה: המסמך מסומן _deleted ולא נמחק מהטבלה
    return rpc("sq_put", { p_collection: coll, p_id: id, p_data: { _deleted: true }, p_merge: false })
      .then(okPut).catch(function (e) { refresh().catch(function () {}); throw e; });
  }

  function docRef(coll, id) {
    return {
      id: id,
      set: function (d) { return write(coll, id, d, false); },
      update: function (d) { return write(coll, id, d, true); },
      delete: function () { return remove(coll, id); },
      onSnapshot: function (cb, err) {
        var s = { coll: coll, id: id, cb: cb, err: err }; subs.push(s); if (loaded) cb(snapFor(s));
        return function () { subs = subs.filter(function (x) { return x !== s; }); };
      }
    };
  }
  var db = {
    collection: function (coll) {
      return {
        doc: function (id) { return docRef(coll, id); },
        onSnapshot: function (cb, err) {
          var s = { coll: coll, cb: cb, err: err }; subs.push(s); if (loaded) cb(snapFor(s));
          return function () { subs = subs.filter(function (x) { return x !== s; }); };
        }
      };
    },
    refresh: function () { return refresh(); },
    doc: function (path) { var i = path.indexOf("/"); return docRef(path.slice(0, i), path.slice(i + 1)); }
  };

  setInterval(function () { if (!document.hidden) refresh().catch(function () {}); }, 30000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh().catch(function () {}); });

  window.claude = {
    use: function (name) {
      if (name === "db") {
        if (PIN) {
          return new Promise(function (res) {
            pinWaiters.push(res);
            if (!key) { pinScreen(""); return; }
            refresh().then(function () { var w = pinWaiters; pinWaiters = []; w.forEach(function (f) { f(db); }); }).catch(function () {});
          });
        }
        if (!key) { askKey(); return Promise.resolve(null); }
        refresh().catch(function () {});
        return Promise.resolve(db);
      }
      if (name === "user") return Promise.resolve({ can: function () { return Promise.resolve(true); } });
      return Promise.resolve(null);
    }
  };
})();
