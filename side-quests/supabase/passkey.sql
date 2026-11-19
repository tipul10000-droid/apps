-- Face ID / passkey login for Side Quests (Oren 19.11.2026).
-- Only the sq-passkey edge function (service role) reads or writes these tables. Closed to anon.
create table if not exists public.sq_passkeys (
  cred_id text primary key,          -- base64url credential id
  pubkey text not null,              -- base64url COSE public key
  counter bigint not null default 0,
  transports text[],
  device text,                       -- short label, e.g. "iPhone"
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create table if not exists public.sq_passkey_chal (
  id uuid primary key default gen_random_uuid(),
  challenge text not null,
  kind text not null check (kind in ('reg','auth')),
  created_at timestamptz not null default now()
);
alter table public.sq_passkeys enable row level security;
alter table public.sq_passkey_chal enable row level security;
revoke all on public.sq_passkeys, public.sq_passkey_chal from anon, authenticated;
