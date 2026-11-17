// "מה יש בנטפליקס?" (Oren 17.11.2026). Reads the daily public catalog built by the nf-catalog Edge Function
// (FrameHorizon Supabase project) and filters it on the device. Personal marks live only on this device.
// Storage keys: nf_wl (watchlist), nf_seen (seen), nf_f (filters), nf_taste.
(function () {
  "use strict";
  const CAT_URL = "https://kvdgesrllikgwtuttrpb.supabase.co/storage/v1/object/public/nf-public/catalog.json";
  const IMG = "https://image.tmdb.org/t/p/w185";
  const GEN = [["act", "💥 פעולה"], ["com", "😂 קומדיה"], ["dra", "🎭 דרמה"], ["rom", "💕 רומנטי"], ["thr", "🔪 מתח ופשע"], ["scf", "🚀 מד״ב ופנטזיה"],
    ["hor", "👻 אימה"], ["doc", "🎥 דוקו"], ["ani", "✏️ אנימציה"], ["fam", "🧸 משפחה"], ["rea", "📺 ריאליטי"]];
  const RATES = [0, 6, 7, 7.5, 8, 8.5, 9];
  const MIN_VOTES = 1000, PAGE = 45, NEW_DAYS = 14;
  const TASTES = window.NF_TASTES || {};
  const TOPS = { il: { name: "הטופ של ישראל", icon: "🇮🇱", sub: "מה שהיה בטופ 10 של נטפליקס ישראל בשנה האחרונה" },
    w: { name: "הטופ העולמי", icon: "🌍", sub: "מה שהיה בטופ 10 העולמי של נטפליקס בשנה האחרונה" } };
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
  let tab = "find", shown = 0, list = [];

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
      if (to === "seen") seen[x.k] = seen[x.k] || now; else if (!seen[x.k]) wl[x.k] = wl[x.k] || now;
    }
    if (n) { ls.set("nf_seed_" + id, done); ls.set("nf_seen", seen); ls.set("nf_wl", wl); }
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
  const okR = (x) => !!x.r && (x.v || 0) >= MIN_VOTES;
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
    $("filters").hidden = tab !== "find";
    $("fSub").hidden = tab === "find";
    $("ach").hidden = tab !== "seen";
    renderFilters();
    const g = $("grid"); g.replaceChildren(); shown = 0;
    if (tab !== "find") {
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
    $("fSort").style.visibility = tab === "find" ? "visible" : "hidden";
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
    if (p && p.pending) { n.hidden = false; n.textContent = p.icon + " " + p.name + " עוד לא הוגדר, אז מוצג הכול. שלחו רשימה של מה שאהבתם ומה לא."; }
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
    const m = kind === "wl" ? wl : seen, key = kind === "wl" ? "nf_wl" : "nf_seen";
    const was = m[x.k];
    if (was) delete m[x.k]; else m[x.k] = Date.now();
    ls.set(key, m);
    btn.classList.toggle("on", !was);
    $("wlN").textContent = Object.keys(wl).filter((k) => !seen[k]).length;
    $("seenN").textContent = items.filter((x) => seen[x.k]).length;
    const undo = () => { if (was) m[x.k] = was; else delete m[x.k]; ls.set(key, m); render(); };
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
    const opts = [["all", "🍿", "בלי טעם", "כל מה שיש בנטפליקס ישראל"]];
    for (const [k, p] of Object.entries(TASTES)) opts.push([k, p.icon, p.name, p.pending ? "בקרוב: מחכה לרשימת האהובים" : "לפי מה שאהבת ומה לא"]);
    for (const [k, p] of Object.entries(TOPS)) opts.push([k, p.icon, p.name, p.sub]);
    const box = h("div", { class: "opt" }, opts.map(([k, e, n, s]) => h("button", { type: "button", class: taste === k ? "on" : "",
      onclick: (ev) => { taste = k; ls.set("nf_taste", k); seedTaste(k); for (const b of box.children) b.classList.remove("on"); ev.currentTarget.classList.add("on"); render(); } },
      h("span", { class: "e" }, e), h("span", null, n, h("small", null, s)))));
    const pub = "https://tipul10000-droid.github.io/apps/netflix-il/";
    sheet("⚙️ הגדרות", [
      h("div", { class: "h3" }, "הטעם שלי"), box,
      h("div", { class: "h3" }, "לשתף"),
      h("button", { type: "button", class: "btn", onclick: async () => {
        try { if (navigator.share) await navigator.share({ title: "מה בנטפליקס?", url: pub }); else { await navigator.clipboard.writeText(pub); toast("הקישור הועתק"); } } catch (e) {} } }, "🔗 לשתף את האפליקציה"),
      h("p", { class: "note" }, "הרשימה שלי ו״ראיתי״ נשמרים רק במכשיר הזה."),
      h("div", { class: "h3" }, "מאיפה הנתונים"),
      h("p", { class: "note" }, "מה זמין בנטפליקס ישראל: JustWatch דרך TMDB. ציונים: הנתונים הרשמיים של IMDb (ציון נחשב רק מ-" + fmt(MIN_VOTES) + " הצבעות בעולם; פחות מזה מוצג IMDb N/A ויורד לסוף). פופולרי = הכי הרבה הצבעות ב-IMDb. אוסקר: מספר הזכיות בכל הקטגוריות לפי Wikidata (🏆 זהב = זכה גם בסרט הטוב ביותר). ״בלי שפות זרות״ = רק כותרים שהשפה המקורית שלהם אנגלית או עברית. טופ 10: הטבלאות הרשמיות של נטפליקס."),
      cat ? h("p", { class: "note" }, "עודכן: " + new Date(cat.at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })) : null,
      h("button", { type: "button", class: "btn", onclick: closeSheet }, "✓ סגור"),
    ]);
  }
  // ---------- events ----------
  function bindSeg(id, key) { $(id).addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F[key] = b.dataset.v; save(); render(); }); }
  function save() { ls.set("nf_f", F); }
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
  $("ovX").addEventListener("click", closeSheet);
  $("ov").addEventListener("click", (e) => { if (e.target.id === "ov") closeSheet(); });
  new IntersectionObserver((es) => { if (es[0].isIntersecting && shown < list.length) more(); }, { rootMargin: "600px" }).observe($("more"));

  // ---------- load ----------
  async function load() {
    try {
      const r = await fetch(CAT_URL, { cache: "no-cache" });
      if (!r.ok) throw new Error(r.status);
      cat = await r.json(); items = cat.items || [];
      seedTaste(taste);
      minF = items.reduce((m, x) => (!m || (x.f && x.f < m) ? x.f : m), "");
      const ns = items.filter((x) => x.k[0] === "s").length;
      $("meta").textContent = "נטפליקס ישראל 🇮🇱\u200f · " + fmt(ns) + " סדרות · " + fmt(items.length - ns) + " סרטים · עודכן " +
        new Date(cat.at).toLocaleString("he-IL", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) + (cat.pending ? " · משלים " + fmt(cat.pending) + " כותרים…" : "");
      render();
    } catch (e) {
      $("meta").textContent = "לא הצלחתי לטעון את הרשימה. בדקו חיבור ונסו שוב.";
    }
  }
  load();
})();
