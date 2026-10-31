-- Frida App: schema + RPC API
-- כל הגישה לנתונים עוברת דרך פונקציות (SECURITY DEFINER) עם טוקן התחברות.
-- הטבלאות סגורות לגמרי ל-anon/authenticated (RLS פעיל, בלי policies).

create extension if not exists pgcrypto with schema extensions;

-- ===== טבלאות =====

create table if not exists frida_groups (
  id          bigint generated always as identity primary key,
  name        text not null,
  weekday     smallint not null check (weekday between 0 and 6), -- 0=ראשון ... 6=שבת
  start_time  time not null,
  city        text not null,
  location    text,
  active      boolean not null default true,
  is_test     boolean not null default false,   -- נתוני בדיקה (יוסרו בהשקה)
  created_at  timestamptz not null default now()
);

create table if not exists frida_clients (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  phone        text not null unique,          -- ספרות בלבד, פורמט 05XXXXXXXX
  pin_hash     text,                          -- bcrypt של 3 ספרות ת"ז
  group_id     bigint references frida_groups(id) on delete set null,
  start_weight numeric(5,1),
  goal_weight  numeric(5,1),
  height_cm    smallint,
  birth_date   date,
  gender       text check (gender in ('f', 'm')),
  is_test      boolean not null default false,  -- נתוני בדיקה (יוסרו בהשקה)
  opened_at    date not null default current_date,
  notes        text,
  is_admin     boolean not null default false,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists frida_cards (
  id             bigint generated always as identity primary key,
  client_id      uuid not null references frida_clients(id) on delete cascade,
  sessions_total smallint not null check (sessions_total > 0),
  purchased_at   date not null default current_date,
  expires_at     date not null,
  price          numeric(8,2),
  notes          text,
  deleted_at     timestamptz,                   -- מחיקה רכה
  created_at     timestamptz not null default now(),
  check (expires_at >= purchased_at)
);
create index if not exists frida_cards_client_idx on frida_cards(client_id);

-- מפגש = הגעה לקבוצה, בדרך כלל עם שקילה. מנקב מפגש מהכרטיסייה הפעילה.
create table if not exists frida_visits (
  id          bigint generated always as identity primary key,
  client_id   uuid not null references frida_clients(id) on delete cascade,
  visit_date  date not null,
  group_id    bigint references frida_groups(id) on delete set null,
  weight      numeric(5,1) check (weight between 20 and 400),
  card_id     bigint references frida_cards(id) on delete set null,
  note        text,
  deleted_at  timestamptz,                       -- מחיקה רכה (שורה נשמרת לשחזור)
  created_at  timestamptz not null default now(),
  unique (client_id, visit_date)
);
create index if not exists frida_visits_date_idx on frida_visits(visit_date);

create table if not exists frida_sessions (
  token_hash  text primary key,
  client_id   uuid not null references frida_clients(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create table if not exists frida_login_attempts (
  phone         text primary key,
  fails         int not null default 0,
  locked_until  timestamptz
);

alter table frida_groups         enable row level security;
alter table frida_clients        enable row level security;
alter table frida_cards    enable row level security;
alter table frida_visits         enable row level security;
alter table frida_sessions   enable row level security;
alter table frida_login_attempts enable row level security;
revoke all on frida_groups, frida_clients, frida_cards, frida_visits, frida_sessions, frida_login_attempts from anon, authenticated, public;

-- המנהלת. הסיסמה נקבעת בהתחברות הראשונה שלה (pin_hash ריק).
insert into frida_clients (full_name, phone, is_admin)
values ('מנהלת', '05XXXXXXXX', true)  -- מציין מקום. המספר האמיתי מוכנס ישירות ב-Supabase
on conflict (phone) do nothing;

-- ===== פונקציות פנימיות =====

create or replace function frida_norm_phone(p text) returns text
language sql immutable set search_path = '' as $$
  select case
    when d like '972%' then '0' || substr(d, 4)
    else d end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x
$$;

create or replace function frida_session_client(p_token text) returns public.frida_clients
language plpgsql stable security definer set search_path = '' as $$
declare c public.frida_clients;
begin
  select cl.* into c
  from public.frida_sessions s join public.frida_clients cl on cl.id = s.client_id
  where s.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and s.expires_at > now() and cl.active;
  if c.id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return c;
end $$;

create or replace function frida_require_admin(p_token text) returns public.frida_clients
language plpgsql stable security definer set search_path = '' as $$
declare c public.frida_clients;
begin
  c := public.frida_session_client(p_token);
  if not c.is_admin then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return c;
end $$;

-- כרטיסיות של לקוח עם ניצול ויתרה
create or replace function frida_cards_json(p_client uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', pc.id, 'sessions_total', pc.sessions_total, 'purchased_at', pc.purchased_at,
      'expires_at', pc.expires_at, 'price', pc.price, 'notes', pc.notes,
      'used', (select count(*) from public.frida_visits v where v.card_id = pc.id and v.deleted_at is null)
    ) order by pc.purchased_at desc, pc.id desc), '[]'::jsonb)
  from public.frida_cards pc where pc.client_id = p_client and pc.deleted_at is null
$$;

-- הכרטיסייה שממנה מנקבים מפגש בתאריך נתון: בתוקף, עם יתרה, הקרובה ביותר לפקיעה
create or replace function frida_active_card(p_client uuid, p_date date) returns bigint
language sql stable security definer set search_path = '' as $$
  select pc.id from public.frida_cards pc
  where pc.client_id = p_client and pc.deleted_at is null
    and p_date between pc.purchased_at and pc.expires_at
    and (select count(*) from public.frida_visits v where v.card_id = pc.id and v.deleted_at is null) < pc.sessions_total
  order by pc.expires_at, pc.id
  limit 1
$$;

create or replace function frida_client_json(p_client uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'client', jsonb_build_object(
      'id', c.id, 'full_name', c.full_name, 'phone', c.phone, 'group_id', c.group_id,
      'start_weight', c.start_weight, 'goal_weight', c.goal_weight, 'height_cm', c.height_cm,
      'birth_date', c.birth_date, 'gender', c.gender, 'is_test', c.is_test,
      'opened_at', c.opened_at, 'notes', c.notes, 'active', c.active),
    'group', (select to_jsonb(g) - 'created_at' from public.frida_groups g where g.id = c.group_id),
    'cards', public.frida_cards_json(c.id),
    'visits', coalesce((select jsonb_agg(jsonb_build_object(
        'id', v.id, 'visit_date', v.visit_date, 'weight', v.weight, 'card_id', v.card_id,
        'group_id', v.group_id, 'note', v.note) order by v.visit_date)
      from public.frida_visits v where v.client_id = c.id and v.deleted_at is null), '[]'::jsonb)
  )
  from public.frida_clients c where c.id = p_client
$$;

-- ===== API ציבורי =====

create or replace function frida_login(p_phone text, p_pin text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  ph text := public.frida_norm_phone(p_phone);
  pin text := regexp_replace(coalesce(p_pin, ''), '\D', '', 'g');
  a public.frida_login_attempts;
  c public.frida_clients;
  tok text;
begin
  -- לקוחות אמיתיים: טלפון 10 ספרות + 3 ספרות. משתמשי בדיקה זמניים: ספרה אחת.
  if length(ph) < 1 or length(pin) not between 1 and 3 then
    raise exception 'bad_input' using errcode = '22023';
  end if;

  select * into a from public.frida_login_attempts where phone = ph;
  if a.locked_until is not null and a.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'locked', 'until', a.locked_until);
  end if;

  select * into c from public.frida_clients where phone = ph and active;

  -- התחברות ראשונה של המנהלת: קובעת את הסיסמה
  if c.id is not null and c.is_admin and c.pin_hash is null then
    update public.frida_clients set pin_hash = extensions.crypt(pin, extensions.gen_salt('bf'))
    where id = c.id;
  elsif c.id is null or c.pin_hash is null
        or c.pin_hash <> extensions.crypt(pin, c.pin_hash) then
    insert into public.frida_login_attempts as la (phone, fails) values (ph, 1)
    on conflict (phone) do update set
      fails = case when la.locked_until is not null and la.locked_until <= now() then 1 else la.fails + 1 end,
      locked_until = case
        when (case when la.locked_until is not null and la.locked_until <= now() then 1 else la.fails + 1 end) >= 5
        then now() + interval '15 minutes' else null end;
    return jsonb_build_object('ok', false, 'error', 'wrong');
  end if;

  update public.frida_login_attempts set fails = 0, locked_until = null where phone = ph;

  tok := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.frida_sessions (token_hash, client_id, expires_at)
  values (encode(extensions.digest(tok, 'sha256'), 'hex'), c.id, now() + interval '180 days');

  return jsonb_build_object('ok', true, 'token', tok, 'is_admin', c.is_admin, 'name', c.full_name);
end $$;

create or replace function frida_logout(p_token text) returns void
language sql volatile security definer set search_path = '' as $$
  update public.frida_sessions set expires_at = now()
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
$$;

-- הלקוח רואה רק את עצמו
create or replace function frida_my_data(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c public.frida_clients;
begin
  c := public.frida_session_client(p_token);
  return public.frida_client_json(c.id) || jsonb_build_object('is_admin', c.is_admin);
end $$;

-- ===== API מנהלת =====

-- תמונת מצב: קבוצות, לקוחות עם סיכום, ומפגשים בתאריך נתון
create or replace function frida_admin_overview(p_token text, p_date date default current_date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.frida_require_admin(p_token);
  return jsonb_build_object(
    'groups', coalesce((select jsonb_agg(to_jsonb(g) - 'created_at' order by g.weekday, g.start_time)
                        from public.frida_groups g), '[]'::jsonb),
    'clients', coalesce((select jsonb_agg(x order by x->>'full_name') from (
      select jsonb_build_object(
        'id', c.id, 'full_name', c.full_name, 'phone', c.phone, 'group_id', c.group_id,
        'start_weight', c.start_weight, 'goal_weight', c.goal_weight, 'opened_at', c.opened_at,
        'active', c.active, 'birth_date', c.birth_date, 'gender', c.gender, 'height_cm', c.height_cm,
        'is_test', c.is_test,
        'last_visit', lv.visit_date, 'last_weight', lw.weight, 'visits_count', vc.n,
        'card', (select jsonb_build_object('id', pc.id, 'sessions_total', pc.sessions_total,
                   'expires_at', pc.expires_at,
                   'used', (select count(*) from public.frida_visits v where v.card_id = pc.id and v.deleted_at is null))
                 from public.frida_cards pc where pc.client_id = c.id and pc.deleted_at is null
                 order by (pc.expires_at >= p_date) desc, pc.expires_at desc limit 1)
      ) x
      from public.frida_clients c
      left join lateral (select max(v.visit_date) visit_date, count(*) n from public.frida_visits v where v.client_id = c.id and v.deleted_at is null) vc on true
      left join lateral (select v.visit_date from public.frida_visits v where v.client_id = c.id and v.deleted_at is null order by v.visit_date desc limit 1) lv on true
      left join lateral (select v.weight from public.frida_visits v where v.client_id = c.id and v.deleted_at is null and v.weight is not null order by v.visit_date desc limit 1) lw on true
      where not c.is_admin) s), '[]'::jsonb),
    'visits_on_date', coalesce((select jsonb_agg(jsonb_build_object(
        'id', v.id, 'client_id', v.client_id, 'weight', v.weight, 'group_id', v.group_id,
        'card_id', v.card_id, 'note', v.note))
      from public.frida_visits v where v.visit_date = p_date and v.deleted_at is null), '[]'::jsonb),
    'prev_weights', coalesce((select jsonb_object_agg(t.client_id, t.weight) from (
        select distinct on (v.client_id) v.client_id, v.weight from public.frida_visits v
        where v.visit_date < p_date and v.weight is not null and v.deleted_at is null
        order by v.client_id, v.visit_date desc) t), '{}'::jsonb)
  );
end $$;

create or replace function frida_admin_client(p_token text, p_client uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.frida_require_admin(p_token);
  return public.frida_client_json(p_client);
end $$;

-- יצירה/עדכון לקוח. ביצירה אפשר לצרף כרטיסייה ראשונה (card_sessions, card_expires_at).
create or replace function frida_admin_save_client(p_token text, p jsonb) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  cid uuid := nullif(p->>'id', '')::uuid;
  ph text := public.frida_norm_phone(p->>'phone');
  pin text := regexp_replace(coalesce(p->>'pin', ''), '\D', '', 'g');
begin
  perform public.frida_require_admin(p_token);
  -- טלפון קיים שלא השתנה (למשל משתמש בדיקה) לא נבדק שוב
  if (length(ph) <> 10 or ph not like '05%')
     and not exists (select 1 from public.frida_clients where id = cid and phone = ph) then
    raise exception 'bad_phone' using errcode = '22023';
  end if;
  if pin <> '' and length(pin) <> 3 then
    raise exception 'bad_pin' using errcode = '22023';
  end if;
  if coalesce(trim(p->>'full_name'), '') = '' then
    raise exception 'bad_name' using errcode = '22023';
  end if;
  if exists (select 1 from public.frida_clients where phone = ph and id is distinct from cid) then
    raise exception 'phone_exists' using errcode = '23505';
  end if;

  if cid is null then
    if pin = '' then raise exception 'bad_pin' using errcode = '22023'; end if;
    insert into public.frida_clients (full_name, phone, pin_hash, group_id, start_weight, goal_weight,
                                height_cm, birth_date, gender, opened_at, notes)
    values (trim(p->>'full_name'), ph, extensions.crypt(pin, extensions.gen_salt('bf')),
            nullif(p->>'group_id', '')::bigint, nullif(p->>'start_weight', '')::numeric,
            nullif(p->>'goal_weight', '')::numeric, nullif(p->>'height_cm', '')::smallint,
            nullif(p->>'birth_date', '')::date, nullif(p->>'gender', ''),
            coalesce(nullif(p->>'opened_at', '')::date, current_date), nullif(p->>'notes', ''))
    returning id into cid;

    if nullif(p->>'card_sessions', '') is not null then
      insert into public.frida_cards (client_id, sessions_total, purchased_at, expires_at, price)
      values (cid, (p->>'card_sessions')::smallint,
              coalesce(nullif(p->>'opened_at', '')::date, current_date),
              (p->>'card_expires_at')::date, nullif(p->>'card_price', '')::numeric);
    end if;
  else
    update public.frida_clients set
      full_name = trim(p->>'full_name'),
      phone = ph,
      pin_hash = case when pin <> '' then extensions.crypt(pin, extensions.gen_salt('bf')) else pin_hash end,
      group_id = nullif(p->>'group_id', '')::bigint,
      start_weight = nullif(p->>'start_weight', '')::numeric,
      goal_weight = nullif(p->>'goal_weight', '')::numeric,
      height_cm = nullif(p->>'height_cm', '')::smallint,
      birth_date = nullif(p->>'birth_date', '')::date,
      gender = nullif(p->>'gender', ''),
      opened_at = coalesce(nullif(p->>'opened_at', '')::date, opened_at),
      notes = nullif(p->>'notes', ''),
      active = coalesce((p->>'active')::boolean, active)
    where id = cid and not is_admin;
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
    if pin <> '' then update public.frida_sessions set expires_at = now() where client_id = cid and expires_at > now(); end if;
  end if;
  return cid;
end $$;

create or replace function frida_admin_save_group(p_token text, p jsonb) returns bigint
language plpgsql volatile security definer set search_path = '' as $$
declare gid bigint := nullif(p->>'id', '')::bigint;
begin
  perform public.frida_require_admin(p_token);
  if gid is null then
    insert into public.frida_groups (name, weekday, start_time, city, location)
    values (trim(p->>'name'), (p->>'weekday')::smallint, (p->>'start_time')::time,
            trim(p->>'city'), nullif(trim(p->>'location'), ''))
    returning id into gid;
  else
    update public.frida_groups set name = trim(p->>'name'), weekday = (p->>'weekday')::smallint,
      start_time = (p->>'start_time')::time, city = trim(p->>'city'),
      location = nullif(trim(p->>'location'), ''),
      active = coalesce((p->>'active')::boolean, active)
    where id = gid;
  end if;
  return gid;
end $$;

create or replace function frida_admin_save_card(p_token text, p jsonb) returns bigint
language plpgsql volatile security definer set search_path = '' as $$
declare kid bigint := nullif(p->>'id', '')::bigint;
begin
  perform public.frida_require_admin(p_token);
  if kid is null then
    insert into public.frida_cards (client_id, sessions_total, purchased_at, expires_at, price, notes)
    values ((p->>'client_id')::uuid, (p->>'sessions_total')::smallint,
            coalesce(nullif(p->>'purchased_at', '')::date, current_date),
            (p->>'expires_at')::date, nullif(p->>'price', '')::numeric, nullif(p->>'notes', ''))
    returning id into kid;
  else
    update public.frida_cards set sessions_total = (p->>'sessions_total')::smallint,
      purchased_at = (p->>'purchased_at')::date, expires_at = (p->>'expires_at')::date,
      price = nullif(p->>'price', '')::numeric, notes = nullif(p->>'notes', '')
    where id = kid;
  end if;
  return kid;
end $$;

create or replace function frida_admin_delete_card(p_token text, p_id bigint) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.frida_require_admin(p_token);
  update public.frida_cards set deleted_at = now() where id = p_id;
  update public.frida_visits set card_id = null where card_id = p_id;
end $$;

-- רישום מפגש/שקילה. אם כבר קיים מפגש באותו יום - מעדכן אותו (גם אם נמחק קודם).
create or replace function frida_admin_save_visit(p_token text, p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  cl uuid := (p->>'client_id')::uuid;
  d date := coalesce(nullif(p->>'visit_date', '')::date, current_date);
  v public.frida_visits;
begin
  perform public.frida_require_admin(p_token);
  select * into v from public.frida_visits where client_id = cl and visit_date = d;
  if v.id is null then
    insert into public.frida_visits (client_id, visit_date, group_id, weight, card_id, note)
    values (cl, d,
            coalesce(nullif(p->>'group_id', '')::bigint, (select group_id from public.frida_clients where id = cl)),
            nullif(p->>'weight', '')::numeric, public.frida_active_card(cl, d), nullif(p->>'note', ''))
    returning * into v;
  else
    update public.frida_visits set weight = nullif(p->>'weight', '')::numeric,
      note = nullif(p->>'note', ''),
      group_id = coalesce(nullif(p->>'group_id', '')::bigint, group_id),
      deleted_at = null,
      card_id = case when deleted_at is null then coalesce(card_id, public.frida_active_card(cl, d))
                     else public.frida_active_card(cl, d) end
    where id = v.id returning * into v;
  end if;
  return to_jsonb(v) - 'created_at';
end $$;

create or replace function frida_admin_delete_visit(p_token text, p_id bigint) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.frida_require_admin(p_token);
  update public.frida_visits set deleted_at = now(), card_id = null where id = p_id;
end $$;

-- ===== הרשאות =====
do $$ declare f record; begin
  for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'frida\_%' loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
grant execute on function
  frida_login(text, text), frida_logout(text), frida_my_data(text),
  frida_admin_overview(text, date), frida_admin_client(text, uuid), frida_admin_save_client(text, jsonb),
  frida_admin_save_group(text, jsonb), frida_admin_save_card(text, jsonb), frida_admin_delete_card(text, bigint),
  frida_admin_save_visit(text, jsonb), frida_admin_delete_visit(text, bigint)
to anon, authenticated;
