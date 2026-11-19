// הדף הציבורי של טיול. קורא רק לפונקציה sq_trip_public עם הטוקן מהלינק (?t=). בלי טוקן תקין = כלום.
(function () {
  var URL_ = "https://emgtyfksnofzzlutngbf.supabase.co/rest/v1/rpc/sq_trip_public";
  var ANON = "sb_publishable_Pa6-CuUavcT0rpD8ei_cxA_8oZ-Ykku";
  var app = document.getElementById("app");
  var tok = new URLSearchParams(location.search).get("t") || "";
  function msg(e, t) { app.innerHTML = '<div class="msg"><b>' + e + "</b>" + t + "</div>"; }
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(tok)) { msg("🔒", "הלינק לא שלם. בקשו מאורן את הלינק המלא."); return; }
  var CK = "trips_c_" + tok.slice(0, 8);
  function show(j) {
    var t = j.trip; document.title = (t.flag ? t.flag + " " : "") + (t.title || "הטיול שלנו");
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc && t.theme && t.theme.c1) tc.content = t.theme.c1;
    TripView.render(app, t, { mode: "view", img: "img/", gfx: j.gfx || {}, wa: t.wa });
  }
  var cached = null; try { cached = JSON.parse(localStorage.getItem(CK) || "null"); } catch (e) {}
  if (cached && cached.trip) show(cached);
  fetch(URL_, { method: "POST", headers: { "Content-Type": "application/json", apikey: ANON }, body: JSON.stringify({ p_token: tok }), referrerPolicy: "no-referrer" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j || !j.trip) { try { localStorage.removeItem(CK); } catch (e) {} msg("🔒", "הדף הזה לא זמין כרגע."); return; }
      try { localStorage.setItem(CK, JSON.stringify(j)); } catch (e) {}
      show(j);
    }, function () { if (!cached) msg("📡", "אין חיבור. נסו שוב בעוד רגע."); });
})();
