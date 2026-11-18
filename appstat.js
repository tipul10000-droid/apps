/* סטטיסטיקת שימוש משותפת לכל האפליקציות (אורן 18.11.2026). מוצג ב-Side Quests ← AI Projects ← הפרויקט ← "סטטיסטיקה".
   שימוש: <script src="../appstat.js?v=1"></script> ואז AppStat.init({app:"sandwich", ver:"…", uid:()=>"…"}).
   נשלח: מזהה מכשיר אקראי (appstat_dev במכשיר), שניות שימוש פעיל (הדף גלוי ונגעו בו ב-2 הדקות האחרונות),
   גרסה, פלטפורמה, ו-uid אופציונלי שכבר מגובב כאן (לא שם). own = מכשיר של אורן (יש בו את הקוד של Side Quests).
   בלי שמות, בלי טקסט של המשתמש. כשל ברשת = שקט. */
(function () {
  if (window.AppStat) return;
  var URL_ = "https://emgtyfksnofzzlutngbf.supabase.co/rest/v1/rpc/appstat_ping";
  var ANON = "sb_publishable_Pa6-CuUavcT0rpD8ei_cxA_8oZ-Ykku";
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function hash(s) { // FNV-1a 32bit x2, לא הפיך באופן מעשי לקודים קצרים מגובבים
    s = String(s); var a = 0x811c9dc5, b = 0x1000193 ^ 0x5bd1e995;
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); a = Math.imul(a ^ c, 16777619); b = Math.imul(b ^ c, 2246822507); }
    return (a >>> 0).toString(36) + (b >>> 0).toString(36);
  }
  function devId() {
    var d = ls("appstat_dev");
    if (!d || !/^[A-Za-z0-9_-]{8,40}$/.test(d)) {
      var r = new Uint8Array(12); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(r) : r.forEach(function (_, i) { r[i] = Math.random() * 256; });
      d = Array.prototype.map.call(r, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      try { localStorage.setItem("appstat_dev", d); } catch (e) {}
    }
    return d;
  }
  function plat() {
    var u = navigator.userAgent || "", sa = navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
    var p = /iPhone|iPod/.test(u) ? "iphone" : /iPad|Macintosh/.test(u) && "ontouchend" in document ? "ipad" : /Android/.test(u) ? "android" : /Mac/.test(u) ? "mac" : /Win/.test(u) ? "windows" : "other";
    return p + (sa ? "-app" : "");
  }
  var cfg = null, acc = 0, lastTick = 0, lastAct = 0;
  function uid() { try { var v = typeof cfg.uid === "function" ? cfg.uid() : cfg.uid; return v ? hash(cfg.app + ":" + v) : null; } catch (e) { return null; } }
  function freshOpen() { // אפליקציה של כמה דפים (study): מעבר בין דפים הוא לא פתיחה חדשה. פתיחה = אחרי 30 דקות בלי שימוש
    try { var k = "appstat_o_" + cfg.app, t = +sessionStorage.getItem(k) || 0; sessionStorage.setItem(k, Date.now()); return Date.now() - t > 30 * 60000; } catch (e) { return true; }
  }
  function send(open, beacon) {
    if (!cfg || cfg.skip && cfg.skip()) return;
    if (open) open = freshOpen();
    var s = Math.round(acc); acc = 0; if (!open && s < 1) return;
    var body = JSON.stringify({ p_app: cfg.app, p_dev: devId(), p_secs: Math.min(s, 120), p_open: !!open,
      p_ver: (typeof cfg.ver === "function" ? cfg.ver() : cfg.ver) || null, p_uid: uid(),
      p_own: !!(ls("sq_pin") || ls("sq_key")), p_plat: plat() });
    try { fetch(URL_, { method: "POST", keepalive: !!beacon, headers: { "Content-Type": "application/json", apikey: ANON, Authorization: "Bearer " + ANON }, body: body }).catch(function () {}); } catch (e) {}
  }
  function tick() {
    var n = Date.now();
    if (document.visibilityState === "visible" && n - lastAct < 120000 && lastTick) acc += Math.min((n - lastTick) / 1000, 20);
    lastTick = n;
  }
  function act() { if (!lastAct || Date.now() - lastAct > 120000) lastTick = Date.now(); lastAct = Date.now(); }
  window.AppStat = {
    hash: hash,
    init: function (o) {
      if (cfg || !o || !o.app) return; cfg = o;
      lastAct = lastTick = Date.now();
      ["pointerdown", "keydown", "scroll", "touchstart", "wheel"].forEach(function (e) { addEventListener(e, act, { passive: true, capture: true }); });
      setInterval(tick, 10000);
      setInterval(function () { tick(); send(false); }, 60000);
      document.addEventListener("visibilitychange", function () {
        tick();
        if (document.visibilityState === "hidden") send(false, true);
        else { lastAct = lastTick = Date.now(); send(true); }
      });
      addEventListener("pagehide", function () { tick(); send(false, true); });
      setTimeout(function () { send(true); }, 1500);
    }
  };
})();
