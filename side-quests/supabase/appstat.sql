-- סטטיסטיקת שימוש לכל האפליקציות של אורן (אורן 18.11.2026). פרויקט family-apps, הקידומת appstat_.
-- כל אפליקציה שולחת "פינג" אנונימי (appstat.js): מזהה מכשיר אקראי, שניות שימוש פעיל, גרסה, ומזהה משתמש מגובב אם יש.
-- אין שמות ואין מידע אישי. הטבלאות סגורות ל-anon. כתיבה רק דרך appstat_ping, קריאה רק דרך appstat_get עם הקוד של Side Quests.

create table if not exists public.appstat_dev (
  app text not null, dev text not null,
  uid text, own boolean default false, plat text, ver text,
  first_at timestamptz not null default now(), last_at timestamptz not null default now(),
  secs integer not null default 0, opens integer not null default 0,
  primary key (app, dev));
create table if not exists public.appstat_day (
  app text not null, day date not null, dev text not null,
  secs integer not null default 0, opens integer not null default 0,
  primary key (app, day, dev));
create table if not exists public.appstat_ver (
  app text not null, ver text not null,
  first_at timestamptz not null default now(), last_at timestamptz not null default now(), devs integer not null default 0,
  primary key (app, ver));
alter table public.appstat_dev enable row level security;
alter table public.appstat_day enable row level security;
alter table public.appstat_ver enable row level security;

-- p_secs = שניות שימוש פעיל מאז הפינג הקודם (עד 120), p_open = פתיחה חדשה של האפליקציה
create or replace function public.appstat_ping(p_app text, p_dev text, p_secs integer default 0, p_open boolean default false,
  p_ver text default null, p_uid text default null, p_own boolean default false, p_plat text default null)
 returns boolean language plpgsql security definer set search_path to 'public'
as $f$
declare s int := greatest(0, least(coalesce(p_secs,0), 120)); o int := case when p_open then 1 else 0 end;
  d date := (now() at time zone 'Asia/Jerusalem')::date; v text := nullif(left(coalesce(p_ver,''),24),'');
begin
  if p_app !~ '^[a-z0-9-]{2,30}$' or p_dev !~ '^[A-Za-z0-9_-]{8,40}$' then return false; end if;
  insert into appstat_dev(app, dev, uid, own, plat, ver, secs, opens)
    values (p_app, p_dev, nullif(left(coalesce(p_uid,''),40),''), coalesce(p_own,false), left(p_plat,12), v, s, o)
  on conflict (app, dev) do update set last_at = now(), secs = appstat_dev.secs + s, opens = appstat_dev.opens + o,
    uid = coalesce(excluded.uid, appstat_dev.uid), own = appstat_dev.own or excluded.own,
    plat = coalesce(excluded.plat, appstat_dev.plat), ver = coalesce(excluded.ver, appstat_dev.ver);
  insert into appstat_day(app, day, dev, secs, opens) values (p_app, d, p_dev, s, o)
  on conflict (app, day, dev) do update set secs = appstat_day.secs + s, opens = appstat_day.opens + o;
  if v is not null then
    insert into appstat_ver(app, ver) values (p_app, v)
    on conflict (app, ver) do update set last_at = now();
  end if;
  return true;
end $f$;

-- כל הסטטיסטיקה של כל האפליקציות, רק עם הקוד של Side Quests
create or replace function public.appstat_get(p_key text, p_app text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $f$
declare st text; today date := (now() at time zone 'Asia/Jerusalem')::date;
begin
  st := sq_auth(p_key, p_app);
  if st <> 'ok' then return jsonb_build_object('status', st); end if;
  return jsonb_build_object('status','ok','today',today,'apps', coalesce((
    select jsonb_object_agg(a.app, jsonb_build_object(
      'first_at', (select min(first_at) from appstat_dev x where x.app=a.app),
      'last_at', (select max(last_at) from appstat_dev x where x.app=a.app),
      'devs', (select count(*) from appstat_dev x where x.app=a.app),
      'devs_own', (select count(*) from appstat_dev x where x.app=a.app and x.own),
      'users', (select count(distinct coalesce(uid, 'd:'||dev)) from appstat_dev x where x.app=a.app and not x.own),
      'uids', (select count(distinct uid) from appstat_dev x where x.app=a.app and uid is not null and not x.own),
      'secs', (select coalesce(sum(secs),0) from appstat_dev x where x.app=a.app),
      'secs_others', (select coalesce(sum(secs),0) from appstat_dev x where x.app=a.app and not x.own),
      'opens', (select coalesce(sum(opens),0) from appstat_dev x where x.app=a.app),
      'back', (select count(*) from (select dev from appstat_day y where y.app=a.app group by dev having count(*)>1) z),
      'plat', (select jsonb_object_agg(p, n) from (select coalesce(plat,'?') p, count(*) n from appstat_dev x where x.app=a.app group by 1) q),
      'act1', (select count(distinct dev) from appstat_day y where y.app=a.app and y.day=today),
      'act7', (select count(distinct dev) from appstat_day y where y.app=a.app and y.day>today-7),
      'act30', (select count(distinct dev) from appstat_day y where y.app=a.app and y.day>today-30),
      'devdays', (select count(*) from appstat_day y where y.app=a.app),
      'days', (select coalesce(jsonb_agg(jsonb_build_array(day, n, s) order by day),'[]') from (
          select day, count(distinct dev) n, sum(secs) s from appstat_day y where y.app=a.app and y.day>today-30 group by day) q),
      'vers', (select coalesce(jsonb_agg(jsonb_build_array(ver, first_at, (select count(*) from appstat_dev x where x.app=a.app and x.ver=q.ver)) order by first_at desc),'[]') from (
          select * from appstat_ver v where v.app=a.app order by first_at desc limit 12) q),
      'nvers', (select count(*) from appstat_ver v where v.app=a.app)
    )) from (select distinct app from appstat_dev) a), '{}'::jsonb));
end $f$;

revoke all on function public.appstat_ping(text,text,integer,boolean,text,text,boolean,text) from public;
revoke all on function public.appstat_get(text,text) from public;
grant execute on function public.appstat_ping(text,text,integer,boolean,text,text,boolean,text) to anon, authenticated;
grant execute on function public.appstat_get(text,text) to anon, authenticated;
