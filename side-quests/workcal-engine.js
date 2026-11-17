// workcal-engine.js: turns Oren's work calendar into the shape of a day for the automatic time windows.
// Data (never in the repo): sq_docs sidequests/work_calendar: one doc per meeting (ev-...), _profile (his answers), _meta.
// Nothing here shows the calendar. It only answers, for a date: is he at the office, when must he leave, and which parts
// of the work hours are a meeting he must sit in (meet), a meeting he only listens to (listen) or free.
// Rules (Oren 17.11.2026):
//  need per series: must / high / rec block time, opt / avoid don't. Old values maybe = rec, no = avoid.
//  mode = the lightest way that still works: office > pc > phone > car. phone/car = listening, the rest = sitting in it.
//  his own meetings with attendees = high availability (at least the computer). A meeting with only himself = private / miluim.
//  a normal week = office (Sun 90%, Mon 70%, Tue-Thu default office). Physical = Netanya unless the invite says otherwise.
(function(){
  const TZ="Asia/Jerusalem";
  const dk=d=>new Intl.DateTimeFormat("en-CA",{timeZone:TZ}).format(d);
  const hm=d=>{const [h,m]=new Intl.DateTimeFormat("en-GB",{timeZone:TZ,hour:"2-digit",minute:"2-digit",hour12:false}).format(d).split(":").map(Number);return (h%24)*60+m;};
  const OLD={maybe:"rec",no:"avoid"};
  const AWAY=/חופש|מיצוי|איטליה|חו"ל|ריטריט|מילואים|\bOOF\b|out of office|vacation/i;
  let evs=[],prof={},byDay={},stamp=0;
  function skey(e){let h=0;const s=(e.subject||"").trim().toLowerCase()+"|"+(e.organizer||"").toLowerCase();for(const c of s)h=(h*31+c.charCodeAt(0))|0;return "s"+(h>>>0).toString(36);}
  function live(e){return e&&!e.cancelled&&!e.deleted&&e.start&&e.end&&!e._deleted;}
  function unconf(e){return e.response==="tentativelyAccepted"||e.response==="notResponded"||e.show_as==="tentative";}
  function rule(e){const r=(prof.series||{})[skey(e)]||{};return {need:OLD[r.need]||r.need||"",mode:r.mode||""};}
  // what one meeting means for him: null = doesn't hold time, "meet" = sitting in it (office or computer), "listen" = phone / car
  function kind(e){
    if(!live(e)||e.all_day||e.show_as==="free"||e.show_as==="oof")return null;
    const r=rule(e),own=e.response==="organizer",solo=(own||e.response==="none"||!e.response)&&!(+e.attendees>1);
    if(solo)return "self"; // a meeting with himself = private / miluim block: holds the time, says nothing about the office
    if(r.need==="opt"||r.need==="avoid")return null;
    if(!r.need&&!own&&unconf(e)&&(+e.attendees||0)>=50)return null; // a big invite he never answered
    if(r.mode==="phone"||r.mode==="car")return "listen";
    if(r.mode)return "meet";
    if(own)return "meet";
    if((+e.attendees||0)>=20)return "listen";
    return "meet";}
  function physical(e){const r=rule(e);if(r.mode==="office")return true;
    return !e.teams&&!!String(e.location||"").trim()&&!/teams|zoom|webex/i.test(e.location||"");}
  function index(){byDay={};for(const e of evs){if(!live(e))continue;const s=new Date(e.start),k=dk(s);(byDay[k]=byDay[k]||[]).push(e);
      if(e.all_day||(new Date(e.end)-s)>=20*3600e3){for(let t=+s+864e5;t<+new Date(e.end);t+=864e5)(byDay[dk(new Date(t))]=byDay[dk(new Date(t))]||[]).push(e);}}}
  function set(events,profile){evs=Array.isArray(events)?events:[];prof=profile||{};index();stamp++;}
  // the day: {has, away, office, why, first, last, segs:[[s,e,kind]]}. first/last = the first/last minute he must be at the office.
  function day(iso){
    const L=byDay[iso]||[];if(!evs.length)return null;
    const long=L.filter(e=>e.all_day||(new Date(e.end)-new Date(e.start))>=6*3600e3);
    const aw=long.find(e=>e.show_as==="oof"||AWAY.test(e.subject||""));
    const segs=[];let first=null,last=null,phys=false,eq=0;
    for(const e of L){if(e.all_day)continue;const k=kind(e);if(!k)continue;
      const s0=new Date(e.start),e0=new Date(e.end);let s=dk(s0)===iso?hm(s0):0,en=dk(e0)===iso?hm(e0):1440;if(en<=s)continue;
      if(k==="self"){segs.push([s,en,"meet"]);continue;}
      segs.push([s,en,k]);eq++;
      if(physical(e)&&rule(e).need!=="rec"){phys=true;if(first==null||s<first)first=s;if(last==null||en>last)last=en;}}
    segs.sort((a,b)=>a[0]-b[0]);
    const dw=new Date(iso+"T12:00:00Z").getUTCDay(),op=(prof.office_prob||{})[dw];
    let office=null,why="";
    if(aw){office=false;why="away";}
    else if(phys){office=true;why="meeting";}
    else if(typeof op==="number"){office=op>=0.5;why="habit";}
    else if(op==="var"){office=true;why="default";}
    return {has:!!L.length,away:!!aw,office,why,first,last,segs,meetings:eq};}
  // split [a,b) by the day's meetings: [[start, kind]] where kind is meet / listen / base
  function split(iso,a,b,base){const D=day(iso),out=[];if(!D){out.push([a,base]);return out;}
    let c=a;const push=(s,k)=>{if(out.length&&out[out.length-1][1]===k)return;out.push([s,k]);};
    for(const [s,e,k] of D.segs){if(e<=c||s>=b)continue;const ss=Math.max(s,c),ee=Math.min(e,b);
      if(ss>c){if(ss-c>=10)push(c,base);}
      // a meeting that overlaps a "meet" keeps the stronger kind
      const prev=out.length?out[out.length-1]:null;
      if(prev&&prev[1]==="meet"&&k==="listen"&&ss<c){c=Math.max(c,ee);continue;}
      push(ss,k);c=Math.max(c,ee);}
    if(c<b)push(c,base);
    if(!out.length||out[0][0]>a)out.unshift([a,base]);
    return out;}
  // 20.1 (Oren 17.11.2026): the evening question "how much errand time tomorrow" shows the FIRST meeting of the morning
  // (time, with whom, where) so he can decide if it fits into the errands, needs him at a place, or only needs him available.
  // Returns {first:{s,e,subject,org,att,own,teams,room,phys,unconf,kind}, phys:{...} = the first physical one if later, next:{s,e} =
  // the next meeting that needs him after the first one}. null = no calendar / no meeting that morning.
  function who(e){if(e.response==="organizer")return "אתה מזמן";const o=String(e.organizer||"").split("@")[0].replace(/[._]+/g," ").replace(/\bext\b/i,"").trim();
    return o.replace(/\b\w/g,c=>c.toUpperCase());}
  function room(e){const m=String(e.location||"").split(/[;,]/).map(x=>x.trim()).filter(x=>x&&!/teams|zoom|webex/i.test(x));return m[0]||"";}
  function info(e,iso){const s0=new Date(e.start),e0=new Date(e.end);return {s:dk(s0)===iso?hm(s0):0,e:dk(e0)===iso?hm(e0):1440,
    subject:String(e.subject||"").replace(/^\[external\]\s*/i,"").trim(),org:who(e),att:+e.attendees||0,own:e.response==="organizer",
    teams:!!e.teams||/teams/i.test(e.location||""),room:room(e),phys:physical(e),unconf:unconf(e),kind:kind(e)};}
  function morning(iso){if(!evs.length)return null;const D=day(iso);if(!D||D.away)return D&&D.away?{away:true}:null;
    const L=(byDay[iso]||[]).filter(e=>!e.all_day&&kind(e)&&kind(e)!=="self").map(e=>info(e,iso)).filter(x=>x.s<840).sort((a,b)=>a.s-b.s);
    if(!L.length)return {none:true,office:D.office};
    const f=L[0],ph=L.find(x=>x.phys&&x.s>f.s)||null,nx=L.find(x=>x.s>=f.e&&x.kind==="meet")||null;
    return {first:f,phys:ph,next:nx,office:D.office,count:L.length};}
  window.SQWorkCal={set,day,split,morning,stamp:()=>stamp,commute:()=>{const c=prof.commute_min||{};return Array.isArray(c.day)?Math.round((c.day[0]+c.day[1])/2):30;}};
})();
