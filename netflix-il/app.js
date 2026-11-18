// "מה יש בנטפליקס?" (Oren 17.11.2026). Reads the daily public catalog built by the nf-catalog Edge Function
// (FrameHorizon Supabase project) and filters it on the device. Personal marks live only on this device.
// Storage keys: nf_wl (watchlist), nf_seen (seen), nf_f (filters), nf_taste, nf_op (last change time per mark, for sync),
// nf_sync (sync code), nf_f_at / nf_taste_at, nf_dev (random device id for the 15-device cap, gate.sql).
(function () {
  "use strict";
  const CAT_URL = "https://kvdgesrllikgwtuttrpb.supabase.co/storage/v1/object/public/nf-public/catalog.json";
  const IMG = "https://image.tmdb.org/t/p/w185";
  // One-colour line icons instead of emoji (Oren 17.11.2026: no emoji in the app except the Israeli flag).
  // HTML places them with <span class="ic" data-i="name">, code with ic("name").
  const ICO = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    bookmark: '<path d="M6 3.5h12V21l-6-4.2L6 21z"/>',
    trophy: '<path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4m8-4h3a3 3 0 0 1-3 4m-4 4v4m-4 2h8"/>',
    tv: '<rect x="3" y="6.5" width="18" height="13" rx="2"/><path d="m8.5 2.5 3.5 4 3.5-4"/>',
    film: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M8 3.5v17m8-17v17M3.5 9H8m-4.5 6H8m8-6h4.5M16 15h4.5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    star: '<path d="m12 3.2 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8m2 2.8a6 6 0 0 1 3.5 5.8"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    sync: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 3v5h5M4 13a8 8 0 0 0 14.3 4.9L20 16m0 5v-5h-5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    keys: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9"/>',
    alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5m0 2.5h.01"/>',
    all: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M7 10H5.5v10.5h13V10H17"/>',
    dots: '<circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
  };
  const icHTML = (n) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICO[n] || "") + "</svg>";
  const ic = (n) => ICO[n] ? h("span", { class: "ic", html: icHTML(n) }) : h("span", { class: "ic t" }, n || ""); // non-icon = text (the flag)
  for (const el of document.querySelectorAll(".ic[data-i]")) el.innerHTML = icHTML(el.dataset.i);
  // genres = TMDB's own genres, the 12 with the most titles on Netflix Israel, separately for movies and series,
  // most titles first (Oren 18.11.2026; counted 18.11.2026). TMDB has no Romance/Horror for series at all.
  const GEN = {
    m: [[35, "קומדיה"], [18, "דרמה"], [10749, "רומנטי"], [53, "מותחן"], [28, "אקשן"], [99, "דוקומנטרי"], [80, "פשע"],
      [10751, "משפחה"], [12, "הרפתקאות"], [16, "אנימציה"], [14, "פנטזיה"], [27, "אימה"]],
    s: [[18, "דרמה"], [35, "קומדיה"], [80, "פשע"], [99, "דוקומנטרי"], [16, "אנימציה"], [10765, "מד״ב ופנטזיה"], [9648, "מסתורין"],
      [10764, "ריאליטי"], [10759, "אקשן והרפתקה"], [10762, "ילדים"], [10751, "משפחה"], [10767, "אירוח"]],
  };
  const gSel = () => { const ok = new Set(GEN[F.t].map((x) => x[0])); return (F.g || []).map(Number).filter((g) => ok.has(g)); };
  const RATES = [0, 6, 7, 7.5, 8, 8.5, 9];
  const MIN_VOTES = 1000, PAGE = 45, NEW_DAYS = 14;
  const TASTES = window.NF_TASTES || {};
  const TOPS = { il: { name: "טופ ישראל", icon: "🇮🇱", sub: "מה שהיה בטופ 10 של נטפליקס ישראל בשנה האחרונה" },
    w: { name: "טופ עולמי", icon: "globe", sub: "מה שהיה בטופ 10 העולמי של נטפליקס בשנה האחרונה" } };
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
    const gs = gSel();
    return items.filter((x) => x.k[0] === F.t && !seen[x.k] && tasteOk(x)
      && (!gs.length || gs.some((g) => x.g.includes(g)))
      && (F.il === "all" || (F.il === "only" ? x.il : !x.il)) && (!F.nf || !foreign(x)));
  }
  // "🎯 בשבילי" (Oren 17.11.2026): with a personal preference, sort by how well a title fits it. The fit is learned
  // from everything marked "ראיתי" or "הרשימה שלי" (the preference seeds those): genres that show up there more than
  // in the catalog score higher, and the IMDb rating breaks ties. Recomputed on every render, so new marks teach it.
  const personal = () => { const p = TASTES[taste]; return !!(p && !p.pending); };
  let fitG = null;
  function learn() {
    const base = {}, mine = {}; let nb = 0, nm = 0;
    for (const x of items) { for (const g of x.g) base[g] = (base[g] || 0) + 1; nb++;
      if (seen[x.k] || wl[x.k]) { for (const g of x.g) mine[g] = (mine[g] || 0) + 1; nm++; } }
    fitG = {}; if (!nm) return;
    for (const g of Object.keys(base)) fitG[g] = Math.log(((mine[g] || 0) / nm + 0.02) / (base[g] / nb + 0.02));
  }
  const fit = (x) => { if (!fitG || !x.g.length) return 0; let s = 0; for (const g of x.g) s += fitG[g] || 0; return s / Math.sqrt(x.g.length); };
  function sortList(a) {
    const isTop = taste === "il" || taste === "w";
    const sc = (x) => (okR(x) ? x.r : -1);
    const by = { r: (x, y) => sc(y) - sc(x) || (y.v || 0) - (x.v || 0),
      new: (x, y) => (y.f || "").localeCompare(x.f || "") || (y.pop || 0) - (x.pop || 0),
      pop: (x, y) => (y.v || 0) - (x.v || 0) || (y.pop || 0) - (x.pop || 0), // popular = most IMDb votes
      me: (x, y) => (fit(y) + sc(y) / 2) - (fit(x) + sc(x) / 2) || (y.v || 0) - (x.v || 0) };
    if (F.sort === "me") { if (!personal()) F.sort = "r"; else learn(); }
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
    const me = personal(); if (!me && F.sort === "me") F.sort = "r";
    segSet("fSort", F.sort); $("fSort").lastElementChild.classList.toggle("off", !me); // 🎯 always there (nothing shifts), active only with a personal preference
    for (const b of $("fSort").children) b.querySelector("i").textContent = b.dataset.v !== F.sort ? "↕" : F.dir === 1 ? "↑" : "↓";
    const fg = $("fGen"), gs = gSel();
    if (fg.dataset.k !== F.t) { // rebuilt per type: TMDB has a different genre list for movies and for series
      fg.dataset.k = F.t; fg.replaceChildren(); // 12 genres = 3 rows of 4; none lit = everything, tap a lit one to clear it
      for (const [k, l] of GEN[F.t]) fg.append(h("button", { type: "button", "data-v": k, class: l.length > 9 ? "lg" : "" }, l));
    }
    for (const b of fg.children) b.classList.toggle("on", b.dataset.v ? gs.includes(Number(b.dataset.v)) : !gs.length);
  }
  function renderRates(base) {
    const fr = $("fRate");
    if (!fr.children.length) for (const r of RATES) fr.append(h("button", { type: "button", "data-v": r }, h("b", null, r ? r + "+" : "הכול")));
    for (const b of fr.children) {
      const r = Number(b.dataset.v);
      b.classList.toggle("on", r === F.r);
      b.classList.toggle("in", r > 0 && r < F.r);
    }
  }
  function oscTxt(x) { const n = (x.oc || []).length || 1; return n > 1 ? n + " Oscars" : "Oscar"; }
  // ▶ on every poster opens the title in Netflix (Oren 17.11.2026). netflix.com/title/<id> is a universal link, so
  // on a phone with the Netflix app it opens the app on that title. Ids come from Wikidata (x.nf); without one, search.
  const nfUrl = (x) => x.nf ? "https://www.netflix.com/title/" + x.nf : "https://www.netflix.com/search?q=" + encodeURIComponent(x.n);
  function card(x) {
    const url = x.im ? "https://www.imdb.com/title/" + x.im + "/" : "https://www.themoviedb.org/" + (x.k[0] === "m" ? "movie/" : "tv/") + x.k.slice(1);
    const post = h("div", { class: "post" },
      x.p ? h("img", { src: IMG + x.p, alt: "", loading: "lazy", decoding: "async" }) : h("div", { class: "noimg" }, x.n),
      x.r ? h("span", { class: "imdb" + (okR(x) ? "" : " na"), title: okR(x) ? null : fmt(x.v || 0) + " הצבעות בלבד" }, "IMDb " + (okR(x) ? x.r.toFixed(1) : "N/A")) : null,
      x.os ? h("span", { class: "osc" + (x.os === 2 ? " g" : "") + (x.r ? "" : " top"), title: (x.oc || []).join(", ") }, ic("trophy"), oscTxt(x)) : null,
      isNew(x) ? h("span", { class: "newb" }, "חדש") : null,
      taste === "il" && x.til ? h("span", { class: "topb" }, "טופ 10 · " + x.til[0] + " שב׳") : taste === "w" && x.tw ? h("span", { class: "topb" }, "טופ 10 · " + x.tw[0] + " שב׳") : null);
    let meta;
    if (x.k[0] === "s") {
      meta = [x.s ? x.s + (x.s === 1 ? " עונה" : " עונות") + (x.e ? " · " + x.e + " פרקים" : "") : (x.y || "")];
    } else meta = [x.y || ""];
    const wlB = h("button", { type: "button", class: "wl" + (wl[x.k] ? " on" : ""), "aria-label": "לרשימה שלי", onclick: () => toggle("wl", x, wlB) }, ic("bookmark"));
    const seenB = h("button", { type: "button", class: seen[x.k] ? "on" : "", "aria-label": "ראיתי", onclick: () => toggle("seen", x, seenB) }, "✓");
    return h("div", { class: "card", "data-k": x.k },
      h("div", { class: "pw" }, h("a", { href: url, target: "_blank", rel: "noopener" }, post),
        h("a", { class: "play", href: nfUrl(x), target: "_blank", rel: "noopener", "aria-label": "לצפייה בנטפליקס", onclick: (e) => e.stopPropagation() })),
      h("a", { href: url, target: "_blank", rel: "noopener" }, h("div", { class: "nm" }, x.n), h("div", { class: "hn" }, x.hn && x.hn !== x.n ? x.hn : "\u00a0"), h("div", { class: "sm" }, meta[0])),
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
      if (!list.length) g.append(h("div", { class: "empty" }, tab === "wl" ? "הרשימה ריקה. סמנו את הסימנייה על מה שבא לכם לראות." : "עוד לא סימנתם כלום. ✓ על כרטיס מעביר אותו לכאן."));
    } else {
      const base = baseList();
      renderRates(base);
      list = sortList(base.filter((x) => rated(x, F.r)));
      const all = items.filter((x) => x.k[0] === F.t && !seen[x.k]).length;
      $("resN").replaceChildren(h("b", null, fmt(list.length)), (F.t === "s" ? " סדרות" : " סרטים"), h("small", null, "מתוך " + fmt(all)));
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
      h("div", { class: "h" }, ic("trophy"), "ההיסטוריה שלי בנטפליקס", h("small", null, all.length ? "ראית " + fmt(all.length) + " מתוך " + fmt(items.length) + " כותרים בנטפליקס ישראל (" + pct + "%)" : "כל ✓ על כרטיס נכנס לכאן")),
      h("div", { class: "tiles" },
        h("div", null, h("b", null, fmt(nS)), h("small", null, ic("tv"), "סדרות")),
        h("div", null, h("b", null, fmt(all.length - nS)), h("small", null, ic("film"), "סרטים")),
        h("div", null, h("b", null, avg ? avg.toFixed(1) : "–"), h("small", null, ic("star"), "IMDb ממוצע")),
        h("div", null, h("b", null, fmt(osc)), h("small", null, ic("trophy"), "אוסקרים"))));
  }
  function renderTasteNote() { // the chosen preference shows as a small badge on ⚙️, so no extra row opens (Oren 17.11.2026)
    $("tasteNote").hidden = true;
    const p = TASTES[taste] || TOPS[taste], tb = $("tasteB");
    tb.hidden = !p; tb.replaceChildren(...(p ? [ic(p.icon)] : [])); $("setBtn").title = p ? "העדפה: " + p.name : "";
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
    } else if (kind === "wl") toast(was ? "הוסר מהרשימה" : "נוסף לרשימה שלי", undo);
    else if (kind === "seen" && was) {
      if (tab === "seen") { const c = btn.closest(".card"); c.style.transition = "opacity .6s"; c.style.opacity = ".35"; }
      toast("חזר לרשימות", undo); setTimeout(() => { if (!seen[x.k]) render(); }, tab === "seen" ? 900 : 500);
    }
  }

  // ---------- sheets ----------
  function sheet(title, body, cls) { $("ovT").textContent = title; $("ovB").replaceChildren(...body.filter(Boolean)); const sh = document.querySelector("#ov .sheet"); sh.className = "sheet" + (cls ? " " + cls : ""); sh.style.marginTop = ""; $("ov").style.alignItems = ""; $("ov").hidden = false; }
  function closeSheet() { $("ov").hidden = true; }
  // ---------- home-screen install guide (Oren 18.11.2026) ----------
  // Short how-to for adding the site to the home screen as a web app. Shows the steps for this device first
  // (iPhone or Android), hidden when already running from the home screen or inside Side Quests (embed).
  let instEv = null;
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); instEv = e; });
  const isApp = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  function install() {
    if (isApp() || document.body.classList.contains("embed")) return null;
    let os = /Android/.test(navigator.userAgent) ? "and" : "ios"; // everything else gets the iPhone steps
    const K = (t) => h("b", { dir: "ltr" }, t);
    const STEPS = {
      ios: [h("li", null, "פותחים את הלינק ב-", K("Safari"), "."),
        h("li", null, "לוחצים על ", h("span", { class: "ki" }, ic("share")), " (Share). אם לא רואים אותו, קודם על ", h("span", { class: "ki" }, ic("dots")), " למטה."),
        h("li", null, "בוחרים ", K("Add to Home Screen"), " (הוספה למסך הבית), משאירים דולק את ", K("Open as Web App"), " ולוחצים ", K("Add"), ".")],
      and: [h("li", null, "פותחים את הלינק ב-", K("Chrome"), "."),
        h("li", null, "לוחצים על ", h("span", { class: "ki" }, ic("dots")), " בפינה למעלה."),
        h("li", null, "בוחרים ", K("Add to home screen"), " או ", K("Install app"), " ומאשרים.")],
    };
    const list = h("ol", { class: "isteps" }), seg = h("div", { class: "seg mini iseg" });
    const go = h("button", { type: "button", class: "btn", hidden: true, onclick: async () => { if (!instEv) return; instEv.prompt(); await instEv.userChoice; instEv = null; go.hidden = true; } }, ic("plus"), "להוסיף עכשיו");
    const show = () => { list.replaceChildren(...STEPS[os]); for (const b of seg.children) b.classList.toggle("on", b.dataset.v === os); go.hidden = !(os === "and" && instEv); };
    for (const [v, t] of [["ios", "iPhone"], ["and", "Android"]]) seg.append(h("button", { type: "button", "data-v": v, onclick: () => { os = v; show(); } }, t));
    const body = h("div", { class: "iin" }, h("p", { class: "note" }, "האפליקציה נפתחת מאייקון משלה, במסך מלא ובלי סרגלי הדפדפן."), seg, list, go,
      h("p", { class: "note" }, "באייקון יש רשימות נפרדות מהדפדפן. כדי שיהיו אותן רשימות, משתמשים בסנכרון למטה."));
    const wrap = h("div", { class: "iwrap" }, body);
    const tog = h("button", { type: "button", class: "btn ibtn", "aria-expanded": "false", onclick: () => { const o = !wrap.classList.contains("on"); wrap.classList.toggle("on", o); tog.setAttribute("aria-expanded", o); } },
      h("span", null, "איך מוסיפים למסך הבית"), h("span", { class: "chev" }, ic("chev")));
    show();
    return h("div", null, h("div", { class: "h3" }, ic("phone"), "אפליקציה במסך הבית"), tog, wrap);
  }
  // A "show also" switch in settings: off by default, this device only; changing it rebuilds the item list.
  function showTgl(key, label, sub) {
    const t = h("button", { type: "button", class: "tgl wide" + (ls.get(key, false) ? " on" : ""), role: "switch" }, h("span", { class: "sw" }), h("span", { class: "tl" }, label, h("small", null, sub)));
    t.onclick = () => { const v = !ls.get(key, false); ls.set(key, v); t.classList.toggle("on", v); if (cat) { useItems(); render(); } }; return t;
  }
  function settings() {
    const opts = [["all", "all", "בלי העדפה", "כל מה שיש בנטפליקס ישראל"]];
    for (const [k, p] of Object.entries(TASTES)) opts.push([k, p.icon, p.name, p.pending ? "בקרוב: מחכה לרשימת האהובים" : "לפי מה שאהבת ומה לא"]);
    for (const [k, p] of Object.entries(TOPS)) opts.push([k, p.icon, p.name, p.sub]);
    const box = h("div", { class: "opt" }, opts.map(([k, e, n, s]) => h("button", { type: "button", class: taste === k ? "on" : "",
      onclick: (ev) => { taste = k; ls.set("nf_taste", k); tAt = Date.now(); ls.set("nf_taste_at", tAt); seedTaste(k);
        if (TASTES[k] && !TASTES[k].pending) { F.sort = "me"; F.dir = -1; save(); } sync.soon(); for (const b of box.children) b.classList.remove("on"); ev.currentTarget.classList.add("on"); render(); } },
      h("span", { class: "e" }, ic(e)), h("span", null, n, h("small", null, s)))));
    sheet("הגדרות", [
      G.owner ? h("div", { class: "h3" }, ic("users"), "משתמשים") : null,
      G.owner ? h("p", { class: "users" + (G.n >= G.max ? " cap" : "") }, h("b", { dir: "ltr" }, G.n + " / " + G.max),
        G.n >= G.max ? "מלא: מכשירים חדשים לא נכנסים" : "מכשירים פתחו את האפליקציה",
        G.denied ? h("small", null, fmt(G.denied) + (G.denied === 1 ? " מכשיר ניסה" : " מכשירים ניסו") + " להיכנס אחרי שהתמלא") : null,
        h("small", null, "המכשירים שלך לא נספרים")) : null,
      h("div", { class: "h3" }, "העדפה"), box,
      h("div", { class: "h3" }, "תצוגה"),
      showTgl("nf_noimg", "להציג גם כותרים בלי תמונה", "בדרך כלל לא מוכרים, ולכן מוסתרים"),
      showTgl("nf_norate", "להציג גם כותרים בלי ציון IMDb", "אין להם ציון בכלל, ולכן מוסתרים"),
      install(),
      h("div", { class: "h3" }, "לשתף"),
      h("button", { type: "button", class: "btn", onclick: share }, ic("link"), "לשתף את האפליקציה"),
      h("div", { class: "h3" }, ic("sync"), "סנכרון"), sync.box(),
      h("div", { class: "h3" }, "מאיפה הנתונים"),
      h("p", { class: "note" }, "מה זמין בנטפליקס ישראל: JustWatch דרך TMDB. ציונים: הנתונים הרשמיים של IMDb (ציון נחשב רק מ-" + fmt(MIN_VOTES) + " הצבעות בעולם; פחות מזה מוצג IMDb N/A ויורד לסוף; לתוכן ישראלי אין מינימום). פופולרי = הכי הרבה הצבעות ב-IMDb. אוסקר: מספר הזכיות בכל הקטגוריות לפי Wikidata (תג זהב = זכה גם בסרט הטוב ביותר). ״בלי שפות זרות״ = רק כותרים שהשפה המקורית שלהם אנגלית או עברית. טופ 10: הטבלאות הרשמיות של נטפליקס."),
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
      if (st) st.textContent = err ? "אין חיבור, ינסה שוב" : last ? "✓ מסונכרן " + new Date(last).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "";
    }
    function box() {
      host = h("div", { class: "sync" }); draw(); return host;
    }
    function draw() {
      const row = h("div", { class: "srow" });
      const below = h("div", { class: "sbody" });
      if (code) {
        row.append(h("button", { type: "button", onclick: async () => { try { await navigator.clipboard.writeText(fmtCode(code)); toast("הקוד הועתק"); } catch (e) {} } }, ic("copy"), "העתק"),
          h("button", { type: "button", onclick: () => { code = ""; ls.set("nf_sync", ""); draw(); toast("הסנכרון כובה במכשיר הזה"); } }, "✕ ניתוק"));
        below.append(h("div", { class: "scode" }, fmtCode(code)), h("div", { class: "sst" }), h("p", { class: "note" }, "במקום השני: הגדרות ← ״יש לי קוד״."));
      } else {
        row.append(h("button", { type: "button", onclick: async () => {
            const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = crypto.getRandomValues(new Uint8Array(8));
            code = Array.from(r, (b) => A[b % A.length]).join(""); ls.set("nf_sync", code); draw(); await now(); gate(); } }, ic("plus"), "קוד חדש"),
          h("button", { type: "button", onclick: () => { below.hidden = !below.hidden; if (!below.hidden) below.querySelector("input").focus({ preventScroll: true }); } }, ic("keys"), "יש לי קוד"));
        const inp = h("input", { type: "text", maxlength: "9", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", placeholder: "XXXX-XXXX", dir: "ltr" });
        const msg = h("div", { class: "sst" });
        below.hidden = true; below.classList.add("enter");
        below.append(h("div", { class: "sin" }, inp, h("button", { type: "button", class: "btn", onclick: async () => {
          const c = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
          if (c.length !== 8) { msg.textContent = "הקוד הוא 8 תווים"; return; }
          msg.textContent = "מתחבר…";
          try { const R = await rpc("nf_sync_get", { p_code: c }); if (!R) { msg.textContent = "לא מצאתי את הקוד"; return; } }
          catch (e) { msg.textContent = "אין חיבור"; return; }
          code = c; ls.set("nf_sync", c); await now(); draw(); toast("✓ מסונכרן"); if (!G.ok) location.reload(); else gate(); } }, "חיבור")), msg);
      }
      host.replaceChildren(row, below); paint();
    }
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") now(); });
    window.addEventListener("focus", () => now());
    return { now, soon, box, rpc, code: () => code };
  })();

  const PUB = "https://tipul10000-droid.github.io/apps/netflix-il/";
  async function share() {
    try { if (navigator.share) await navigator.share({ title: "מה בנטפליקס?", text: "כל מה שיש בנטפליקס ישראל, עם ציון IMDb וסינון נוח", url: PUB });
      else { await navigator.clipboard.writeText(PUB); toast("הקישור הועתק"); } } catch (e) {}
  }
  function about() {
    const f = (e, t) => h("div", { class: "af" }, ic(e), t);
    sheet("אודות", [
      h("div", { class: "ahero" }, h("img", { src: "icon-192.png?v=3", alt: "", width: "84", height: "84" }),
        h("b", null, "מה יש חדש בנטפליקס?"), h("span", null, "מוצאים מה לראות, בלי לגלול לנצח")),
      h("p", { class: "ab" }, "בנטפליקס אי אפשר לסנן לפי ציון, אז הנה מקום שאפשר. כל מה שיש עכשיו בנטפליקס ישראל, עם ציון IMDb, אוסקרים וטופ 10. בוחרים ז׳אנר ורמת ציון, ותוך שנייה יש רשימה של דברים ששווה לראות."),
      h("div", { class: "afs" }, f("star", "ציון IMDb לכל סרט וסדרה"), f("🇮🇱", "כולל תוכן ישראלי, ובלי שפות זרות אם רוצים"),
        f("bookmark", "סימון לרשימת צפייה והיסטוריית צפייה"), f("moon", "חינם, בלי הרשמה, מתעדכן כל לילה")),
      h("button", { type: "button", class: "ashare", onclick: share }, h("span", { class: "shi", html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5l6 6-6 6"/><path d="M20 11H11a7 7 0 0 0-7 7v1"/></svg>' }), "לשלוח לחברים"),
      h("details", { class: "acred" }, h("summary", null, "מקורות"),
        h("p", { class: "note anote" }, "נתונים: JustWatch,\u200f TMDB,\u200f IMDb,\u200f Wikidata,\u200f Netflix.")),
      h("div", { class: "asig", dir: "ltr" }, h("div", null, "Idea & Design by Oren Itzhaki"), h("div", null, "Coding by Claude Code")),
      h("div", { class: "adisc" }, h("p", null, "לאפליקציה אין שום קשר רשמי לנטפליקס או לאתר IMDb."),
        h("p", { dir: "ltr" }, "Not affiliated with or endorsed by Netflix or IMDb.")),
    ], "about-sh");
    // opens centred, then pinned there so opening the sources grows it downwards and nothing above moves
    const sh = document.querySelector("#ov .sheet"), ov = $("ov"), pt = parseFloat(getComputedStyle(ov).paddingTop) || 0;
    const top = sh.offsetTop; ov.style.alignItems = "flex-start"; sh.style.marginTop = Math.max(0, top - pt) + "px";
  }

  // ---------- events ----------
  function bindSeg(id, key) { $(id).addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F[key] = b.dataset.v; save(); render(); }); }
  function save() { ls.set("nf_f", F); fAt = Date.now(); ls.set("nf_f_at", fAt); sync.soon(); }
  bindSeg("fType", "t"); bindSeg("fIl", "il"); bindSeg("fSub", "sub");
  $("fNf").addEventListener("click", () => { F.nf = !F.nf; save(); render(); });
  // sort: tap the active one again to reverse it (arrow shows the direction)
  $("fSort").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.v === "me" && !personal()) { toast("״בשבילי״ עובד כשבוחרים העדפה אישית בהגדרות"); return; }
    if (F.sort === b.dataset.v) F.dir = F.dir === 1 ? -1 : 1; else { F.sort = b.dataset.v; F.dir = -1; } save(); render(); });
  $("fGen").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const v = b.dataset.v;
    const gs = gSel(), n = Number(v); F.g = !v ? [] : gs.includes(n) ? gs.filter((x) => x !== n) : [...gs, n]; save(); render(); });
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

  // ---------- device cap (Oren 17.11.2026: 15 devices for now, so the link stays among small groups) ----------
  // Server side in supabase/gate.sql. A device that got in stays in; Oren's devices (inside SQ, or synced with it)
  // are owners: not counted, and they see the count in ⚙️ and a red dot when it is full. No answer = let in.
  let G = { ok: true };
  const devId = (() => { let d = ls.get("nf_dev", ""); if (!/^[a-z0-9]{20}$/.test(d)) {
    const A = "abcdefghijklmnopqrstuvwxyz0123456789", r = crypto.getRandomValues(new Uint8Array(20));
    d = Array.from(r, (b) => A[b % A.length]).join(""); ls.set("nf_dev", d); } return d; })();
  async function gate() {
    try {
      const R = await Promise.race([sync.rpc("nf_gate", { p_dev: devId, p_sync: sync.code() || null, p_emb: qs.get("embed") === "1" }),
        new Promise((_, no) => setTimeout(() => no(new Error("t")), 5000))]);
      if (R && typeof R.ok === "boolean") G = R;
    } catch (e) {}
    $("setBtn").classList.toggle("dot", !!(G.owner && G.n >= G.max));
    return G.ok;
  }
  function blocked() {
    $("meta").replaceChildren(h("b", null, "נטפליקס ישראל"));
    for (const id of ["filters", "fSub", "ach"]) $(id).hidden = true;
    document.querySelector(".resbar").hidden = true; document.querySelector(".tabs").hidden = true; $("qBtn").hidden = true;
    const sb = sync.box();
    $("grid").replaceChildren(h("div", { class: "full" }, h("div", { class: "e" }, ic("lock")), h("b", { dir: "ltr" }, "The app has reached the maximum number of users."),
      h("p", { dir: "ltr" }, "Please contact Oren Itzhaki."),
      h("details", null, h("summary", null, "יש לי קוד סנכרון"), sb)));
  }

  // Titles without a poster or without any IMDb rating are obscure: left out of everything, counts too, unless
  // switched on in settings (Oren 18.11.2026; nf_noimg / nf_norate, this device only). "No rating" = no r at all;
  // a rating under MIN_VOTES still counts as rated (shown as N/A), so Israeli titles keep their exemption.
  function useItems() {
    const img = ls.get("nf_noimg", false), rate = ls.get("nf_norate", false);
    items = (cat.items || []).filter((x) => (img || x.p) && (rate || x.r));
    minF = items.reduce((m, x) => (!m || (x.f && x.f < m) ? x.f : m), "");
    const ns = items.filter((x) => x.k[0] === "s").length;
    $("meta").replaceChildren(
      h("b", null, "נטפליקס ישראל 🇮🇱\u200f · " + fmt(ns) + " סדרות · " + fmt(items.length - ns) + " סרטים"),
      h("span", null, "עודכן " + new Date(cat.at).toLocaleString("he-IL", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) + (cat.pending ? " · משלים " + fmt(cat.pending) + " כותרים…" : "")));
    const mb = $("meta").firstChild; // keep line 1 on one line: shrink the font a little if this screen is too narrow
    for (let fs = 13; mb.scrollWidth > mb.clientWidth && fs > 10.5; fs -= 0.5) mb.style.fontSize = fs - 0.5 + "px";
  }
  // ---------- load ----------
  async function load() {
    if (!(await gate())) { blocked(); return; }
    try {
      const r = await fetch(CAT_URL, { cache: "no-cache" });
      if (!r.ok) throw new Error(r.status);
      cat = await r.json();
      await sync.now(); // pull first, so marks un-done elsewhere aren't seeded back
      useItems();
      seedTaste(taste);
      render();
    } catch (e) {
      $("meta").textContent = "לא הצלחתי לטעון את הרשימה. בדקו חיבור ונסו שוב.";
    }
  }
  load();
})();
