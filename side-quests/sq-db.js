// מחליף את window.claude.use("db") כדי שהדף יעבוד מחוץ ל-Claude.
// הנתונים ב-Supabase (פרויקט family-apps, טבלה sq_docs), דרך פונקציות sq_list / sq_put (מחיקה רכה עם _deleted).
// הגישה בעזרת מפתח אישי בכתובת (?k=...). המפתח לא נמצא בקוד.
// מפתח Supabase כאן הוא הציבורי (publishable) בלבד.
(function () {
  var URL_ = "https://emgtyfksnofzzlutngbf.supabase.co";
  var ANON = "sb_publishable_Pa6-CuUavcT0rpD8ei_cxA_8oZ-Ykku";
  var APP = window.SQ_APP;
  var LS = "sq_key";

  function getKey() {
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
    return rpc("sq_list").then(function (rows) {
      var next = {};
      (rows || []).forEach(function (r) { if (!(r.data && r.data._deleted)) next[r.collection + "/" + r.id] = r.data || {}; });
      var j = JSON.stringify(next);
      loaded = true;
      if (j !== lastJson) { lastJson = j; docs = next; emit(); }
    }).catch(function (e) {
      subs.forEach(function (s) { if (s.err) try { s.err(e); } catch (x) {} });
      if (e.badKey) askKey();
      throw e;
    });
  }

  function askKey() {
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

  function write(coll, id, data, merge) {
    var k = coll + "/" + id;
    docs[k] = merge ? Object.assign({}, docs[k] || {}, data) : data;
    lastJson = JSON.stringify(docs); emit();
    return rpc("sq_put", { p_collection: coll, p_id: id, p_data: data, p_merge: !!merge })
      .catch(function (e) { refresh().catch(function () {}); throw e; });
  }
  function remove(coll, id) {
    delete docs[coll + "/" + id];
    lastJson = JSON.stringify(docs); emit();
    // מחיקה רכה: המסמך מסומן _deleted ולא נמחק מהטבלה
    return rpc("sq_put", { p_collection: coll, p_id: id, p_data: { _deleted: true }, p_merge: false })
      .catch(function (e) { refresh().catch(function () {}); throw e; });
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
    doc: function (path) { var i = path.indexOf("/"); return docRef(path.slice(0, i), path.slice(i + 1)); }
  };

  setInterval(function () { if (!document.hidden) refresh().catch(function () {}); }, 30000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh().catch(function () {}); });

  window.claude = {
    use: function (name) {
      if (name === "db") {
        if (!key) { askKey(); return Promise.resolve(null); }
        refresh().catch(function () {});
        return Promise.resolve(db);
      }
      if (name === "user") return Promise.resolve({ can: function () { return Promise.resolve(true); } });
      return Promise.resolve(null);
    }
  };
})();
