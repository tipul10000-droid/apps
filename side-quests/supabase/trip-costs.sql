-- Trip costs (Oren 21.11.2026): sq_trip_costs() runs hourly (pg_cron "sq-trip-costs").
-- 1) For each booked trip (sq_docs trips, stage booked) whose costs.items have a `tx` watch {m, after, ils}:
--    when a matching card charge shows up in `transactions` (merchant ilike %m%, date >= after, amount within 8%),
--    the item becomes st "paid" with tx {at, d, ils}, and a "new" item tells Oren once.
-- 2) From the day before the trip until 5 days after it: costs.live = every card charge abroad (original currency
--    not ILS) dated inside the trip, minus merchants in costs.track.exclude (things already counted, like a hotel
--    paid at the desk), by category and by day, with the last 12 charges. Read-only on transactions.
-- Never in the public page: sq_trip_public returns a whitelist that has no `costs`.
create or replace function public.sq_trip_costs()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  r record; it jsonb; items jsonb; i int; n int; tx record; changed boolean; live jsonb;
  nw jsonb := '[]'::jsonb; ids jsonb; all_items jsonb; done int := 0; lv int := 0;
  now_s text := to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"');
  today date := (now() at time zone 'Asia/Jerusalem')::date;
  f date; t date; ex text[];
begin
  for r in select id, data from sq_docs where app='sidequests' and collection='trips'
            and coalesce(data->>'_deleted','')<>'true' and data->>'stage'='booked' and data ? 'costs'
  loop
    changed := false;
    items := coalesce(r.data->'costs'->'items','[]'::jsonb);
    n := jsonb_array_length(items);
    for i in 0..n-1 loop
      it := items->i;
      continue when it->'tx' is null or it->>'st' = 'paid' or coalesce(it->'tx'->>'m','') = '';
      select x.data->>'date' d, abs((x.data->>'amount')::numeric)/100 ils into tx from transactions x
       where x.data->>'merchant' ilike '%'||(it->'tx'->>'m')||'%'
         and x.data->>'date' >= coalesce(it->'tx'->>'after','2000-01-01')
         and coalesce((x.data->>'duplicate')::boolean,false) = false
         and (x.data->>'amount')::numeric < 0
         and (it->'tx'->>'ils' is null or abs(abs((x.data->>'amount')::numeric)/100 - (it->'tx'->>'ils')::numeric) <= (it->'tx'->>'ils')::numeric*0.08)
       order by x.data->>'date' limit 1;
      if found then
        items := jsonb_set(items, array[i::text], it || jsonb_build_object('st','paid',
          'tx', (it->'tx') || jsonb_build_object('at',now_s,'d',tx.d,'got',tx.ils)));
        nw := nw || jsonb_build_object('id','tc-'||r.id||'-'||i||'-'||tx.d,'at',now_s,
          'text','✓ החיוב נקלט באשראי: '||coalesce(it->>'l',''),
          'sub', to_char(tx.ils,'FM999,999.00')||' ₪ ב-'||to_char(tx.d::date,'DD.MM'),
          'where','dash:'||coalesce(r.data->>'dash',''),'dash',r.data->>'dash');
        changed := true; done := done + 1;
      end if;
    end loop;

    f := (r.data->>'from')::date; t := (r.data->>'to')::date;
    if today between f - 1 and t + 5 then
      select coalesce(array_agg(lower(e)), '{}') into ex from jsonb_array_elements_text(coalesce(r.data->'costs'->'track'->'exclude','[]'::jsonb)) e;
      with x as (
        select x.data->>'date' d, abs((x.data->>'amount')::numeric)/100 ils, x.data->>'merchant' m,
               x.data->>'originalCurrency' cur, abs((x.data->>'originalAmount')::numeric)/100 amt,
               case x.data->'providerCategory'->>'main' when 'FOOD_&_DRINKS' then 'food' when 'TRANSPORT' then 'transport'
                 when 'SHOPPING' then 'shopping' when 'LEISURE' then 'attractions' when 'ENTERTAINMENT' then 'attractions' else 'other' end k
          from transactions x
         where x.data->>'date' between f::text and t::text
           and coalesce(x.data->>'originalCurrency','ILS') <> 'ILS'
           and coalesce((x.data->>'duplicate')::boolean,false) = false
           and (x.data->>'amount')::numeric < 0
           and not exists (select 1 from unnest(ex) e where lower(x.data->>'merchant') like '%'||e||'%'))
      select jsonb_build_object('at', now_s, 'total', coalesce(round(sum(ils)),0), 'n', count(*),
        'by', coalesce((select jsonb_object_agg(k, s) from (select k, round(sum(ils)) s from x group by k) q),'{}'::jsonb),
        'days', coalesce((select jsonb_agg(jsonb_build_array(d, s) order by d) from (select d, round(sum(ils)) s from x group by d) q),'[]'::jsonb),
        'last', coalesce((select jsonb_agg(jsonb_build_object('d',d,'m',trim(m),'ils',round(ils),'cur',cur,'amt',amt,'k',k) order by d desc) from (select * from x order by d desc limit 12) q),'[]'::jsonb))
        into live from x;
      if (r.data->'costs'->'live'->>'total') is distinct from (live->>'total') or (r.data->'costs'->'live'->>'n') is distinct from (live->>'n') or r.data->'costs'->'live' is null then
        changed := true; lv := lv + 1;
      else live := r.data->'costs'->'live'; end if;
    else live := r.data->'costs'->'live'; end if;

    if changed then
      update sq_docs set data = jsonb_set(jsonb_set(data,'{costs,items}',items),'{costs,live}',coalesce(live,'null'::jsonb)),
        version = version+1, updated_at = now()
       where app='sidequests' and collection='trips' and id=r.id;
    end if;
  end loop;

  if jsonb_array_length(nw) > 0 then
    select coalesce(data->'items','[]'::jsonb) into all_items from sq_docs where app='sidequests' and collection='settings' and id='new_items';
    all_items := coalesce(all_items,'[]'::jsonb);
    select coalesce(jsonb_agg(i2->>'id'),'[]'::jsonb) into ids from jsonb_array_elements(all_items) i2;
    select coalesce(jsonb_agg(x),'[]'::jsonb) into nw from jsonb_array_elements(nw) x where not ids ? (x->>'id');
    if jsonb_array_length(nw) > 0 then
      insert into sq_docs(app,collection,id,data) values ('sidequests','settings','new_items',jsonb_build_object('items',nw))
        on conflict (app,collection,id) do update set data = jsonb_set(sq_docs.data,'{items}', nw || coalesce(sq_docs.data->'items','[]'::jsonb)),
        version = sq_docs.version+1, updated_at = now();
    end if;
  end if;
  return jsonb_build_object('paid_found',done,'live_updated',lv);
end $$;
revoke all on function public.sq_trip_costs() from public, anon, authenticated;
-- select cron.schedule('sq-trip-costs','23 * * * *','select public.sq_trip_costs()');
