// "מה יש בנטפליקס?" daily catalog builder. Runs as an Edge Function in the FrameHorizon Supabase project,
// so it reuses FrameHorizon's TMDB token (secret TMDB_READ_ACCESS_TOKEN) and the same sources:
// availability = JustWatch via TMDB (Netflix IL, providers 8 + 1796), ratings = official IMDb datasets,
// Oscars = Academy Award wins, all competitive categories (Wikidata), Top 10 = Netflix's own Top 10 TSV files.
// Output: public JSON in Storage bucket nf-public (catalog.json). No key ever reaches the browser.
// Called by pg_cron with header x-nf-key (only its SHA-256 lives here). Work is budgeted; repeated
// calls continue where the last one stopped (first fill of details takes a few calls).
import { createClient } from 'jsr:@supabase/supabase-js@2.112.3'

type J = Record<string, any>
const TMDB = 'https://api.themoviedb.org/3'
const KEY_SHA = '09a6d3b88f80db512645404d856c522c6d2c5445509bbe90f5877b7fd8a68cdd'
const BUCKET = 'nf-public'
const BUDGET_MS = 125_000
const PROVIDERS = '8|1796'
const DAY = 86_400_000

const GENRES: Record<number, string> = {
  28: 'act', 12: 'act', 10759: 'act', 10752: 'act', 37: 'act', 10768: 'act',
  35: 'com', 18: 'dra', 36: 'dra', 10766: 'dra', 10749: 'rom',
  53: 'thr', 80: 'thr', 9648: 'thr', 878: 'scf', 14: 'scf', 10765: 'scf',
  27: 'hor', 99: 'doc', 16: 'ani', 10751: 'fam', 10762: 'fam',
  10764: 'rea', 10767: 'rea', 10763: 'rea',
}

async function sha(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
const res = (s: number, b: J) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const today = () => new Date().toISOString().slice(0, 10)
const norm = (s: string) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^\p{L}\p{N}]+/gu, '')

