// sq-passkey: Face ID / passkey login for Side Quests (Oren 19.11.2026).
// POST {a: "reg-options"|"reg-verify"|"auth-options"|"auth-verify", ...}
// Registering a new passkey needs the Side Quests code (checked by sq_check, same throttle).
// Signing in needs only a valid passkey assertion. Tables: sq_passkeys, sq_passkey_chal (service role only).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from "npm:@simplewebauthn/server@13.1.1";
import { isoBase64URL } from "npm:@simplewebauthn/server@13.1.1/helpers";

const RP_ID = "tipul10000-droid.github.io";
const ORIGIN = "https://tipul10000-droid.github.io";
const CORS = { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Content-Type": "application/json" };
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: CORS });

async function newChal(challenge: string, kind: string) {
  await sb.from("sq_passkey_chal").delete().lt("created_at", new Date(Date.now() - 5 * 60e3).toISOString());
  const { count } = await sb.from("sq_passkey_chal").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 200) throw new Error("busy");
  const { data, error } = await sb.from("sq_passkey_chal").insert({ challenge, kind }).select("id").single();
  if (error) throw error;
  return data.id as string;
}
async function takeChal(id: string, kind: string) {
  if (!/^[0-9a-f-]{36}$/.test(String(id || ""))) return null;
  const { data } = await sb.from("sq_passkey_chal").delete().eq("id", id).eq("kind", kind)
    .gt("created_at", new Date(Date.now() - 5 * 60e3).toISOString()).select("challenge").maybeSingle();
  return data?.challenge as string | undefined ?? null;
}
async function pinOk(pin: unknown) {
  if (typeof pin !== "string" || !pin) return false;
  const { data } = await sb.rpc("sq_check", { p_key: pin, p_app: "sidequests" });
  return data === true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return j({ err: "method" }, 405);
  let b: any = {};
  try { b = await req.json(); } catch (_) { return j({ err: "json" }, 400); }
  try {
    if (b.a === "reg-options") {
      if (!(await pinOk(b.pin))) return j({ err: "pin" }, 403);
      const { data: ex } = await sb.from("sq_passkeys").select("cred_id,transports").is("revoked_at", null);
      const opts = await generateRegistrationOptions({
        rpName: "Side Quests", rpID: RP_ID, userName: "Side Quests", userDisplayName: "Side Quests",
        userID: new TextEncoder().encode("sidequests-owner"), attestationType: "none",
        authenticatorSelection: { residentKey: "preferred", userVerification: "required", authenticatorAttachment: "platform" },
        excludeCredentials: (ex || []).map((c: any) => ({ id: c.cred_id, transports: c.transports || undefined })),
      });
      return j({ cid: await newChal(opts.challenge, "reg"), opts });
    }
    if (b.a === "reg-verify") {
      if (!(await pinOk(b.pin))) return j({ err: "pin" }, 403);
      const ch = await takeChal(b.cid, "reg");
      if (!ch) return j({ err: "challenge" }, 400);
      const v = await verifyRegistrationResponse({ response: b.resp, expectedChallenge: ch, expectedOrigin: ORIGIN, expectedRPID: RP_ID, requireUserVerification: true });
      if (!v.verified || !v.registrationInfo) return j({ err: "verify" }, 400);
      const c = v.registrationInfo.credential;
      const { error } = await sb.from("sq_passkeys").upsert({
        cred_id: c.id, pubkey: isoBase64URL.fromBuffer(c.publicKey), counter: c.counter,
        transports: c.transports || null, device: String(b.device || "").slice(0, 40) || null, revoked_at: null,
      });
      if (error) throw error;
      return j({ ok: true, id: c.id });
    }
    if (b.a === "auth-options") {
      const id = typeof b.id === "string" && /^[A-Za-z0-9_-]{8,400}$/.test(b.id) ? b.id : null;
      const opts = await generateAuthenticationOptions({ rpID: RP_ID, userVerification: "required", allowCredentials: id ? [{ id }] : [] });
      return j({ cid: await newChal(opts.challenge, "auth"), opts });
    }
    if (b.a === "auth-verify") {
      const ch = await takeChal(b.cid, "auth");
      if (!ch) return j({ err: "challenge" }, 400);
      const id = b.resp?.id;
      if (typeof id !== "string") return j({ err: "resp" }, 400);
      const { data: c } = await sb.from("sq_passkeys").select("*").eq("cred_id", id).is("revoked_at", null).maybeSingle();
      if (!c) return j({ err: "unknown" }, 403);
      const v = await verifyAuthenticationResponse({
        response: b.resp, expectedChallenge: ch, expectedOrigin: ORIGIN, expectedRPID: RP_ID, requireUserVerification: true,
        credential: { id: c.cred_id, publicKey: isoBase64URL.toBuffer(c.pubkey), counter: Number(c.counter), transports: c.transports || undefined },
      });
      if (!v.verified) return j({ err: "verify" }, 403);
      await sb.from("sq_passkeys").update({ counter: v.authenticationInfo.newCounter, last_used_at: new Date().toISOString() }).eq("cred_id", id);
      return j({ ok: true });
    }
    return j({ err: "action" }, 400);
  } catch (e) {
    return j({ err: String((e as Error)?.message || e).slice(0, 200) }, 500);
  }
});
