/* sq-voice.js (Side Quests 25.88, Oren 27.11.2026): "🎙 צ׳אט קולי לנסיעה".
   One button per trip card. Every tap opens a NEW Claude chat whose prompt is built now, from the app's data,
   so the chat starts with everything Side Quests knows about the trip (flights, hotel, car, places, what he already visited).
   A saved chat link opens in the browser without voice mode, so the button never reopens an old chat; the chat title
   (first line of the prompt, "🎙 <trip>") makes the conversation easy to find at the top of the Claude app's list. */
(function(){
  function hm(iso,tz){try{return new Date(iso).toLocaleString("he-IL",{weekday:"short",day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit",timeZone:tz||"Europe/Rome"});}catch(e){return iso||"";}}
  function now(tz){const d=new Date();try{return d.toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"numeric",year:"numeric",timeZone:tz})+", "+d.toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit",timeZone:tz});}catch(e){return d.toISOString();}}
  const cut=(s,n)=>{s=String(s||"").replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n-1)+"…":s;};
  // keep the link short enough for claude.ai: the context is trimmed to a budget (raw characters, before encoding)
  function build(o){
    const tz=o.tz||"Europe/Rome";let ctx=(o.ctx||[]).filter(Boolean).join("\n");if(ctx.length>(o.max||3800))ctx=ctx.slice(0,(o.max||3800)-1)+"…";
    return `🎙 ${o.title}
זו השיחה הקולית שלי לנסיעה "${o.title}". אני אחזור אליה לאורך כל הנסיעה, הרבה פעמים בנהיגה או בהליכה.
עכשיו ${now(tz)} (שעון ${o.place||"היעד"}).
איך לענות: קצר וברור, כמו בשיחה קולית, משפט או שניים בכל פעם, בלי טבלאות ובלי רשימות ארוכות. כשצריך לינק, לינק ישיר לגוגל מפס (https://www.google.com/maps/search/?api=1&query=...).
קודם תשאל אותי במה אני צריך עזרה עכשיו (למשל: כמה זמן יש לי, לאן לנסוע, איפה לאכול, מה פתוח) ותחכה לתשובה.
כשאתה ממליץ: בדוק ברשת מה פתוח עכשיו ובשעה שאגיע, מזג אוויר (ברוח או בגשם לא לשלוח אותי לחוף או לטיול בחוץ), זמני נסיעה, חנייה ותשלום, דירוג בגוגל וטלפון. אל תמציא: אם לא מצאת, תגיד שלא מצאת. אל תציע מקומות שכבר הייתי בהם (VISITED) אלא אם אבקש.
${o.extra?o.extra+"\n":""}מה Side Quests יודע על הנסיעה:
${ctx}`;}
  function url(o){return "https://claude.ai/new?q="+encodeURIComponent(build(o));}
  function open(o){window.open(url(o),"_blank","noopener");}
  // a private trip from the trips collection (trip.html)
  function trip(t){const L=[];
    L.push("נסיעה: "+[t.title,t.from&&t.to?t.from+" עד "+t.to:"",t.who].filter(Boolean).join(" · "));
    (t.flights||[]).forEach(f=>{if(!f)return;const a=f.from||{},b=f.to||{};L.push("טיסה "+[f.no,(a.city||a.code||"")+" ← "+(b.city||b.code||""),f.dep?hm(f.dep,t.tz):"",f.arr?"נוחת "+hm(f.arr,t.tz):""].filter(Boolean).join(" · "));});
    (t.hotels||[]).forEach(x=>{if(x&&x.name)L.push("מלון: "+[x.name,x.city,x.addr,x.in?"מ-"+x.in:"",x.out?"עד "+x.out:""].filter(Boolean).join(" · "));});
    (t.moves||[]).slice(0,6).forEach(m=>{if(m&&(m.h||m.t))L.push("תחבורה: "+cut((m.h||"")+" "+(m.s||m.t||""),120));});
    (t.days||[]).slice(0,20).forEach(d=>{if(d&&(d.h||d.t))L.push("יום "+cut([d.d,d.h||d.t].filter(Boolean).join(" "),70)+((d.items||[]).length?": "+cut(d.items.map(i=>i&&(i.h||i.t||i)).filter(x=>typeof x==="string").join(", "),140):""));});
    (t.alerts||[]).forEach(a=>{if(a&&a.h)L.push("חשוב: "+cut(a.h+(a.s?" · "+a.s:""),140));});
    (t.notes||[]).slice(0,8).forEach(n=>{if(n&&(n.h||n.t))L.push("הערה: "+cut((n.h||"")+" "+(n.s||n.t||""),130));});
    const P=(t.maps&&t.maps.places)||[];if(P.length)L.push("הליסט שלנו ב-Google Maps ("+P.length+" מקומות): "+P.slice(0,60).map(p=>p.n+(p.city?" ("+p.city+")":"")+(p.rank==="must"?" ★":"")).join(", "));
    return {title:(t.flag?t.flag+" ":"")+(t.title||"טיול"),tz:t.tz||"Europe/Rome",place:(t.dest&&t.dest.h)||"היעד",ctx:L};}
  window.SQVoice={build,url,open,trip,hm,cut};
})();
