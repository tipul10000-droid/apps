// sq-quote: public market quotes for the investment-portfolio section (Oren 9.11.2026).
// GET ?s=NVDA,FRVO -> {q:{NVDA:{p,prev,t,src}}, fx:{p,prev,t}, at}. Public data only, no user data.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Content-Type": "application/json" };
const UA = { "User-Agent": "Mozilla/5.0 (compatible; sq-quote/1.0)" };

async function yahoo(sym: string) {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`, { headers: UA });
  if (!r.ok) throw new Error("yahoo " + r.status);
  const m = (await r.json())?.chart?.result?.[0]?.meta;
  if (!m || !m.regularMarketPrice) throw new Error("yahoo empty");
  return { p: m.regularMarketPrice, prev: m.chartPreviousClose ?? m.previousClose ?? null, t: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : null, src: "yahoo" };
}
async function stooq(sym: string) {
  const s = sym === "USDILS=X" ? "usdils" : sym.toLowerCase() + ".us";
  const r = await fetch(`https://stooq.com/q/l/?s=${s}&f=sd2t2c&h&e=csv`, { headers: UA });
  const line = (await r.text()).trim().split("\n")[1] || "";
  const [, d, t, c] = line.split(",");
  const p = parseFloat(c);
  if (!isFinite(p)) throw new Error("stooq empty");
  return { p, prev: null, t: d && t ? `${d}T${t}Z` : null, src: "stooq" };
}
async function quote(sym: string) {
  try { return await yahoo(sym); } catch (_) { return await stooq(sym); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const u = new URL(req.url);
  const syms = (u.searchParams.get("s") || "").split(",").map((x) => x.trim().toUpperCase()).filter((x) => /^[A-Z.\-]{1,10}$/.test(x)).slice(0, 10);
  const out: Record<string, unknown> = {};
  await Promise.all(syms.map(async (s) => { try { out[s] = await quote(s); } catch (e) { out[s] = { err: String(e) }; } }));
  let fx: unknown = null;
  try { fx = await quote("USDILS=X"); } catch (e) { fx = { err: String(e) }; }
  return new Response(JSON.stringify({ q: out, fx, at: new Date().toISOString() }), { headers: { ...CORS, "Cache-Control": "max-age=60" } });
});
