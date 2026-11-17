// "מה יש בנטפליקס?" (Oren 17.11.2026). Reads the daily public catalog built by the nf-catalog Edge Function
// (FrameHorizon Supabase project) and filters it on the device. Personal marks live only on this device.
// Storage keys: nf_wl (watchlist), nf_seen (seen), nf_f (filters), nf_taste, nf_op (last change time per mark, for sync),
// nf_sync (sync code), nf_f_at / nf_taste_at.
(function () {
  "use strict";
  const CAT_URL = "https://kvdgesrllikgwtuttrpb.supabase.co/storage/v1/object/public/nf-public/catalog.json";
  const IMG = "https://image.tmdb.org/t/p/w185";
  const GEN = [["act", "💥 פעולה"], ["com", "😂 קומדיה"], ["dra", "🎭 דרמה"], ["rom", "💕 רומנטי"], ["thr", "🔪 מתח ופשע"], ["scf", "🚀 מד״ב ופנטזיה"],
    ["hor", "👻 אימה"], ["doc", "🎥 דוקו"], ["ani", "✏️ אנימציה"], ["fam", "🧸 משפחה"], ["rea", "📺 ריאליטי"]];
  const RATES = [0, 6, 7, 7.5, 8, 8.5, 9];
  const MIN_VOTES = 1000, PAGE = 45, NEW_DAYS = 14;
  const TASTES = window.NF_TASTES || {};
  const TOPS = { il: { name: "טופ ישראל", icon: "🇮🇱", sub: "מה שהיה בטופ 10 של נטפליקס ישראל בשנה האחרונה" },
    w: { name: "טופ עולמי", icon: "🌍", sub: "מה שהיה בטופ 10 העולמי של נטפליקס בשנה האחרונה" } };
  const $ = (id) => document.getElementById(id);
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const h = (tag, attrs, ...kids) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue;
      if (k === "class") e.className = v; else if (k === "html") e.innerHTML = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v); }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    return e; };
  const fmt = (n) => Number(n).toLocaleString("he-IL");

  const qs = new URLSearchParams(location.search);
  if (qs.get("embed") === "1") document.body.classList.add("embed");

  let cat = null, items = [], minF = "";
  let F = Object.assign({ t: "s", g: [], il: "all", nf: false, r: 0, sort: "r", dir: -1, sub: "all" }, ls.get("nf_f", {}));
  const foreign = (x) => !!x.ol && x.ol !== "he"; // original language other than English/Hebrew (ol is absent for English)
  let taste = ls.get("nf_taste", "all");
  let wl = ls.get("nf_wl", {}), seen = ls.get("nf_seen", {});
  let tab = "find", shown = 0, list = [], q = "";
  let op = Object.assign({ wl: {}, seen: {} }, ls.get("nf_op", {})), fAt = ls.get("nf_f_at", 0), tAt = ls.get("nf_taste_at", 0);
  const setMark = (kind, id, v) => { const m = kind === "wl" ? wl : seen; if (v) m[id] = v; else delete m[id];
    op[kind][id] = Date.now(); ls.set(kind === "wl" ? "nf_wl" : "nf_seen", m); ls.set("nf_op", op); sync.soon(); };

  // ---------- filters ----------
  // Taste seeding (Oren 17.11.2026): a profile can carry what its owner already saw (seenM "title|year", seenS) and
  // series they want (wantS). Picking the profile marks matches once per item on this device (nf_seed_<id>), so an
  // un-mark sticks and titles that reach Netflix later get marked on a later load.
  const nz = (s) => String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
  function seedTaste(id) {
    const p = TASTES[id];
    if (!p || !items.length || !(p.seenM || p.seenS || p.wantS)) return 0;
    const done = ls.get("nf_seed_" + id, {}), now = Date.now();
    const M = new Map(), S = new Set(p.seenS || []), W = new Set(p.wantS || []);
    for (const t of p.seenM || []) { const [n, y] = t.split("|"); M.set(n, +y); }
    let n = 0;
    for (const x of items) {
      if (done[x.k]) continue;
      const k = nz(x.n);
      let to = null;
      if (x.k[0] === "m") { if (M.has(k) && Math.abs((+x.y || 0) - M.get(k)) <= 1) to = "seen"; }
      else if (S.has(k)) to = "seen"; else if (W.has(k)) to = "wl";
      if (!to) continue;
      done[x.k] = 1; n++;
      // seeded marks get op 1 (oldest), so any real change synced from another place wins over them
      if (to === "seen") { if (!seen[x.k]) { seen[x.k] = now; op.seen[x.k] = op.seen[x.k] || 1; } }
      else if (!seen[x.k] && !wl[x.k]) { wl[x.k] = now; op.wl[x.k] = op.wl[x.k] || 1; }
    }
    if (n) { ls.set("nf_seed_" + id, done); ls.set("nf_seen", seen); ls.set("nf_wl", wl); ls.set("nf_op", op); sync.soon(); }
    return n;
  }
  function tasteOk(x) {
    if (taste === "il") return !!x.til;
    if (taste === "w") return !!x.tw;
    const p = TASTES[taste];
    if (!p || p.pending) return true;
    if (x.im && (p.block || []).includes(x.im)) return false;
    if (x.im && (p.boost || []).includes(x.im)) return true;
    if ((p.avoid || []).some((g) => x.g.includes(g))) return false;
    if ((p.like || []).length && !p.like.some((g) => x.g.includes(g))) return false;
    return true;
  }
  // a rating counts only with enough IMDb votes worldwide (Oren 17.11.2026); below that it shows "N/A" and sorts last
  const okR = (x) => !!x.r && (x.il || (x.v || 0) >= MIN_VOTES); // Israeli titles are niche: no vote minimum
  const rated = (x, r) => !r || (okR(x) && x.r >= r);
  function baseList() { // everything except the rating step
    return items.filter((x) => x.k[0] === F.t && !seen[x.k] && tasteOk(x)
      && (!F.g.length || F.g.some((g) => x.g.includes(g)))
      && (F.il === "all" || (F.il === "only" ? x.il : !x.il)) && (!F.nf || !foreign(x)));
  }
  function sortList(a) {
    const isTop = taste === "il" || taste === "w";
    const sc = (x) => (okR(x) ? x.r : -1);
    const by = { r: (x, y) => sc(y) - sc(x) || (y.v || 0) - (x.v || 0),
      new: (x, y) => (y.f || "").localeCompare(x.f || "") || (y.pop || 0) - (x.pop || 0),
      pop: (x, y) => (y.v || 0) - (x.v || 0) || (y.pop || 0) - (x.pop || 0) }; // popular = most IMDb votes
    const d = F.dir === 1 ? -1 : 1; // dir -1 = best/newest/most popular first (default), 1 = reversed
    if (isTop && F.sort === "pop") return a.sort((x, y) => { const k = taste === "il" ? "til" : "tw"; return d * ((y[k][0] - x[k][0]) || (x[k][1] - y[k][1])); });
    const f = by[F.sort] || by.r;
    return a.sort((x, y) => d * f(x, y));
  }
  const qn = (s) => String(s || "").toLowerCase().replace(/[\u0591-\u05C7]/g, "").replace(/[^a-z0-9\u05d0-\u05ea]/g, "");
  const isNew = (x) => minF && x.f > minF && (Date.now() - Date.parse(x.f)) < NEW_DAYS * 864e5;

  // ---------- render ----------
  function segSet(id, val) { for (const b of $(id).querySelectorAll("button")) b.classList.toggle("on", b.dataset.v === String(val)); }
  function renderFilters() {
    segSet("fType", F.t); segSet("fIl", F.il); segSet("fSort", F.sort); segSet("fSub", F.sub);
    $("fNf").classList.toggle("on", !F.nf); $("fNf").setAttribute("aria-checked", F.nf ? "false" : "true"); // switch on = foreign languages shown
    for (const b of $("fSort").children) b.querySelector("i").textContent = b.dataset.v !== F.sort ? "↕" : F.dir === 1 ? "↑" : "↓";
    const fg = $("fGen");
    if (!fg.children.length) {
      fg.append(h("button", { type: "button", "data-v": "" }, "הכול"));
      for (const [k, l] of GEN) fg.append(h("button", { type: "button", "data-v": k }, l));
    }
    for (const b of fg.children) b.classList.toggle("on", b.dataset.v ? F.g.includes(b.dataset.v) : !F.g.length);
  }
  function renderRates(base) {
    const fr = $("fRate");
    if (!fr.children.length) for (const r of RATES) fr.append(h("button", { type: "button", "data-v": r }, h("b", null, r ? r + "+" : "הכול"), h("small", null, "")));
    for (const b of fr.children) {
      const r = Number(b.dataset.v), n = base.filter((x) => rated(x, r)).length;
      b.querySelector("small").textContent = fmt(n);
      b.classList.toggle("on", r === F.r);
      b.classList.toggle("in", r > 0 && r < F.r);
    }
  }
  function oscTxt(x) { const n = (x.oc || []).length || 1; return "🏆 " + (n > 1 ? n + " Oscars" : "Oscar"); }
  function card(x) {
    const url = x.im ? "https://www.imdb.com/title/" + x.im + "/" : "https://www.themoviedb.org/" + (x.k[0] === "m" ? "movie/" : "tv/") + x.k.slice(1);
    const post = h("div", { class: "post" },
      x.p ? h("img", { src: IMG + x.p, alt: "", loading: "lazy", decoding: "async" }) : h("div", { class: "noimg" }, x.n),
      x.r ? h("span", { class: "imdb" + (okR(x) ? "" : " na"), title: okR(x) ? null : fmt(x.v || 0) + " הצבעות בלבד" }, "IMDb " + (okR(x) ? x.r.toFixed(1) : "N/A")) : null,
      x.os ? h("span", { class: "osc" + (x.os === 2 ? " g" : "") + (x.r ? "" : " top"), title: (x.oc || []).join(", ") }, oscTxt(x)) : null,
      isNew(x) ? h("span", { class: "newb" }, "חדש") : null,
      taste === "il" && x.til ? h("span", { class: "topb" }, "טופ 10 · " + x.til[0] + " שב׳") : taste === "w" && x.tw ? h("span", { class: "topb" }, "טופ 10 · " + x.tw[0] + " שב׳") : null);
    let meta;
    if (x.k[0] === "s") {
      meta = [x.s ? x.s + (x.s === 1 ? " עונה" : " עונות") + (x.e ? " · " + x.e + " פרקים" : "") : (x.y || "")];
    } else meta = [x.y || ""];
    const wlB = h("button", { type: "button", class: "wl" + (wl[x.k] ? " on" : ""), "aria-label": "לרשימה שלי", onclick: () => toggle("wl", x, wlB) }, "🔖");
    const seenB = h("button", { type: "button", class: seen[x.k] ? "on" : "", "aria-label": "ראיתי", onclick: () => toggle("seen", x, seenB) }, "✓");
    return h("div", { class: "card", "data-k": x.k },
      h("a", { href: url, target: "_blank", rel: "noopener" }, post, h("div", { class: "nm" }, x.n), h("div", { class: "hn" }, x.hn && x.hn !== x.n ? x.hn : "\u00a0"), h("div", { class: "sm" }, meta[0])),
      meta[1] || null,
      h("div", { class: "acts" }, wlB, seenB));
  }
  function more() {
    const g = $("grid"), end = Math.min(list.length, shown + PAGE);
    for (let i = shown; i < end; i++) g.append(card(list[i]));
    shown = end;
    $("more").textContent = shown < list.length ? "עוד " + fmt(list.length - shown) + "…" : "";
  }
  function render() {
    if (!cat) return;
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    $("wlN").textContent = Object.keys(wl).filter((k) => !seen[k]).length;
    $("seenN").textContent = items.filter((x) => seen[x.k]).length;
    $("filters").hidden = tab !== "find" || !!q;
    $("fSub").hidden = tab === "find" || !!q;
    $("ach").hidden = tab !== "seen" || !!q;
    renderFilters();
    const g = $("grid"); g.replaceChildren(); shown = 0;
    if (q) {
      // search by name, Hebrew or English, across the whole catalog (Oren 17.11.2026)
      const nq = qn(q), hit = [];
      for (const x of items) { const a = qn(x.n), b = qn(x.hn);
        const s = a === nq || b === nq ? 3 : a.startsWith(nq) || b.startsWith(nq) ? 2 : a.includes(nq) || b.includes(nq) ? 1 : 0;
        if (s) hit.push([s, x]); }
      list = hit.sort((a, b) => b[0] - a[0] || (b[1].v || 0) - (a[1].v || 0)).map((p) => p[1]);
      $("resN").replaceChildren(...(list.length === 1 ? ["תוצאה אחת"] : [h("b", null, fmt(list.length)), " תוצאות"]));
      if (!list.length) g.append(h("div", { class: "empty" }, "״" + q + "״ לא נמצא בנטפליקס ישראל."));
    } else if (tab !== "find") {
      // watchlist / seen, with a movies-series sub filter (Oren 17.11.2026)
      const m = tab === "wl" ? wl : seen;
      const all = items.filter((x) => m[x.k] && (tab === "seen" || !seen[x.k]));
      const nS = all.filter((x) => x.k[0] === "s").length;
      const cnt = { all: all.length, s: nS, m: all.length - nS };
      for (const b of $("fSub").children) b.querySelector(".cnt").textContent = fmt(cnt[b.dataset.v]);
      list = all.filter((x) => F.sub === "all" || x.k[0] === F.sub).sort((a, b) => (m[b.k] || 0) - (m[a.k] || 0));
      const what = F.sub === "s" ? " סדרות" : F.sub === "m" ? " סרטים" : "";
      $("resN").replaceChildren(h("b", null, fmt(list.length)), what + (tab === "wl" ? " ברשימה שלי" : " שראיתי"));
      if (tab === "seen") renderAch(all, nS);
      if (!list.length) g.append(h("div", { class: "empty" }, tab === "wl" ? "הרשימה ריקה. סמנו 🔖 על מה שבא לכם לראות." : "עוד לא סימנתם כלום. ✓ על כרטיס מעביר אותו לכאן."));
    } else {
      const base = baseList();
      renderRates(base);
      list = sortList(base.filter((x) => rated(x, F.r)));
      const all = items.filter((x) => x.k[0] === F.t && !seen[x.k]).length;
      $("resN").replaceChildren(h("b", null, fmt(list.length)), " מתוך " + fmt(all) + (F.t === "s" ? " סדרות" : " סרטים"));
      if (!list.length) g.append(h("div", { class: "empty" }, "אין תוצאות. נסו להוריד את הציון או להוסיף ז׳אנר."));
    }
    $("fSort").style.visibility = tab === "find" && !q ? "visible" : "hidden";
    more();
    renderTasteNote();
  }
  // "ראיתי" as an achievements board (Oren 17.11.2026)
  function renderAch(all, nS) {
    const rs = all.filter(okR), avg = rs.length ? rs.reduce((a, x) => a + x.r, 0) / rs.length : 0;
    const osc = all.reduce((a, x) => a + (x.os ? (x.oc || []).length || 1 : 0), 0);
    const pct = items.length ? Math.round((all.length / items.length) * 1000) / 10 : 0;
    $("ach").replaceChildren(
      h("div", { class: "h" }, "🏆 ההישגים שלי בנטפליקס", h("small", null, all.length ? "ראית " + fmt(all.length) + " מתוך " + fmt(items.length) + " כותרים בנטפליקס ישראל (" + pct + "%)" : "כל ✓ על כרטיס נכנס לכאן")),
      h("div", { class: "tiles" },
        h("div", null, h("b", null, fmt(nS)), h("small", null, "📺 סדרות")),
        h("div", null, h("b", null, fmt(all.length - nS)), h("small", null, "🎬 סרטים")),
        h("div", null, h("b", null, avg ? avg.toFixed(1) : "–"), h("small", null, "⭐ IMDb ממוצע")),
        h("div", null, h("b", null, fmt(osc)), h("small", null, "🏆 אוסקרים"))));
  }
  function renderTasteNote() {
    const n = $("tasteNote"), p = TASTES[taste];
    if (p && p.pending) { n.hidden = false; n.textContent = p.icon + " " + p.name + ": עוד אין רשימה, אז מוצג הכול."; }
    else if (TOPS[taste]) { n.hidden = false; n.textContent = TOPS[taste].icon + " מציג רק את " + TOPS[taste].name + ". אפשר לשנות ב-⚙️."; }
    else n.hidden = true;
  }

  // ---------- marks (watchlist / seen) ----------
  let toastT = null;
  function toast(msg, undo) {
    const t = $("toast"); clearTimeout(toastT);
    t.replaceChildren(h("span", null, msg), undo ? h("button", { type: "button", onclick: () => { undo(); t.hidden = true; } }, "בטל") : null);
    t.hidden = false; toastT = setTimeout(() => { t.hidden = true; }, 5000);
  }
  function toggle(kind, x, btn) {
    const m = kind === "wl" ? wl : seen;
    const was = m[x.k];
    setMark(kind, x.k, was ? 0 : Date.now());
    btn.classList.toggle("on", !was);
    $("wlN").textContent = Object.keys(wl).filter((k) => !seen[k]).length;
    $("seenN").textContent = items.filter((x) => seen[x.k]).length;
    const undo = () => { setMark(kind, x.k, was || 0); render(); };
    if (kind === "seen" && !was) {
      // the button stays put; the card fades and leaves after a moment
      const c = btn.closest(".card"); c.style.transition = "opacity .6s"; c.style.opacity = ".35";
      setTimeout(() => { if (seen[x.k]) render(); }, 900);
      toast("✓ " + x.n + " עבר ל״ראיתי״", undo);
    } else if (kind === "wl") toast(was ? "הוסר מהרשימה" : "🔖 נוסף לרשימה שלי", undo);
    else if (kind === "seen" && was) {
      if (tab === "seen") { const c = btn.closest(".card"); c.style.transition = "opacity .6s"; c.style.opacity = ".35"; }
      toast("חזר לרשימות", undo); setTimeout(() => { if (!seen[x.k]) render(); }, tab === "seen" ? 900 : 500);
    }
  }

  // ---------- sheets ----------
  function sheet(title, body) { $("ovT").textContent = title; $("ovB").replaceChildren(...body); $("ov").hidden = false; }
  function closeSheet() { $("ov").hidden = true; }
  function settings() {
    const opts = [["all", "🍿", "בלי העדפה", "כל מה שיש בנטפליקס ישראל"]];
    for (const [k, p] of Object.entries(TASTES)) opts.push([k, p.icon, p.name, p.pending ? "בקרוב: מחכה לרשימת האהובים" : "לפי מה שאהבת ומה לא"]);
    for (const [k, p] of Object.entries(TOPS)) opts.push([k, p.icon, p.name, p.sub]);
    const box = h("div", { class: "opt" }, opts.map(([k, e, n, s]) => h("button", { type: "button", class: taste === k ? "on" : "",
      onclick: (ev) => { taste = k; ls.set("nf_taste", k); tAt = Date.now(); ls.set("nf_taste_at", tAt); seedTaste(k); sync.soon(); for (const b of box.children) b.classList.remove("on"); ev.currentTarget.classList.add("on"); render(); } },
      h("span", { class: "e" }, e), h("span", null, n, h("small", null, s)))));
    const pub = "https://tipul10000-droid.github.io/apps/netflix-il/";
    sheet("⚙️ הגדרות", [
      h("div", { class: "h3" }, "העדפה"), box,
      h("div", { class: "h3" }, "לשתף"),
      h("button", { type: "button", class: "btn", onclick: async () => {
        try { if (navigator.share) await navigator.share({ title: "מה בנטפליקס?", url: pub }); else { await navigator.clipboard.writeText(pub); toast("הקישור הועתק"); } } catch (e) {} } }, "🔗 לשתף את האפליקציה"),
      h("div", { class: "h3" }, "🔗 סנכרון"), sync.box(),
      h("div", { class: "h3" }, "מאיפה הנתונים"),
      h("p", { class: "note" }, "מה זמין בנטפליקס ישראל: JustWatch דרך TMDB. ציונים: הנתונים הרשמיים של IMDb (ציון נחשב רק מ-" + fmt(MIN_VOTES) + " הצבעות בעולם; פחות מזה מוצג IMDb N/A ויורד לסוף; לתוכן ישראלי אין מינימום). פופולרי = הכי הרבה הצבעות ב-IMDb. אוסקר: מספר הזכיות בכל הקטגוריות לפי Wikidata (🏆 זהב = זכה גם בסרט הטוב ביותר). ״בלי שפות זרות״ = רק כותרים שהשפה המקורית שלהם אנגלית או עברית. טופ 10: הטבלאות הרשמיות של נטפליקס."),
      cat ? h("p", { class: "note" }, "עודכן: " + new Date(cat.at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })) : null,
      h("button", { type: "button", class: "btn", onclick: closeSheet }, "✓ סגור"),
    ]);
  }
  // ---------- sync (Oren 17.11.2026) ----------
  // Every iOS home-screen app has its own storage, so the app inside Side Quests and the home-screen icon held two
  // different lists. An 8-char code (made in one place, typed in the other) keys one row in nf_sync (FrameHorizon
  // Supabase). Marks merge per title by the latest change (op); filters and taste by the latest choice.
  const sync = (() => {
    const SB = "https://kvdgesrllikgwtuttrpb.supabase.co/rest/v1/rpc/",
      ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZGdlc3JsbGlrZ3d0dXR0cnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMjM1MzYsImV4cCI6MjEwMjg5OTUzNn0.DfhlDUv443df9RdYnDr8aNmGpOmHBRHE0wKgABzaCUg";
    let code = ls.get("nf_sync", ""), t = null, busy = null, last = ls.get("nf_sync_at", 0), host = null;
    const rpc = async (fn, args) => { const r = await fetch(SB + fn, { method: "POST", headers: { apikey: ANON, Authorization: "Bearer " + ANON,
      "Content-Type": "application/json" }, body: JSON.stringify(args) }); if (!r.ok) throw new Error(r.status); return r.json(); };
    const seeds = () => { const o = {}; for (const k of Object.keys(TASTES)) { const v = ls.get("nf_seed_" + k, null); if (v) o[k] = v; } return o; };
    const snap = () => ({ v: 1, wl, seen, op, seed: seeds(), F, fAt, taste, tAt });
    function mergeKind(kind, R) {
      const L = kind === "wl" ? wl : seen, rm = (R && R[kind]) || {}, ro = (R && R.op && R.op[kind]) || {}; let ch = false;
      for (const id of new Set([...Object.keys(rm), ...Object.keys(ro)])) {
        const lt = op[kind][id] || L[id] || 0, rt = ro[id] || rm[id] || 0;
        if (rt <= lt) continue;
        if (rm[id]) { if (L[id] !== rm[id]) { L[id] = rm[id]; ch = true; } } else if (L[id]) { delete L[id]; ch = true; }
        op[kind][id] = rt;
      }
      return ch;
    }
    function merge(R) {
      let ch = mergeKind("wl", R) | mergeKind("seen", R);
      for (const [k, v] of Object.entries(R.seed || {})) { const d = ls.get("nf_seed_" + k, {}); let n = 0;
        for (const id of Object.keys(v)) if (!d[id]) { d[id] = 1; n++; } if (n) ls.set("nf_seed_" + k, d); }
      if ((R.fAt || 0) > fAt && R.F) { F = Object.assign(F, R.F); fAt = R.fAt; ch = true; }
      if ((R.tAt || 0) > tAt && R.taste) { taste = R.taste; tAt = R.tAt; ch = true; }
      ls.set("nf_wl", wl); ls.set("nf_seen", seen); ls.set("nf_op", op); ls.set("nf_f", F); ls.set("nf_f_at", fAt); ls.set("nf_taste", taste); ls.set("nf_taste_at", tAt);
      return !!ch;
    }
    function now() {
      if (!code) return Promise.resolve(false);
      if (busy) return busy;
      busy = (async () => {
        try {
          const R = await rpc("nf_sync_get", { p_code: code });
          const ch = R ? merge(R) : false;
          if (ch && items.length) { seedTaste(taste); render(); }
          const s = snap();
          if (!R || JSON.stringify(s) !== JSON.stringify(R)) await rpc("nf_sync_put", { p_code: code, p_data: s });
          last = Date.now(); ls.set("nf_sync_at", last); paint();
          return true;
        } catch (e) { paint(true); return false; } finally { busy = null; }
      })();
      return busy;
    }
    const soon = () => { if (!code) return; clearTimeout(t); t = setTimeout(now, 1200); };
    const fmtCode = (c) => c.slice(0, 4) + "-" + c.slice(4);
    function paint(err) {
      if (!host || !host.isConnected) return;
      const st = host.querySelector(".sst");
      if (st) st.textContent = err ? "⚠️ אין חיבור, ינסה שוב" : last ? "✓ מסונכרן " + new Date(last).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "";
    }
    function box() {
      host = h("div", { class: "sync" }); draw(); return host;
    }
    function draw() {
      const row = h("div", { class: "srow" });
      const below = h("div", { class: "sbody" });
      if (code) {
        row.append(h("button", { type: "button", onclick: async () => { try { await navigator.clipboard.writeText(fmtCode(code)); toast("הקוד הועתק"); } catch (e) {} } }, "📋 העתק"),
          h("button", { type: "button", onclick: () => { code = ""; ls.set("nf_sync", ""); draw(); toast("הסנכרון כובה במכשיר הזה"); } }, "✕ ניתוק"));
        below.append(h("div", { class: "scode" }, fmtCode(code)), h("div", { class: "sst" }), h("p", { class: "note" }, "במקום השני: ⚙️ ← ״יש לי קוד״."));
      } else {
        row.append(h("button", { type: "button", onclick: async () => {
            const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = crypto.getRandomValues(new Uint8Array(8));
            code = Array.from(r, (b) => A[b % A.length]).join(""); ls.set("nf_sync", code); draw(); await now(); } }, "➕ קוד חדש"),
          h("button", { type: "button", onclick: () => { below.hidden = !below.hidden; if (!below.hidden) below.querySelector("input").focus({ preventScroll: true }); } }, "⌨️ יש לי קוד"));
        const inp = h("input", { type: "text", maxlength: "9", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", placeholder: "XXXX-XXXX", dir: "ltr" });
        const msg = h("div", { class: "sst" });
        below.hidden = true; below.classList.add("enter");
        below.append(h("div", { class: "sin" }, inp, h("button", { type: "button", class: "btn", onclick: async () => {
          const c = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
          if (c.length !== 8) { msg.textContent = "הקוד הוא 8 תווים"; return; }
          msg.textContent = "מתחבר…";
          try { const R = await rpc("nf_sync_get", { p_code: c }); if (!R) { msg.textContent = "לא מצאתי את הקוד"; return; } }
          catch (e) { msg.textContent = "⚠️ אין חיבור"; return; }
          code = c; ls.set("nf_sync", c); await now(); draw(); toast("✓ מסונכרן"); } }, "חיבור")), msg);
      }
      host.replaceChildren(row, below); paint();
    }
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") now(); });
    window.addEventListener("focus", () => now());
    return { now, soon, box };
  })();

  function about() {
    sheet("ⓘ אודות", [
      h("p", { class: "ab" }, "נטפליקס לא נותנת לסנן לפי ציון. כאן אפשר: כל מה שזמין בנטפליקס ישראל, עם ציון IMDb, אוסקרים וטופ 10, וסינון לפי ז׳אנר, תוכן ישראלי ושפה. שומרים לעצמכם ״הרשימה שלי״ ו״ראיתי״. חינם, בלי הרשמה, מתעדכן כל לילה."),
      h("div", { class: "cred" }, h("div", null, h("small", null, "רעיון ועיצוב"), "אורן יצחקי"), h("div", null, h("small", null, "קוד"), "Claude Code")),
      h("p", { class: "note" }, "הנתונים מ-JustWatch,\u200f TMDB,\u200f IMDb,\u200f Wikidata ו-Netflix Top 10.\u200f האפליקציה לא קשורה לנטפליקס."),
      h("button", { type: "button", class: "btn", onclick: closeSheet }, "✓ סגור"),
    ]);
  }

  // ---------- events ----------
  function bindSeg(id, key) { $(id).addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F[key] = b.dataset.v; save(); render(); }); }
  function save() { ls.set("nf_f", F); fAt = Date.now(); ls.set("nf_f_at", fAt); sync.soon(); }
  bindSeg("fType", "t"); bindSeg("fIl", "il"); bindSeg("fSub", "sub");
  $("fNf").addEventListener("click", () => { F.nf = !F.nf; save(); render(); });
  // sort: tap the active one again to reverse it (arrow shows the direction)
  $("fSort").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return;
    if (F.sort === b.dataset.v) F.dir = F.dir === 1 ? -1 : 1; else { F.sort = b.dataset.v; F.dir = -1; } save(); render(); });
  $("fGen").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const v = b.dataset.v;
    if (!v) F.g = []; else F.g = F.g.includes(v) ? F.g.filter((x) => x !== v) : [...F.g, v]; save(); render(); });
  $("fRate").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F.r = Number(b.dataset.v); save(); render(); });
  document.querySelector(".tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; tab = b.dataset.tab; render(); });
  $("setBtn").addEventListener("click", settings);
  $("infoBtn").addEventListener("click", about); $("aboutBtn").addEventListener("click", about);
  let qT = null;
  $("q").addEventListener("input", () => { clearTimeout(qT); qT = setTimeout(() => { q = $("q").value.trim(); $("qX").hidden = !q; render(); }, 180); });
  $("q").addEventListener("keydown", (e) => { if (e.key === "Enter") $("q").blur(); });
  $("qX").addEventListener("click", () => { $("q").value = ""; q = ""; $("qX").hidden = true; render(); });
  $("qBtn").addEventListener("click", () => {
    const on = !$("srchW").classList.contains("on");
    $("srchW").classList.toggle("on", on); $("qBtn").classList.toggle("on", on); $("qBtn").setAttribute("aria-expanded", on);
    if (on) $("q").focus({ preventScroll: true });
    else { $("q").blur(); if (q || $("q").value) { $("q").value = ""; q = ""; $("qX").hidden = true; render(); } }
  });
  // ↑ back to the top, shown once you scrolled a bit (Oren 17.11.2026)
  const tt = $("toTop");
  addEventListener("scroll", () => tt.classList.toggle("on", scrollY > 600), { passive: true });
  tt.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  $("ovX").addEventListener("click", closeSheet);
  $("ov").addEventListener("click", (e) => { if (e.target.id === "ov") closeSheet(); });
  new IntersectionObserver((es) => { if (es[0].isIntersecting && shown < list.length) more(); }, { rootMargin: "600px" }).observe($("more"));

  // ---------- load ----------
  async function load() {
    try {
      const r = await fetch(CAT_URL, { cache: "no-cache" });
      if (!r.ok) throw new Error(r.status);
      cat = await r.json(); items = cat.items || [];
      await sync.now(); // pull first, so marks un-done elsewhere aren't seeded back
      seedTaste(taste);
      minF = items.reduce((m, x) => (!m || (x.f && x.f < m) ? x.f : m), "");
      const ns = items.filter((x) => x.k[0] === "s").length;
      $("meta").replaceChildren(
        h("b", null, "נטפליקס ישראל · " + fmt(ns) + " סדרות · " + fmt(items.length - ns) + " סרטים"),
        h("span", null, "עודכן " + new Date(cat.at).toLocaleString("he-IL", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) + (cat.pending ? " · משלים " + fmt(cat.pending) + " כותרים…" : "")));
      render();
    } catch (e) {
      $("meta").textContent = "לא הצלחתי לטעון את הרשימה. בדקו חיבור ונסו שוב.";
    }
  }
  load();
})();
