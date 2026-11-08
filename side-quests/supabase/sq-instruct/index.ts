// Side Quests "instruction" button (v13.5, Oren 8.11.2026).
// The app sends free text (typed or dictated): "add a small task...", "this task and that one: fix X",
// "move Y to tomorrow", "Z is more urgent". Claude reads it against all open tasks and returns a list of
// small, safe changes, which this function applies to sq_docs (merge only the changed fields, log line on
// every task, before-snapshots kept for undo). Without ANTHROPIC_API_KEY the instruction stays "pending"
// in sidequests/instructions and the scheduled All Arounder run handles it.
// Auth: the 6-digit app code (same check as sq_open: sq_auth, 5 wrong = locked).
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const APP = "sidequests";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...CORS } });
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");
const OPEN = ["active", "waiting_me", "waiting_other", "paused"];

async function getDoc(coll: string, id: string) {
  const { data } = await sb.from("sq_docs").select("data,version").eq("app", APP).eq("collection", coll).eq("id", id).maybeSingle();
  return data as { data: any; version: number } | null;
}
async function putDoc(coll: string, id: string, data: any, version?: number) {
  const { error } = await sb.from("sq_docs").upsert({ app: APP, collection: coll, id, data, version: (version || 0) + 1, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

// ---------- the model's answer ----------
const S = { type: ["string", "null"] };
const OP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "ops"],
  properties: {
    reply: { type: "string", description: "Hebrew, one short line: what was done (or what is unclear)" },
    ops: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["op", "id", "title", "status", "priority", "urgent", "next_date", "next_step", "stand", "waiting_for", "size", "note", "fit_note", "fit_where", "fit_hours", "add_step", "done_step", "deadline", "day_plan_n", "why"],
        properties: {
          op: { type: "string", enum: ["add", "update"] },
          id: { ...S, description: "existing task id for update; null for add" },
          title: S, status: { type: ["string", "null"], enum: ["active", "waiting_me", "waiting_other", "paused", "done", "archived", null] },
          priority: { type: ["string", "null"], enum: ["high", "normal", null] },
          urgent: { type: ["boolean", "null"] },
          next_date: { ...S, description: "YYYY-MM-DD, or empty string to clear" },
          next_step: S, stand: S, waiting_for: S,
          size: { type: ["string", "null"], enum: ["quick", "trip", "long", null] },
          note: { ...S, description: "Oren's remark to keep on the task (goes to the log and summary)" },
          fit_note: { ...S, description: "when/where it is relevant, e.g. 'only when I am in Netanya'" },
          fit_where: S, fit_hours: { ...S, description: "opening hours text, e.g. 'א׳-ה׳ 08:00-17:00'" },
          add_step: { ...S, description: "a new sub-step for Oren" },
          done_step: { ...S, description: "id of a step that is now done" },
          deadline: { ...S, description: "YYYY-MM-DD hard deadline" },
          day_plan_n: { type: ["integer", "null"], description: "position in today's order (1 = first)" },
          why: { type: "string", description: "Hebrew, few words, for the task log" },
        },
      },
    },
  },
};

function brief(t: any) {
  const f = t.fit || {};
  const parts = [
    `id=${t.id}`, `title=${t.title || ""}`, `status=${t.status || ""}`,
    t.priority === "high" ? "priority=high" : "", t.urgent ? "urgent" : "",
    t.next_date ? `next_date=${t.next_date}` : "", t.deadline ? `deadline=${JSON.stringify(t.deadline)}` : "",
    t.stand ? `stand=${t.stand}` : "", t.next_step ? `next=${t.next_step}` : "", t.waiting_for ? `waiting=${t.waiting_for}` : "",
    t.quest ? `quest=${t.quest}` : "", t.project ? `project=${t.project}` : "",
    f.note ? `fit=${f.note}` : "", f.where ? `where=${f.where}` : "", f.hours ? `hours=${f.hours}` : "",
    t.day_plan && t.day_plan.n ? `day_plan=${t.day_plan.date}#${t.day_plan.n}` : "",
    Array.isArray(t.steps) && t.steps.length ? "steps=" + t.steps.map((s: any) => `${s.id}${s.done ? "✓" : ""}:${String(s.text || "").slice(0, 60)}`).join(" | ") : "",
  ];
  return parts.filter(Boolean).join(" · ");
}

