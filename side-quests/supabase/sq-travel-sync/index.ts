// sq-travel-sync (Oren 22.11.2026, SQ 25.46): the full list of trips abroad is Oren's Excel (V8-AI.xlsx in Dropbox).
// This function downloads it from the shared link kept in sq_docs settings/travel_history.excel_url (never in the repo),
// reads the first sheet ("נסיעות שבוצעו") and rewrites settings/travel_history (trips, counts, countries). The insights and
// links Claude wrote stay. Two ways in:
//   POST ?action=sync          the "⟳ עדכון מהאקסל" button in abroad.html (at most once a minute)
//   POST ?action=auto          pg_cron once a day: imports only when a trip ended 5+ days ago and was not imported since
// Answers only counts, never the data (anyone with the public key can call it).
import { createClient } from "npm:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Content-Type": "application/json" };
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const APP = "sidequests";
const AFTER_DAYS = 5;

async function getDoc(coll: string, id: string) {
  const { data } = await sb.from("sq_docs").select("data,version").eq("app", APP).eq("collection", coll).eq("id", id).maybeSingle();
  return data as { data: Record<string, unknown>; version: number } | null;
}
async function putDoc(coll: string, id: string, patch: Record<string, unknown>) {
  const cur = await getDoc(coll, id);
  const data = { ...(cur?.data || {}), ...patch };
  if (cur) {
    const { error } = await sb.from("sq_docs").update({ data, version: (cur.version || 0) + 1, updated_at: new Date().toISOString() }).eq("app", APP).eq("collection", coll).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await sb.from("sq_docs").insert({ app: APP, collection: coll, id, data, version: 1, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
}

const iso = (d: Date) => new Date(d.getTime() + 12 * 36e5).toISOString().slice(0, 10); // date cells are UTC midnight (or a hair before it)
function val(x: unknown): unknown {
  if (x == null) return null;
  if (x instanceof Date) return iso(x);
  if (typeof x === "string") { const s = x.trim(); return s === "" || s === "-" ? null : s; }
  return x;
}
// columns of the first sheet, as Oren keeps them (index → field; null = not shown in the app)
const COLS: (string | null)[] = ["n", "from", "to", "days", "countries", "stops", "cities", "stay", "who", "type", "note", null, null, null, null, "cost_total", "cost_key", "album"];

function parse(buf: ArrayBuffer) {
  const wb = XLSX.read(new Uint8Array(buf), { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  const trips: Record<string, unknown>[] = [];
  let started = false, i = 1;
  for (; i < rows.length; i++) {
    const r = rows[i] || [];
    if (typeof r[0] !== "number") { if (started) break; continue; }
    started = true;
    if (r[1] == null) continue; // a numbered row not filled in yet
    const o: Record<string, unknown> = {};
    COLS.forEach((k, j) => {
      if (!k) return;
      let x = val(r[j]);
      if (x == null) return;
      if ((k === "from" || k === "to") && typeof x === "number") x = String(Math.round(x)); // year only (old trips)
      o[k] = x;
    });
    o.n = Math.round(r[0] as number);
    trips.push(o);
  }
  // the sheet's own country table: "בפועל - נחשב כמדינה" (the real count) and the rows under "מספור (סדר א'-ב')"
  let countries_count: number | null = null;
  const countries: { c: string; visits: number }[] = [];
  for (let k = i; k < rows.length; k++) {
    const r = rows[k] || [];
    if (typeof r[0] === "string" && /^בפועל/.test(r[0]) && typeof r[1] === "number") countries_count = r[1];
    if (typeof r[0] === "string" && /^מספור/.test(r[0])) {
      for (let m = k + 1; m < rows.length; m++) {
        const q = rows[m] || [];
        if (typeof q[1] !== "string" || typeof q[2] !== "number") break;
        countries.push({ c: q[1].trim(), visits: q[2] });
      }
      break;
    }
  }
  countries.sort((a, b) => b.visits - a.visits);
  const by_type: Record<string, number> = {};
  const yr: Record<number, { y: number; all: number; vac: number; work: number }> = {};
  for (const t of trips) {
    const ty = String(t.type || ""); if (ty) by_type[ty] = (by_type[ty] || 0) + 1;
    const y = +(/(\d{4})/.exec(String(t.from || "")) || [])[1]; if (!y) continue;
    const o = yr[y] = yr[y] || { y, all: 0, vac: 0, work: 0 };
    o.all++; if (ty === "עבודה") o.work++; else if (ty !== "צבא") o.vac++;
  }
  const by_year = Object.values(yr).filter((o) => o.y >= 2012).sort((a, b) => a.y - b.y);
  return { trips, total: trips.length, by_type, by_year, countries, countries_count: countries_count ?? countries.length };
}

async function sync(by: string, why: string) {
  const cur = (await getDoc("settings", "travel_history"))?.data || {};
  const links = Array.isArray(cur.links) ? cur.links as { url?: string }[] : [];
  const url0 = String(cur.excel_url || links.find((l) => /dropbox\.com/.test(l.url || ""))?.url || "");
  if (!/^https:\/\/www\.dropbox\.com\//.test(url0)) throw new Error("no excel link");
  const url = url0.replace(/([?&])dl=0/, "$1dl=1") + (/[?&]dl=1/.test(url0) || /dl=0/.test(url0) ? "" : (url0.includes("?") ? "&" : "?") + "dl=1");
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) throw new Error("dropbox " + r.status);
  const buf = await r.arrayBuffer();
  const p = parse(buf);
  if (p.total < 10) throw new Error("excel looks empty (" + p.total + ")");
  const before = Array.isArray(cur.trips) ? (cur.trips as unknown[]).length : 0;
  const now = new Date().toISOString();
  await putDoc("settings", "travel_history", {
    ...p, excel_url: url0, source: "V8-AI.xlsx (Dropbox)", imported_at: now.slice(0, 10),
    synced: { at: now, by, why, n: p.total, added: p.total - before, ok: true },
  });
  return { ok: true, n: p.total, added: p.total - before };
}

// a return home = the end of a trip in settings/away (every trip, work too) or a booked trip in trips
async function lastReturn(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const lim = new Date(Date.now() - AFTER_DAYS * 864e5).toISOString().slice(0, 10);
  const ends: string[] = [];
  const away = (await getDoc("settings", "away"))?.data;
  for (const t of (Array.isArray(away?.trips) ? away!.trips as { to?: string }[] : [])) if (t && /^\d{4}-\d\d-\d\d/.test(t.to || "")) ends.push(String(t.to).slice(0, 10));
  const { data } = await sb.from("sq_docs").select("data").eq("app", APP).eq("collection", "trips");
  for (const x of data || []) { const d = (x as { data: Record<string, unknown> }).data; if (d && !d._deleted && d.stage === "booked" && /^\d{4}-\d\d-\d\d$/.test(String(d.to || ""))) ends.push(String(d.to)); }
  return ends.filter((e) => e <= lim && e < today).sort().pop() || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const action = new URL(req.url).searchParams.get("action") || "sync";
  try {
    const cur = (await getDoc("settings", "travel_history"))?.data || {};
    const last = cur.synced && typeof cur.synced === "object" ? Date.parse(String((cur.synced as { at?: string }).at || "")) || 0 : 0;
    if (action === "auto") {
      const ret = await lastReturn();
      if (!ret) return new Response(JSON.stringify({ ok: true, skip: "no return" }), { headers: CORS });
      const due = Date.parse(ret + "T00:00:00Z") + AFTER_DAYS * 864e5;
      if (last >= due) return new Response(JSON.stringify({ ok: true, skip: "already synced after " + ret }), { headers: CORS });
      return new Response(JSON.stringify(await sync("auto", "חזרה מנסיעה ב-" + ret)), { headers: CORS });
    }
    if (Date.now() - last < 60e3) return new Response(JSON.stringify({ ok: true, skip: "just synced" }), { headers: CORS });
    return new Response(JSON.stringify(await sync("button", "כפתור באפליקציה")), { headers: CORS });
  } catch (e) {
    try { await putDoc("settings", "travel_history", { synced_err: { at: new Date().toISOString(), msg: String((e as Error).message || e).slice(0, 200) } }); } catch (_) { /* ignore */ }
    return new Response(JSON.stringify({ ok: false, err: String((e as Error).message || e).slice(0, 200) }), { status: 500, headers: CORS });
  }
});