Deno.serve(async (req) => {
  const t0 = performance.now()
  const left = () => BUDGET_MS - (performance.now() - t0)
  const k = req.headers.get('x-nf-key') ?? ''
  if (!k || (await sha(k)) !== KEY_SHA) return res(401, { error: 'UNAUTHORIZED' })
  const token = Deno.env.get('TMDB_READ_ACCESS_TOKEN') ?? ''
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  let body: J = {}
  try { body = await req.json() } catch { /* optional */ }
  const force: string[] = Array.isArray(body.force) ? body.force : []
  const log: J = { calls: 0 }

  async function tmdb(path: string): Promise<J> {
    for (let a = 0; a < 4; a++) {
      log.calls++
      const r = await fetch(TMDB + path, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' }, signal: AbortSignal.timeout(15000) }).catch(() => null)
      if (r && r.ok) return await r.json()
      if (r && r.status !== 429 && r.status < 500) throw new Error('TMDB_' + r.status + ' ' + path)
      await sleep(400 * 2 ** a)
    }
    throw new Error('TMDB_FAIL ' + path)
  }
  async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>, stopAt = 0) {
    let i = 0
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length && left() > stopAt) { const x = items[i++]; await fn(x) }
    }))
  }
  async function load(name: string): Promise<J | null> {
    const { data } = await admin.storage.from(BUCKET).download(name)
    if (!data) return null
    try { return JSON.parse(await data.text()) } catch { return null }
  }
  async function save(name: string, obj: J, cache = '300') {
    const { error } = await admin.storage.from(BUCKET).upload(name, new Blob([JSON.stringify(obj)], { type: 'application/json' }), { upsert: true, contentType: 'application/json', cacheControl: cache })
    if (error) throw new Error('SAVE_' + name + ' ' + error.message)
  }
  async function lines(url: string, gz: boolean, fn: (l: string) => void) {
    const r = await fetch(url, { headers: { 'user-agent': 'whats-on-netflix-il/1.0 (personal, non-commercial)' } })
    if (!r.ok || !r.body) throw new Error('FETCH_' + r.status + ' ' + url)
    let s: ReadableStream<any> = r.body
    if (gz) s = s.pipeThrough(new DecompressionStream('gzip'))
    let buf = ''
    for await (const chunk of s.pipeThrough(new TextDecoderStream())) {
      buf += chunk
      const parts = buf.split('\n'); buf = parts.pop() ?? ''
      for (const l of parts) fn(l)
    }
    if (buf) fn(buf)
  }

  try {
    if (body.probe === 'oscar') {
      const q = 'SELECT ?aw ?l WHERE { ?aw wdt:P1027 wd:Q212329 ; rdfs:label ?l . FILTER(lang(?l)="en") }'
      const r = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), { headers: { 'user-agent': 'whats-on-netflix-il/1.0', accept: 'application/sparql-results+json' } })
      return res(200, { status: r.status, body: (await r.text()).slice(0, 6000) })
    }
    const st: J = (await load('state.json')) ?? {}
    st.det ??= {}; st.first ??= {}; st.rat ??= {}; st.osc ??= {}; st.top ??= {}
    const isDue = (at: string | undefined, ms: number, name: string) => force.includes(name) || !at || Date.now() - Date.parse(at) > ms
    // Edge Functions have a small CPU budget, so each call does ONE stage (cron calls every 10 minutes):
    // discover -> details (batches) -> ratings -> oscars -> top10; the catalog is rebuilt after every stage.
    let stage = ''

    // 1. What is on Netflix Israel right now (movies + series), once a day
    if (isDue(st.disc_at, 20 * 3600_000, 'disc') || !st.list) {
      stage = 'disc'
      const list: J[] = []
      for (const kind of ['movie', 'tv']) {
        const q = `/discover/${kind}?watch_region=IL&with_watch_providers=${encodeURIComponent(PROVIDERS)}&include_adult=false&language=en-US&sort_by=popularity.desc`
        const p1 = await tmdb(q + '&page=1')
        const pages = Math.min(500, Number(p1.total_pages || 1))
        const all: J[] = [...(p1.results || [])]
        await pool(Array.from({ length: pages - 1 }, (_, i) => i + 2), 10, async (p) => { const r = await tmdb(q + '&page=' + p); all.push(...(r.results || [])) })
        const seen = new Set<number>()
        for (const x of all) {
          if (seen.has(x.id)) continue; seen.add(x.id)
          list.push({
            k: (kind === 'movie' ? 'm' : 's') + x.id, n: x.title ?? x.name, on: x.original_title ?? x.original_name,
            ol: x.original_language, oc: x.origin_country || [], g: [...new Set((x.genre_ids || []).map((g: number) => GENRES[g]).filter(Boolean))],
            p: x.poster_path, d: x.release_date ?? x.first_air_date ?? '', pop: Math.round((x.popularity || 0) * 10) / 10,
          })
        }
        log[kind] = { pages, items: seen.size }
      }
      if (list.length < 300) throw new Error('DISCOVER_TOO_SMALL ' + list.length)
      st.list = list; st.disc_at = new Date().toISOString()
      for (const x of list) st.first[x.k] ??= today()
    }
    const list: J[] = st.list

    // 2. Details (Hebrew name, IMDb id, countries, seasons/episodes); series refreshed weekly
    const need = stage ? [] : list.filter((x) => { const d = st.det[x.k]; return !d || (x.k[0] === 's' && Date.now() - Date.parse(d.at) > 7 * DAY) || force.includes('det') })
    need.sort((a, b) => (st.det[a.k] ? 1 : 0) - (st.det[b.k] ? 1 : 0))
    let done = 0
    if (need.length) stage = 'det'
    need.splice(Number(body.batch || 350))
    await pool(need, 12, async (x) => {
      const id = x.k.slice(1), mv = x.k[0] === 'm'
      try {
        const r = await tmdb(`/${mv ? 'movie' : 'tv'}/${id}?language=he-IL&append_to_response=external_ids`)
        const d: J = { at: new Date().toISOString(), im: r.imdb_id || r.external_ids?.imdb_id || null, hn: r.title ?? r.name ?? null }
        d.pc = (r.production_countries || []).map((c: J) => c.iso_3166_1)
        if (!mv) { d.s = r.number_of_seasons || 0; d.e = r.number_of_episodes || 0; d.es = (r.seasons || []).filter((s: J) => s.season_number > 0).map((s: J) => s.episode_count || 0) }
        st.det[x.k] = d; done++
      } catch (e) { if (/TMDB_404/.test(String(e))) { st.det[x.k] = { at: new Date().toISOString(), gone: 1 }; done++ } }
    }, 55_000)
    log.details = { done, missing: list.filter((x) => !st.det[x.k]).length }

    // 3. IMDb ratings (official dataset), once a day
    if (!stage && isDue(st.rat.at, 20 * 3600_000, 'rat')) {
      stage = 'rat'
      const want = new Set(Object.values(st.det).map((d: any) => d.im).filter(Boolean))
      const map: J = {}
      await lines('https://datasets.imdbws.com/title.ratings.tsv.gz', true, (l) => {
        const t = l.slice(0, l.indexOf('\t'))
        if (want.has(t)) { const [, r, v] = l.split('\t'); map[t] = [Number(r), Number(v)] }
      })
      if (Object.keys(map).length > 100) st.rat = { at: new Date().toISOString(), map }
      log.ratings = Object.keys(map).length
    }

    // 4. Oscar wins (Wikidata), once a week. 2 = Best Picture, 1 = any other category
    if (!stage && isDue(st.osc.at, 7 * DAY, 'osc')) {
      stage = 'osc'
      const q = `SELECT DISTINCT ?imdb ?l WHERE {
        ?aw wdt:P1027 wd:Q212329 ; rdfs:label ?l . FILTER(lang(?l)="en" && STRSTARTS(?l, "Academy Award for Best"))
        { ?film p:P166/ps:P166 ?aw . } UNION { ?x p:P166 ?st . ?st ps:P166 ?aw ; pq:P1686 ?film . }
        ?film wdt:P345 ?imdb . FILTER(STRSTARTS(?imdb, "tt")) }`
      const r = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), { headers: { 'user-agent': 'whats-on-netflix-il/1.0 (personal)', accept: 'application/sparql-results+json' }, signal: AbortSignal.timeout(60000) })
      if (r.ok) {
        // every competitive win counts toward the number of Oscars (Oren 17.11.2026); tier 2 = Best Picture, 1 = any other
        const j = await r.json(), ids: J = {}, cats: J = {}
        for (const b of j.results.bindings) {
          const l = b.l.value, im = b.imdb.value
          const tier = /Best Picture$/.test(l) ? 2 : 1
          ids[im] = Math.max(ids[im] || 0, tier)
          ;(cats[im] ??= new Set()).add(l.replace('Academy Award for ', ''))
        }
        if (Object.keys(ids).length > 200) {
          st.osc = { at: new Date().toISOString(), ids }
          st.osc_cats = Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, [...(v as Set<string>)]]))
        }
        log.oscars = Object.keys(ids).length
      } else log.oscars = 'HTTP_' + r.status
    }

    // 5. Netflix Top 10 (official TSV): Israel and global, last 52 weeks, once a day
    if (!stage && isDue(st.top.at, 20 * 3600_000, 'top')) {
      stage = 'top'
      const since = new Date(Date.now() - 365 * DAY).toISOString().slice(0, 10)
      const il: J = {}, w: J = {}
      const add = (m: J, cat: string, title: string, rank: number, week: string) => {
        const key = (/^Films/.test(cat) ? 'm:' : 's:') + norm(title)
        const o = m[key] ??= { w: 0, b: 99, last: '' }
        o.w++; o.b = Math.min(o.b, rank); if (week > o.last) o.last = week
      }
      let hdr: string[] = []
      await lines('https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv', false, (l) => {
        if (hdr.length && l.indexOf('\tIL\t') < 0) return
        const c = l.split('\t'); if (!hdr.length) { hdr = c; return }
        const g = (n: string) => c[hdr.indexOf(n)]
        if (g('country_iso2') !== 'IL' || g('week') < since) return
        add(il, g('category'), g('show_title'), Number(g('weekly_rank')), g('week'))
      })
      hdr = []
      await lines('https://www.netflix.com/tudum/top10/data/all-weeks-global.tsv', false, (l) => {
        const c = l.split('\t'); if (!hdr.length) { hdr = c; return }
        const g = (n: string) => c[hdr.indexOf(n)]
        if (g('week') < since) return
        add(w, g('category'), g('show_title'), Number(g('weekly_rank')), g('week'))
      })
      if (Object.keys(il).length > 20) st.top = { at: new Date().toISOString(), il, w }
      log.top = { il: Object.keys(il).length, w: Object.keys(w).length }
    }

    if (!stage) return res(200, { ok: true, idle: true, ms: Math.round(performance.now() - t0) })
    log.stage = stage
    // 6. Build the public catalog (compact keys, see netflix-il/app.js)
    const items: J[] = []
    for (const x of list) {
      const d = st.det[x.k] || {}
      if (d.gone) continue
      const r = d.im ? st.rat.map?.[d.im] : null
      const isIL = x.ol === 'he' || (x.oc || []).includes('IL') || (d.pc || []).includes('IL')
      const tk = x.k[0] + ':'
      const tIL = st.top.il?.[tk + norm(x.n)] || st.top.il?.[tk + norm(x.on)]
      const tW = st.top.w?.[tk + norm(x.n)] || st.top.w?.[tk + norm(x.on)]
      const o: J = { k: x.k, n: x.n, p: x.p, y: Number(String(x.d).slice(0, 4)) || null, g: x.g, f: st.first[x.k], pop: x.pop }
      if (d.hn && d.hn !== x.n) o.hn = d.hn
      if (isIL) o.il = 1
      if (x.ol && x.ol !== 'en') o.ol = x.ol
      if (d.im) o.im = d.im
      if (r) { o.r = r[0]; o.v = r[1] }
      if (d.im && st.osc.ids?.[d.im]) { o.os = st.osc.ids[d.im]; o.oc = st.osc_cats?.[d.im] }
      if (x.k[0] === 's') { o.s = d.s; o.e = d.e }
      if (tIL) o.til = [tIL.w, tIL.b]
      if (tW) o.tw = [tW.w, tW.b]
      items.push(o)
    }
    const cat = { at: new Date().toISOString(), src: { disc: st.disc_at, rat: st.rat.at, osc: st.osc.at, top: st.top.at }, pending: log.details.missing, items }
    await save('state.json', st, '0')
    await save('catalog.json', cat)
    return res(200, { ok: true, items: items.length, ms: Math.round(performance.now() - t0), ...log })
  } catch (e) {
    return res(500, { ok: false, error: String(e), ms: Math.round(performance.now() - t0), ...log })
  }
})
