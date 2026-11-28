// שומר רגרסיה לכפתורים הצפים (+ / חיפוש / למעלה). אורן 28.11.2026: "עולים למעלה, לתקן לתמיד".
// הרצה: node side-quests/tests/fab-guard.mjs   (דורש playwright + chromium)
// לא פונה לשרת האמיתי: כל /rest/v1/ מיורט (קוד שגוי נועל את האפליקציה, ראו CLAUDE.md).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
let fail = 0;
const bad = (m) => { fail++; console.error("✗ " + m); };
const ok = (m) => console.log("✓ " + m);

// 1. בדיקה סטטית: אסור top / --vb / vvfix על הכפתורים הצפים
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = html.match(/<style[\s\S]*?<\/style>/g).join("\n");
for (const m of css.matchAll(/([^{}]*\.(?:tadd|tfind)\.fab[^{}]*|[^{}]*#upBtn[^{}]*)\{([^}]*)\}/g)) {
  const sel = m[1].trim().split("\n").pop(), body = m[2];
  if (/html\.desk|\.ipend/.test(sel)) continue; // מחשב: מערך אחר, הכפתורים הצפים מוסתרים
  if (/(^|;)\s*top\s*:/.test(body)) bad("top על כפתור צף: " + sel);
}
if (/vvfix|--vb\b/.test(html)) bad("נשארה שיטת vvfix / --vb ב-index.html (מנגנון כפול)");
else ok("אין מנגנון עיגון כפול ב-index.html");
const nz = fs.readFileSync(path.join(root, "nozoom.js"), "utf8");
if (!/if\(!\(d>=2\)\)d=0/.test(nz) || !/Math\.min\(d,/.test(nz)) bad("nozoom.js: התיקון חייב להיות מטה בלבד ועם תקרה");
else ok("nozoom.js: תיקון מטה בלבד עם תקרה");

// 2. בדיקה דינמית בדפדפן בגודל טלפון
let chromium;
try { const { createRequire } = await import("node:module"); ({ chromium } = createRequire(process.cwd() + "/")("playwright")); } catch { console.error("אין playwright, דילוג על הבדיקה הדינמית"); process.exit(fail ? 1 : 0); }
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => { localStorage.setItem("sq_pin", "123456"); });
await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)[^/]+\/.*/, (r) => {
  const u = r.request().url(); if (/supabase|googleapis|gstatic/.test(u)) return r.fulfill({ status: 200, body: "" }); return r.continue();
});
// הנתיב האחרון שנרשם גובר ב-playwright, לכן הרשת הכללית קודם ו-/rest/v1 אחריה
await ctx.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", rows: [] }) }));
const page = await ctx.newPage();
const http = await import("node:http");
const repo = path.resolve(root, "..");
const srv = http.createServer((q, s) => {
  const f = path.join(repo, decodeURIComponent(q.url.split("?")[0]));
  if (!f.startsWith(repo) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { s.statusCode = 404; return s.end(""); }
  s.setHeader("content-type", { ".js": "text/javascript", ".html": "text/html", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".json": "application/json" }[path.extname(f)] || "application/octet-stream");
  fs.createReadStream(f).pipe(s);
}).listen(0);
const port = srv.address().port;
await page.goto(`http://localhost:${port}/side-quests/index.html?nosw=1`, { waitUntil: "load" });
await page.waitForSelector("#addBtn", { state: "attached", timeout: 15000 });
await page.waitForSelector("#sq-pin", { state: "detached", timeout: 20000 }).catch(() => {});
await page.waitForSelector("#sqSplash", { state: "detached", timeout: 20000 }).catch(() => {});
await page.waitForTimeout(800);

const ids = ["addBtn", "findBtn"];
const H = () => page.evaluate(() => window.innerHeight);
async function pos() { return page.evaluate((ids) => Object.fromEntries(ids.map((i) => { const r = document.getElementById(i).getBoundingClientRect(); return [i, { top: r.top, bottom: r.bottom, w: r.width, h: r.height }]; })), ids); }
const base = await pos(); const vh = await H();
for (const i of ids) {
  if (base[i].bottom < vh * 0.7 || base[i].bottom > vh) bad(`${i} לא בתחתית בהתחלה (bottom=${base[i].bottom}, vh=${vh})`);
}
ok("כפתורים בתחתית בטעינה");
async function same(label) {
  const p = await pos();
  for (const i of ids) {
    if (Math.abs(p[i].top - base[i].top) > 1 || Math.abs(p[i].w - base[i].w) > 0.5) bad(`${label}: ${i} זז (top ${base[i].top} → ${p[i].top})`); }
  ok(label);
}
// גלילה
await page.evaluate(() => window.scrollTo(0, 400)); await page.waitForTimeout(500); await same("אחרי גלילה");
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
// פתיחה וסגירה של תפריט ההוספה: הכפתור לא זז
await page.tap("#addBtn"); await page.waitForTimeout(300); await same("תפריט הוספה פתוח");
await page.tap("#addBtn"); await page.waitForTimeout(300); await same("תפריט הוספה סגור");
// ה-visual viewport מדווח קטן (מקלדת / חזרה לאפליקציה / קפיצת גלילה): הכפתורים לא יכולים לעלות
await page.evaluate(() => {
  const real = window.visualViewport; const fake = Object.assign(new EventTarget(), { height: 320, offsetTop: 0, offsetLeft: 0, width: 390, scale: 1, pageTop: 0, pageLeft: 0 });
  Object.defineProperty(window, "visualViewport", { configurable: true, get: () => fake }); window.__fakeVV = fake;
  window.dispatchEvent(new Event("resize")); document.dispatchEvent(new Event("visibilitychange"));
});
await page.waitForTimeout(1500); await same("visualViewport קטן (מקלדת/חזרה לאפליקציה)");
await page.evaluate(() => { window.__fakeVV.offsetTop = 120; window.dispatchEvent(new Event("resize")); });
await page.waitForTimeout(1300); await same("visualViewport עם offsetTop");
// layout viewport שנשאר מכווץ באייפון: מותר רק לרדת, לא לעלות
await page.evaluate(() => { window.__fakeVV.height = window.innerHeight + 90; window.__fakeVV.offsetTop = 0; window.dispatchEvent(new Event("resize")); });
await page.waitForTimeout(1300);
const sh = await pos();
for (const i of ids) if (sh[i].top < base[i].top - 1) bad(`${i} עלה למעלה (${base[i].top} → ${sh[i].top})`); else if (sh[i].bottom > vh + 90.5 + 1) bad(`${i} ירד יותר מהתקרה`);
ok("תיקון layout viewport רק מטה");
// רענון דף
await page.reload({ waitUntil: "load" }); await page.waitForSelector("#sq-pin", { state: "detached", timeout: 20000 }).catch(() => {}); await page.waitForSelector("#sqSplash", { state: "detached", timeout: 20000 }).catch(() => {}); await page.waitForTimeout(800);
const rl = await pos(); for (const i of ids) if (Math.abs(rl[i].top - base[i].top) > 1) bad(`אחרי רענון ${i} במקום אחר`);
ok("אחרי רענון");
// אופליין
await ctx.setOffline(true); await page.waitForTimeout(2500);
const of = await pos(); for (const i of ids) if (Math.abs(of[i].top - base[i].top) > 1) bad(`אופליין: ${i} זז`);
ok("מצב אופליין");
await browser.close(); srv.close();
if (fail) { console.error(`\nנכשל: ${fail}`); process.exit(1); }
console.log("\nכל הבדיקות עברו");
