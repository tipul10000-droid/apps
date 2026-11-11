-- 11.11.2026 (אורן): תשובות פתוחות שהילד מקליד באפליקציה. Claude בודק אותן (ריצה מתוזמנת), נותן ציון 0-10 והערה, והציון חוזר לאפליקציה ולאזור ההורים.
-- הילד שולח דרך study_answer_add ומקבל מזהה (uuid). הציון נקרא רק לפי המזהים שיש במכשיר שלו (study_answer_get).
-- ההורים רואים את כל התשובות של ילדי המשפחה שלהם (study_parents_answers). הבדיקה עצמה רצה כ-Claude (service role), לא דרך anon.
create table if not exists public.study_answers (
  id uuid primary key default gen_random_uuid(),
  kid text not null check (char_length(kid) between 1 and 20),
  app text not null check (char_length(app) between 1 and 20),
  qid text not null check (char_length(qid) between 1 and 40),
  q text not null check (char_length(q) <= 1500),
  model text not null default '' check (char_length(model) <= 3000),
  pts jsonb not null default '[]'::jsonb,
  txt text not null check (char_length(txt) between 1 and 1500),
  created_at timestamptz not null default now(),
  score int check (score between 0 and 10),
  fb text check (char_length(fb) <= 1500),
  graded_at timestamptz,
  hidden boolean not null default false
);
create index if not exists study_answers_open on public.study_answers (created_at) where score is null;
alter table public.study_answers enable row level security;
revoke all on public.study_answers from anon, authenticated;

create or replace function public.study_answer_add(p_kid text, p_app text, p_qid text, p_q text, p_model text, p_pts jsonb, p_txt text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare i uuid;
begin
  if p_kid is null or not exists (select 1 from public.study_kids where kid = p_kid) then return jsonb_build_object('ok', false, 'err', 'kid'); end if;
  if char_length(coalesce(trim(p_txt), '')) < 2 then return jsonb_build_object('ok', false, 'err', 'empty'); end if;
  if (select count(*) from public.study_answers where kid = p_kid and created_at > now() - interval '1 hour') >= 60 then return jsonb_build_object('ok', false, 'err', 'rate'); end if;
  insert into public.study_answers(kid, app, qid, q, model, pts, txt)
  values (p_kid, left(p_app, 20), left(p_qid, 40), left(coalesce(p_q, ''), 1500), left(coalesce(p_model, ''), 3000), coalesce(p_pts, '[]'::jsonb), left(trim(p_txt), 1500))
  returning id into i;
  return jsonb_build_object('ok', true, 'id', i);
end $$;

create or replace function public.study_answer_get(p_ids uuid[])
returns jsonb language sql security definer set search_path to '' as $$
  select jsonb_build_object('ok', true, 'items', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'score', score, 'fb', fb, 'graded_at', graded_at))
    from public.study_answers where id = any(p_ids[1:50])), '[]'::jsonb));
$$;

create or replace function public.study_parents_answers(p_pin text, p_kid text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare f text := public.study_parents_fam(p_pin);
begin
  if f in ('bad','locked') then return jsonb_build_object('ok', false, 'err', f); end if;
  if public.study_kid_fam(p_kid) is distinct from f then return jsonb_build_object('ok', false, 'err', 'arg'); end if;
  return jsonb_build_object('ok', true, 'items', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'app', app, 'qid', qid, 'q', q, 'txt', txt, 'score', score, 'fb', fb, 'at', created_at, 'graded_at', graded_at) order by created_at desc)
    from (select * from public.study_answers where kid = p_kid and not hidden order by created_at desc limit 200) a), '[]'::jsonb));
end $$;

revoke all on function public.study_answer_add(text,text,text,text,text,jsonb,text) from public;
revoke all on function public.study_answer_get(uuid[]) from public;
revoke all on function public.study_parents_answers(text,text) from public;
grant execute on function public.study_answer_add(text,text,text,text,text,jsonb,text) to anon, authenticated;
grant execute on function public.study_answer_get(uuid[]) to anon, authenticated;
grant execute on function public.study_parents_answers(text,text) to anon, authenticated;
