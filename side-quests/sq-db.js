// מחליף את window.claude.use("db") כדי שהדף יעבוד מחוץ ל-Claude.
// הנתונים ב-Supabase (פרויקט family-apps, טבלה sq_docs), דרך פונקציות sq_list / sq_put (מחיקה רכה עם _deleted).
// הגישה: ב-Side Quests קוד של 6 ספרות במסך כניסה (window.SQ_PIN). אחרי קוד נכון המכשיר נזכר (localStorage), מכשיר חדש צריך קוד.
// לבדיקות אוטומטיות: לעולם לא להקליד קודים במסך הכניסה. 5 שגיאות נועלות גם את אורן. בודקים מול db מדומה.
// ברשימת הסרטים מפתח אישי בכתובת (?k=...). אף אחד מהם לא נמצא בקוד.
// 5 ניסיונות שגויים נועלים ל-30 דקות (בשרת, sq_auth).
// מפתח Supabase כאן הוא הציבורי (publishable) בלבד.
(function () {
  var URL_ = "https://emgtyfksnofzzlutngbf.supabase.co";
  var ANON = "sb_publishable_Pa6-CuUavcT0rpD8ei_cxA_8oZ-Ykku";
  var APP = window.SQ_APP;
  var LS = "sq_key";
  var EN = window.SQ_LANG === "en";
  function T(he, en) { return EN ? en : he; }

  var PIN = !!window.SQ_PIN;
  // רשימת הסרטים: מפתח בלינק (?k=) או שמור. בלי מפתח, נכנסים עם אותו קוד של Side Quests (השרת מקבל אותו גם ל-movies).
  if (!PIN && window.SQ_PIN_FALLBACK) {
    var urlK = new URLSearchParams(location.search).get("k"), savedK = "";
    try { savedK = localStorage.getItem(LS) || ""; } catch (e) {}
    if (!urlK && !savedK) PIN = true;
  }
  function getKey() {
    if (PIN) { try { return localStorage.getItem("sq_pin") || sessionStorage.getItem("sq_pin") || ""; } catch (e) { return ""; } }
    var k = new URLSearchParams(location.search).get("k");
    try { if (k) localStorage.setItem(LS, k); else k = localStorage.getItem(LS); } catch (e) {}
    return k || "";
  }
  var key = getKey();

  // 20.0: every call has a time limit (plane Wi-Fi can hang forever). e.net = no network / no answer,
  // e.server = the server answered with an error (5xx or a broken answer). Both count as "not connected".
  function rpc(name, args) {
    var ac = typeof AbortController === "function" ? new AbortController() : null;
    var tm = ac ? setTimeout(function () { ac.abort(); }, 12000) : 0;
    return fetch(URL_ + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON },
      body: JSON.stringify(Object.assign({ p_key: key, p_app: APP }, args || {})),
      signal: ac ? ac.signal : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = null;
        try { j = t ? JSON.parse(t) : null; } catch (x) { var e1 = new Error("bad answer"); e1.server = true; throw e1; }
        if (!r.ok) { var e = new Error((j && j.message) || ("HTTP " + r.status)); e.badKey = /bad key/.test(e.message); e.server = r.status >= 500; e.status = r.status; throw e; }
        return j;
      });
    }, function (err) { var e = new Error("offline"); e.net = true; e.cause = err; throw e; })
      .finally(function () { if (tm) clearTimeout(tm); });
  }

  // ===== 20.0: offline copy + queue =====
  // docs are saved on the device (IndexedDB, per app) after every real sync, and open from there with no network.
  // writes that can't reach the server wait in a queue (localStorage) and are sent in order when the network is back.
  var QK = "sq_q_" + APP, LK = "sq_last_" + APP;
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var queue = lsGet(QK, []);
  var skipped = [];
  var idbP = null;
  function idb() {
    if (idbP) return idbP;
    idbP = new Promise(function (res) {
      try {
        var r = indexedDB.open("sq-offline", 1);
        r.onupgradeneeded = function () { r.result.createObjectStore("kv"); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
    return idbP;
  }
  function cacheGet() {
    return idb().then(function (d) {
      if (!d) return null;
      return new Promise(function (res) {
        try { var q = d.transaction("kv").objectStore("kv").get("docs:" + APP); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; } catch (e) { res(null); }
      });
    });
  }
  var saveT = 0;
  function cachePut() {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      idb().then(function (d) { if (!d) return; try { d.transaction("kv", "readwrite").objectStore("kv").put({ docs: docs, at: Date.now() }, "docs:" + APP); } catch (e) {} });
    }, 400);
  }
  function cacheClear() { idb().then(function (d) { if (!d) return; try { d.transaction("kv", "readwrite").objectStore("kv").delete("docs:" + APP); } catch (e) {} }); lsSet(QK, []); queue = []; }

  // connection state for the app (the light next to "עדכון"): ok = the last server call worked,
  // kind "net" = no network, "server" = network but the server fails. last = last real sync (kept on the device).
  var net = { ok: null, kind: "", at: 0, fail: 0, last: lsGet(LK, 0) || 0 };
  if (net.last) window.SQ_LAST_REFRESH = net.last;
  function pub() {
    window.SQ_NET = { ok: net.ok, kind: net.kind, at: net.at, fail: net.fail, last: net.last, q: queue.length, pending: queue.map(function (o) { return o.c + "/" + o.id; }), skipped: skipped.slice() };
    try { window.dispatchEvent(new Event("sq-net")); } catch (x) {}
  }
  function netOk() { net.ok = true; net.kind = ""; net.at = Date.now(); pub(); }
  function netBad(e) { if (e && (e.net || e.server)) { net.ok = false; net.kind = e.net ? "net" : "server"; net.fail = Date.now(); pub(); } }
  function soft(e) { return e && (e.net || e.server); }
  function saveQ() { lsSet(QK, queue); pub(); }
  function applyOp(m, o) {
    var k = o.c + "/" + o.id;
    if (o.del) { delete m[k]; return; }
    m[k] = o.m ? Object.assign({}, m[k] || {}, o.d) : o.d;
  }
  // a queued change to a task that was merged into another one, deleted or archived meanwhile is not applied blindly
  function conflict(row, o) {
    if (o.c !== "topics" || o.del) return "";
    if (!row || (row.data && row.data._deleted)) return "המשימה נמחקה בינתיים";
    var d = row.data || {};
    if (d.merged_into && !("merged_into" in o.d)) return "המשימה אוחדה בינתיים";
    if (d.status === "archived" && !("status" in o.d)) return "המשימה עברה לארכיון בינתיים";
    return "";
  }
  var flushing = null;
  function flush() {
    if (!queue.length) return Promise.resolve();
    if (flushing) return flushing;
    flushing = rpc("sq_open").then(function (res) {
      if (!res || res.status !== "ok") { var e = new Error(res && res.status === "locked" ? "locked" : "bad key"); e.badKey = true; e.locked = res && res.status === "locked"; throw e; }
      var rows = {}; (res.rows || []).forEach(function (r) { rows[r.collection + "/" + r.id] = r; });
      var step = function () {
        if (!queue.length) return Promise.resolve();
        var o = queue[0], why = conflict(rows[o.c + "/" + o.id], o);
        if (why) { skipped.push({ id: o.id, c: o.c, why: why, at: o.at, d: o.d, title: (rows[o.c + "/" + o.id] && rows[o.c + "/" + o.id].data && rows[o.c + "/" + o.id].data.title) || "" }); queue.shift(); saveQ(); return step(); }
        return rpc("sq_put", { p_collection: o.c, p_id: o.id, p_data: o.del ? { _deleted: true } : o.d, p_merge: o.del ? false : !!o.m })
          .then(okPut).then(function () { queue.shift(); saveQ(); return step(); }, function (e) {
            if (soft(e) || e.badKey) throw e;
            skipped.push({ id: o.id, c: o.c, why: "השרת לא קיבל את השינוי", at: o.at, d: o.d }); queue.shift(); saveQ(); return step();
          });
      };
      return step();
    }).finally(function () { flushing = null; });
    return flushing;
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
  // רענון אוטומטי רק כשיש קוד ואין נעילה. כל קריאה עם קוד שגוי או ריק נספרת כניסיון שגוי
  // (5 כאלה נועלים את כולם ל-30 דקות). זה מה שנעל את אורן: לשונית פתוחה במסך הקוד שרעננה כל 30 שניות.
  var lockTimer = null;
  function refresh() {
    if (!key) { var e0 = new Error("no key"); e0.badKey = true; e0.noKey = true; if (PIN) pinScreen(""); return Promise.reject(e0); }
    return flush().then(function () { return rpc("sq_open"); }).then(function (res) {
      if (!res || res.status !== "ok") { var e = new Error(res && res.status === "locked" ? "locked" : "bad key"); e.badKey = true; e.locked = res && res.status === "locked"; throw e; }
      var rows = res.rows, next = {};
      (rows || []).forEach(function (r) { if (!(r.data && r.data._deleted)) next[r.collection + "/" + r.id] = r.data || {}; });
      queue.forEach(function (o) { applyOp(next, o); }); // changes still waiting stay visible
      var j = JSON.stringify(next);
      loaded = true;
      if (PIN) { try { localStorage.setItem("sq_pin", key); sessionStorage.setItem("sq_pin", key); } catch (x) {} }
      window.SQ_LAST_REFRESH = Date.now();
      net.last = window.SQ_LAST_REFRESH; lsSet(LK, net.last); netOk();
      try { window.dispatchEvent(new Event("sq-refreshed")); } catch (x) {}
      if (j !== lastJson) { lastJson = j; docs = next; emit(); }
      cachePut();
    }).catch(function (e) {
      netBad(e);
      // no network but data is on screen (from the device copy): stay quiet, the light shows it
      if (!(soft(e) && loaded)) subs.forEach(function (s) { if (s.err) try { s.err(e); } catch (x) {} });
      if (e.badKey) {
        if (!e.locked) cacheClear();
        if (e.locked) {
          // נעול: לא מוחקים את הקוד השמור. מנסים שוב לבד כל 5 דקות (בזמן נעילה זה לא נספר כניסיון).
          if (!lockTimer) lockTimer = setTimeout(function () { lockTimer = null; refresh().then(resolvePin).catch(function () {}); }, 300000);
          askKey(true);
        } else { var had = !!key; key = ""; askKey(false, had); }
      }
      throw e;
    });
  }

  function askKey(locked, wrong) {
    if (PIN && !locked) { try { localStorage.removeItem("sq_pin"); sessionStorage.removeItem("sq_pin"); } catch (e) {} }
    if (PIN) return pinScreen(locked ? T("יותר מדי ניסיונות. נפתח לבד כשהנעילה תיגמר (עד חצי שעה).", "Too many attempts. It unlocks by itself (up to 30 minutes).") : (wrong ? T("קוד שגוי", "Wrong code") : ""));
    if (document.getElementById("sq-key")) return;
    var box = document.createElement("div");
    box.id = "sq-key";
    box.style.cssText = "position:fixed;inset:auto 12px 12px 12px;z-index:9999;background:#fff;color:#111;border-radius:14px;padding:14px;box-shadow:0 8px 30px rgba(0,0,0,.25);font:16px Assistant,system-ui;direction:" + (EN ? "ltr" : "rtl");
    box.innerHTML = '<div style="margin-bottom:8px">' + T("צריך את המפתח האישי כדי לראות את הנתונים.", "Your personal key is needed to see the data.") + '</div>' +
      '<input id="sq-key-in" style="width:100%;box-sizing:border-box;padding:10px;font-size:16px;border:1px solid #ccc;border-radius:10px" placeholder="' + T("מפתח", "Key") + '" dir="ltr">' +
      '<button id="sq-key-go" style="margin-top:8px;padding:10px 16px;font-size:16px;border:0;border-radius:10px;background:#1d4ed8;color:#fff">' + T("שמירה", "Save") + '</button>';
    document.body.appendChild(box);
    document.getElementById("sq-key-go").onclick = function () {
      var v = document.getElementById("sq-key-in").value.trim();
      if (!v) return;
      try { localStorage.setItem(LS, v); } catch (e) {}
      var u = new URL(location.href); u.searchParams.set("k", v); location.replace(u.toString());
    };
  }

  function okPut(v) { if (v === -1) { var e = new Error("bad key"); e.badKey = true; throw e; } return v; }

  // מסך כניסה עם קוד. נפתח מעל הדף עד שהשרת מאשר את הקוד.
  var pinWaiters = [];
  function pinScreen(msg) {
    var box = document.getElementById("sq-pin");
    if (!box) {
      box = document.createElement("div");
      box.id = "sq-pin";
      box.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#123b31;direction:" + (EN ? "ltr" : "rtl") + ";font-family:Assistant,system-ui,-apple-system,sans-serif";
      box.innerHTML = '<form id="sq-pin-f" style="width:min(320px,90vw);text-align:center;color:#fff">' +
        '<svg viewBox="0 0 24 24" width="56" height="56" aria-hidden="true" style="margin-bottom:10px;fill:none;stroke:#f2a93b;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" fill="rgba(242,169,59,.15)"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.2" r="1.4" fill="#f2a93b" stroke="none"/><path d="M12 16.4v1.6"/></svg>' +
        '<div style="font-size:30px;font-weight:800;margin-bottom:6px">Side Quests</div>' +
        '<div style="opacity:.8;margin-bottom:18px">' + T("הקלד את הקוד", "Enter your code") + '</div>' +
        '<input id="sq-pin-in" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="current-password" dir="ltr" ' +
        'style="width:100%;box-sizing:border-box;padding:14px;font-size:28px;letter-spacing:12px;text-align:center;border:0;border-radius:14px">' +
        '<div id="sq-pin-msg" style="min-height:22px;margin-top:10px;color:#ffc46b"></div></form>';
      document.body.appendChild(box);
      var inp = document.getElementById("sq-pin-in");
      inp.addEventListener("input", function () { if (inp.value.length === 6) submit(); });
      document.getElementById("sq-pin-f").onsubmit = function (ev) { ev.preventDefault(); submit(); };
      function submit() {
        var v = inp.value.trim();
        if (!/^[0-9]{6}$/.test(v)) { document.getElementById("sq-pin-msg").textContent = T("6 ספרות", "6 digits"); return; }
        key = v; inp.value = "";
        refresh().then(resolvePin).catch(function () {});
      }
    }
    document.getElementById("sq-pin-msg").textContent = msg || "";
    setTimeout(function () { var i = document.getElementById("sq-pin-in"); if (i) i.focus(); }, 50);
  }

  function resolvePin() {
    var b = document.getElementById("sq-pin"); if (b) b.remove();
    var w = pinWaiters; pinWaiters = []; w.forEach(function (f) { f(db); });
  }

  // 20.0: a write that can't reach the server (no network / server down) waits in the queue and counts as saved.
  // while something waits, new writes join the queue too, so the order stays exactly as tapped.
  function enqueue(o) { o.at = new Date().toISOString(); queue.push(o); saveQ(); return 0; }
  function send(o) {
    applyOp(docs, o); lastJson = JSON.stringify(docs); emit(); cachePut();
    if (queue.length) { enqueue(o); refresh().catch(function () {}); return Promise.resolve(0); }
    return rpc("sq_put", { p_collection: o.c, p_id: o.id, p_data: o.del ? { _deleted: true } : o.d, p_merge: o.del ? false : !!o.m })
      .then(okPut).then(function (v) { netOk(); return v; }, function (e) {
        if (soft(e)) { netBad(e); return enqueue(o); }
        refresh().catch(function () {}); throw e;
      });
  }
  function write(coll, id, data, merge) { return send({ c: coll, id: id, d: data, m: !!merge }); }
  // מחיקה רכה: המסמך מסומן _deleted ולא נמחק מהטבלה
  function remove(coll, id) { return send({ c: coll, id: id, del: true }); }

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
    net: function () { return window.SQ_NET; },
    clearSkipped: function () { skipped = []; pub(); },
    doc: function (path) { var i = path.indexOf("/"); return docRef(path.slice(0, i), path.slice(i + 1)); }
  };

  setInterval(function () { if (key && !lockTimer && !document.hidden) refresh().catch(function () {}); }, 30000);
  window.addEventListener("online", function () { if (key && !lockTimer) refresh().catch(function () {}); });
  window.addEventListener("offline", function () { netBad({ net: true }); });
  pub();
  // boot from the device copy: with a saved code and saved data the app opens at once, also with no network.
  // the server still checks the code on the first real sync (a wrong code clears the copy and shows the code screen).
  var bootP = key ? cacheGet().then(function (c) {
    if (!c || !c.docs || loaded) return false;
    docs = c.docs; queue.forEach(function (o) { applyOp(docs, o); });
    lastJson = JSON.stringify(docs); loaded = true; emit(); return true;
  }) : Promise.resolve(false);
  document.addEventListener("visibilitychange", function () { if (key && !lockTimer && !document.hidden) refresh().catch(function () {}); });

  window.claude = {
    use: function (name) {
      if (name === "db") {
        if (PIN) {
          return new Promise(function (res) {
            pinWaiters.push(res);
            if (!key) { pinScreen(""); return; }
            bootP.then(function (ok) { if (ok) resolvePin(); });
            refresh().then(resolvePin).catch(function () {});
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