const SYSTEM = `אתה All Arounder, העוזר של אורן, ומנהל את לוח המשימות שלו (Side Quests).
אורן כתב או הקליט הוראה מתוך האפליקציה, כשכל המשימות פתוחות מולו. ההוראה היא כמו הודעה בצ׳אט, לא בהכרח משימה חדשה.
- "תוסיף משימה ..." = op add עם כותרת קצרה וברורה (לא להעתיק את כל הטקסט כמו שהוא; לנסח כותרת של כמה מילים, ופרטים ב-note).
- הערה על משימה קיימת ("שים לב, המשימה הזאת...", "זה רלוונטי רק כש...", "תעביר למחר", "יותר דחוף") = op update למשימה הנכונה לפי הכותרת/התוכן. הוראה אחת יכולה לגעת בכמה משימות.
- "סיימתי"/"עשיתי" = status done. "לא רלוונטי"/"תוריד" = status archived (לעולם לא למחוק).
- משנים רק את השדות שההוראה נוגעת בהם; כל שדה אחר = null. תאריכים יחסיים לפי היום (ישראל).
- אם לא ברור לאיזו משימה הכוונה: ops ריק, ו-reply ששואל בקצרה.
- הוראות שדורשות לשלוח הודעה או מייל לאנשים, או כסף/תשלום: לא לבצע. אפשר רק לרשום משימה לאורן.
- reply: שורה אחת בעברית פשוטה, מה עשית.`;

async function interpret(text: string, ctx: any, topics: any[]) {
  const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
  const today = new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", dateStyle: "full", timeStyle: "short" }).format(new Date());
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  const open = topics.filter((t) => OPEN.includes(t.status) || !t.status);
  const list = open.map(brief).join("\n");
  const screen = [ctx.quest ? `קווסט פתוח: ${ctx.quest}` : "", ctx.open ? `משימה פתוחה על המסך: ${ctx.open}` : ""].filter(Boolean).join(" · ");
  const msg = await (client as any).beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: OP_SCHEMA } },
    system: [{ type: "text", text: SYSTEM }],
    messages: [{
      role: "user",
      content: `היום: ${today} (${iso}). ${screen}\n\nהמשימות הפתוחות:\n${list}\n\nההוראה של אורן:\n${text}`,
    }],
  });
  if (msg.stop_reason === "refusal") throw new Error("refusal");
  const tb = (msg.content || []).find((b: any) => b.type === "text");
  return JSON.parse(tb.text);
}

// ---------- apply ----------
function applyOp(t: any, o: any, at: string, instr: string) {
  const set: any = {};
  for (const k of ["title", "status", "priority", "next_step", "stand", "waiting_for", "size"]) if (o[k] != null && o[k] !== "") set[k] = String(o[k]);
  for (const k of ["stand", "waiting_for", "next_step"]) if (o[k] === "") set[k] = "";
  if (o.urgent != null) set.urgent = !!o.urgent;
  if (o.next_date != null) set.next_date = /^\d{4}-\d{2}-\d{2}$/.test(o.next_date) ? o.next_date : "";
  if (o.deadline && /^\d{4}-\d{2}-\d{2}$/.test(o.deadline)) set.deadline = { d: o.deadline, l: (t.deadline && t.deadline.l) || "" };
  if (o.status === "done") set.done_at = at;
  if (o.fit_note || o.fit_where || o.fit_hours) {
    set.fit = { ...(t.fit || {}), ...(o.fit_note ? { note: o.fit_note } : {}), ...(o.fit_where ? { where: o.fit_where } : {}), ...(o.fit_hours ? { hours: o.fit_hours } : {}) };
  }
  if (o.day_plan_n) {
    set.day_plan = { date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date()), n: o.day_plan_n };
  }
  if (o.note) set.summary = [t.summary, o.note].filter(Boolean).join("\n");
  let steps = Array.isArray(t.steps) ? t.steps.slice() : null;
  if (o.add_step) { steps = steps || []; steps.push({ id: "i" + Date.now().toString(36) + steps.length, text: o.add_step, who: "oren", done: false, from: "instruction" }); }
  if (o.done_step && steps) steps = steps.map((s: any) => (s.id === o.done_step ? { ...s, done: true, done_at: at } : s));
  if (steps) set.steps = steps;
  const log = (Array.isArray(t.log) ? t.log : []).concat([{ at, text: `הוראה מהאפליקציה: ${o.why || "עודכן"}${o.note ? ` (${o.note})` : ""}` }]);
  return { ...t, ...set, log, updated_at: at, sync: { at, from: "הוראה באפליקציה", text: instr.slice(0, 300) } };
}

