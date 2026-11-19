// פלייסהולדר לגרפיקה (19.11.2026, כלל קבוע לכל האפליקציה): כל מקום שמחכה לתמונה מראה "בקרוב" עם 3 כפתורים:
// 📋 העתקת הפרומפט · ChatGPT (השיחה של הגרפיקה) · ✓ התמונה מוכנה, לשלב (להעלות מהטלפון או "שמרתי ב-Drive").
// התמונה נשמרת בשרת (sq_gfx_put, טבלה sq_gfx), אף פעם לא במאגר. הפרומפט שמור בנתונים של המקום (gfx.<slot>).
// שימוש: SQGfx.slot(el, def, {have, onDone}). def = {id, file, prompt, ratio, w, h, label}.
(function () {
  if (window.SQGfx) return;
  var URL_ = "https://emgtyfksnofzzlutngbf.supabase.co/rest/v1/rpc/";
  var ANON = "sb_publishable_Pa6-CuUavcT0rpD8ei_cxA_8oZ-Ykku";
  var GPT_CHAT = "https://chatgpt.com/share/6afbfe85-fdb0-83ed-8174-3f3036f43cb8";
  var GPT_LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0D0D0D"/><g fill="none" stroke="#fff" stroke-width="1.9"><ellipse cx="16" cy="16" rx="8.5" ry="4.2"/><ellipse cx="16" cy="16" rx="8.5" ry="4.2" transform="rotate(60 16 16)"/><ellipse cx="16" cy="16" rx="8.5" ry="4.2" transform="rotate(120 16 16)"/></g></svg>';
  function key() { try { return localStorage.getItem("sq_pin") || sessionStorage.getItem("sq_pin") || ""; } catch (e) { return ""; } }
  function rpc(n, a) {
    return fetch(URL_ + n, { method: "POST", headers: { "Content-Type": "application/json", apikey: ANON }, body: JSON.stringify(Object.assign({ p_key: key() }, a)) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error((j && j.message) || "HTTP " + r.status); return j; }); });
  }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var css = document.createElement("style");
  css.textContent = ".gx{border:2px dashed rgba(127,127,127,.45);border-radius:16px;background:repeating-linear-gradient(135deg,rgba(127,127,127,.06) 0 12px,transparent 12px 24px);padding:12px;font-family:Assistant,system-ui,sans-serif;direction:rtl}" +
    ".gx.have{border-style:solid;background:none;padding:8px 12px}.gx-h{display:flex;align-items:center;gap:10px}.gx-h .e{font-size:22px}.gx-h b{display:block;font-size:15px}.gx-h span{display:block;font-size:12.5px;opacity:.75}" +
    ".gx-b{display:flex;margin-top:10px;border:1px solid rgba(127,127,127,.35);border-radius:12px;overflow:hidden}.gx-b>*{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:6px 4px;border:0;background:rgba(255,255,255,.55);font:inherit;font-weight:800;font-size:13px;color:inherit;text-decoration:none;cursor:pointer;white-space:nowrap}" +
    ".gx-b>*+*{border-inline-start:1px solid rgba(127,127,127,.35)}.gx-b svg{width:18px;height:18px;border-radius:5px;flex:none}.gx-b .on{background:#1F8457;color:#fff}" +
    ".gx-x{margin-top:8px;display:flex;flex-direction:column;gap:0;border:1px solid rgba(127,127,127,.35);border-radius:12px;overflow:hidden;animation:gxg .2s ease-out}.gx-x>*{border:0;background:rgba(255,255,255,.7);font:inherit;font-weight:700;font-size:14px;color:inherit;padding:11px 12px;text-align:start;cursor:pointer}.gx-x>*+*{border-top:1px solid rgba(127,127,127,.3)}" +
    ".gx-st{font-size:13px;font-weight:700;margin-top:6px;min-height:18px}@keyframes gxg{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}" +
    "@media (prefers-color-scheme: dark){.gx-b>*,.gx-x>*{background:rgba(0,0,0,.25)}}";
  document.head.appendChild(css);

  function toWebp(file, maxW) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var w = im.naturalWidth, h = im.naturalHeight, s = Math.min(1, (maxW || 1600) / w);
        var c = document.createElement("canvas"); c.width = Math.round(w * s); c.height = Math.round(h * s);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        var q = 0.86, d = c.toDataURL("image/webp", q);
        var mime = /^data:image\/webp/.test(d) ? "image/webp" : "image/jpeg";
        if (mime === "image/jpeg") d = c.toDataURL("image/jpeg", q);
        while (d.length > 2.6e6 && q > 0.5) { q -= 0.1; d = c.toDataURL(mime, q); }
        res({ data: d.split(",")[1], mime: mime, w: c.width, h: c.height });
      };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error("לא הצלחתי לקרוא את התמונה")); };
      im.src = u;
    });
  }

  function slot(el, def, o) {
    o = o || {}; def = def || {};
    var have = !!o.have, open = false;
    function draw() {
      el.innerHTML = '<div class="gx' + (have ? " have" : "") + '"><div class="gx-h"><span class="e">' + (have ? "✓" : "🎨") + '</span><div><b>' + esc(have ? "הגרפיקה משולבת" : (def.label || "גרפיקה בדרך")) + "</b><span>" +
        esc((def.file || "") + " · " + (def.ratio || "") + " · " + (def.w || "") + "×" + (def.h || "")) + '</span></div></div>' +
        '<div class="gx-b"><button type="button" data-a="copy">📋 פרומפט</button><a href="' + GPT_CHAT + '" target="_blank" rel="noopener">' + GPT_LOGO + "ChatGPT</a>" +
        '<button type="button" data-a="ready"' + (open ? ' class="on"' : "") + ">" + (have ? "🔄 להחליף" : "✓ מוכנה, לשלב") + "</button></div>" +
        (open ? '<div class="gx-x"><button type="button" data-a="up">📱 להעלות מהטלפון או מהמחשב</button><button type="button" data-a="drive">☁️ שמרתי ב-Drive (תיקיית Graphics), שלבו משם</button></div>' : "") +
        '<div class="gx-st" aria-live="polite"></div><input type="file" accept="image/*" hidden></div>';
      var st = el.querySelector(".gx-st"), inp = el.querySelector("input");
      el.querySelector('[data-a="copy"]').onclick = function () {
        var t = def.prompt || ""; var ok = function () { st.textContent = "✓ הפרומפט הועתק. הדבק ב-ChatGPT"; };
        if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok, function () { prompt("העתק:", t); }); else prompt("העתק:", t);
      };
      el.querySelector('[data-a="ready"]').onclick = function () { open = !open; draw(); };
      var up = el.querySelector('[data-a="up"]'), dr = el.querySelector('[data-a="drive"]');
      if (up) up.onclick = function () { inp.click(); };
      inp.onchange = function () {
        var f = inp.files && inp.files[0]; if (!f) return; st.textContent = "מעלה…";
        toWebp(f, def.w || 1600).then(function (r) {
          return rpc("sq_gfx_put", { p_id: def.id, p_data: r.data, p_mime: r.mime, p_w: r.w, p_h: r.h, p_src: "upload" }).then(function (n) {
            if (n !== 1) throw new Error(n === -1 ? "צריך להיכנס ל-Side Quests קודם" : n === -3 ? "התמונה גדולה מדי" : "השמירה נכשלה");
            have = true; open = false; draw(); el.querySelector(".gx-st").textContent = "✓ שולב"; o.onDone && o.onDone();
          });
        }).catch(function (e) { st.textContent = "✕ " + e.message; });
      };
      if (dr) dr.onclick = function () {
        if (!o.db) { st.textContent = "✕ אין חיבור"; return; }
        var id = "gfx-" + def.id + "-" + Date.now().toString(36), now = new Date().toISOString();
        o.db.collection("instructions").doc(id).set({ kind: "gfx_drive", slot: def.id, file: def.file || "", via: "gfx", at: now, status: "pending",
          text: "לשלב גרפיקה: הקובץ " + (def.file || "") + " מתיקיית Graphics ב-Drive, לפלייסהולדר " + def.id + " (sq_gfx_put, ברוחב " + (def.w || 1600) + ", webp)." })
          .then(function () { open = false; draw(); el.querySelector(".gx-st").textContent = "✓ בתור. ישולב בריצה הקרובה (עד שעה)"; }, function (e) { st.textContent = "✕ " + e.message; });
      };
    }
    draw();
  }

  function get(ids) { ids = (ids || []).filter(Boolean); if (!ids.length) return Promise.resolve({}); return rpc("sq_gfx_get", { p_ids: ids }).then(function (j) { return (j && j.gfx) || {}; }, function () { return {}; }); }
  window.SQGfx = { slot: slot, get: get, GPT_CHAT: GPT_CHAT, GPT_LOGO: GPT_LOGO };
})();