async function run(id: string, ins: any) {
  const at = nowIso();
  const { data: rows } = await sb.from("sq_docs").select("id,data,version").eq("app", APP).eq("collection", "topics");
  const all = (rows || []).filter((r: any) => !(r.data && r.data._deleted));
  const topics = all.map((r: any) => ({ ...r.data, id: r.id }));
  const res = await interpret(ins.text, ins.ctx || {}, topics);
  const done: any[] = [], undo: any[] = [];
  for (const o of res.ops || []) {
    try {
      if (o.op === "add") {
        if (!o.title) continue;
        const nid = "t-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const base = {
          title: String(o.title).slice(0, 200), kind: "task", status: o.status || "active", priority: o.priority || "normal",
          area: "", next_step: o.next_step || "", next_date: /^\d{4}-\d{2}-\d{2}$/.test(o.next_date || "") ? o.next_date : "",
          summary: o.note || "", stand: o.stand || "", waiting_for: o.waiting_for || "", links: [], size: o.size || "quick",
          source: "הוראה באפליקציה", created_at: at, updated_at: at,
          ...(ins.ctx && ["side", "army", "work", "travel", "ai"].includes(ins.ctx.quest) ? { quest: ins.ctx.quest } : {}),
          ...(o.urgent ? { urgent: true } : {}),
          ...(o.fit_note || o.fit_where || o.fit_hours ? { fit: { v: 3, by: "claude", ...(o.fit_note ? { note: o.fit_note } : {}), ...(o.fit_where ? { where: o.fit_where } : {}), ...(o.fit_hours ? { hours: o.fit_hours } : {}) } } : {}),
          ...(o.add_step ? { steps: [{ id: "i1", text: o.add_step, who: "oren", done: false }] } : {}),
          log: [{ at, text: `נוסף מהוראה באפליקציה: ${ins.text.slice(0, 200)}` }],
        };
        await putDoc("topics", nid, base, 0);
        done.push({ id: nid, title: base.title, what: "נוספה" });
        undo.push({ id: nid, before: null });
      } else if (o.op === "update" && o.id) {
        const cur = await getDoc("topics", o.id);
        if (!cur || !cur.data || cur.data._deleted) continue;
        const next = applyOp(cur.data, o, at, ins.text);
        await putDoc("topics", o.id, next, cur.version);
        done.push({ id: o.id, title: next.title, what: o.why || "עודכנה" });
        undo.push({ id: o.id, before: cur.data });
      }
    } catch (e) { done.push({ id: o.id, title: o.title, what: "נכשל: " + String((e as Error).message || e).slice(0, 80) }); }
  }
  const out = { ...ins, status: "done", done_at: at, reply: res.reply || "", ops: done, undo };
  await putDoc("instructions", id, out);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "ping") return json({ ai: !!Deno.env.get("ANTHROPIC_API_KEY") });
    const { data: ok } = await sb.rpc("sq_auth", { p_key: String(body.key || ""), p_app: APP });
    if (ok !== "ok") return json({ error: ok === "locked" ? "locked" : "bad key" }, 401);
    const id = String(body.id || "");
    if (!/^[\w-]{3,80}$/.test(id)) return json({ error: "id" }, 400);
    const d = await getDoc("instructions", id);
    if (!d || !d.data || !d.data.text) return json({ error: "not found" }, 404);
    if (d.data.status === "done") return json(d.data);
    if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ status: "pending", queued: true });
    await putDoc("instructions", id, { ...d.data, status: "working", started_at: nowIso() }, d.version);
    try {
      return json(await run(id, d.data));
    } catch (e) {
      const cur = await getDoc("instructions", id);
      await putDoc("instructions", id, { ...(cur?.data || d.data), status: "pending", error: String((e as Error).message || e).slice(0, 200) }, cur?.version);
      return json({ status: "pending", queued: true, error: String((e as Error).message || e).slice(0, 200) });
    }
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
