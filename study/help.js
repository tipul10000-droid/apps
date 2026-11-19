// 🙋 עזרה מקרוב משפחה בזמן אמת (אורן 19.11.2026, כלל קבוע לכל הילדים ולכל תוכן לימוד, קיים ועתידי).
// נטען אוטומטית מ-guest.js בכל דף תוכן (study/<ילד>/<תוכן>/), כך שכל תוכן חדש מקבל את זה בלי קוד נוסף.
// 1. כפתור "🙋 עזרה" בפס העליון (#gbar) פותח חלון צף (רקע מוחשך): ממי לבקש עזרה? כל בני המשפחה (אבא, אמא, האחים), עם נקודת זמינות
//    (study-help?action=avail: כללים קבועים + הלו״ז של אבא) ואייקון וואטסאפ לכל אחד (?action=wa, המספרים רק בשרת).
// 2. בחירה = מצב "עזרה" (פס ירוק) + התראה רק למי שנבחר (?action=help&to=). בפס: "⏳ מחכים ל..." עד שהוא פותח את המסך, ואז "👀 ... רואה".
// 3. בזמן המצב הדף שולח "צילום" חי של המסך (ה-DOM כמו שהוא: השאלה המדויקת, מה שהוקלד, חלונות, צבעים) כשמשהו משתנה (עד פעם בשנייה)
//    ל-study_state_put (app 'live', בלי שינוי סכמה; score = שניות, תמיד עולה). העוזר פותח את study/help/?kid=<ילד> ורואה בדיוק את אותו מסך,
//    מכל מקום, בלי לייצר מחדש את השאלות. העוזר מסמן שהוא מחובר ב-app 'livep' {sid, at, by}; "סיום עזרה" אצלו = end.
// 4. דילוג וחזרה: תוכן שרושם hook ((window.StudyHelpQ=window.StudyHelpQ||[]).push({can, skip, back})) מקבל בחלון "⏭️ לדלג על השאלה";
//    השאלה נשמרת, ממשיכים, וכשהעוזר מגיע מופיע בפס "🔙 לשאלה ששמרתי". היום: lia/math4, dani/math6. תוכן חדש עם תור שאלות = לרשום hook כזה.
// מצב: localStorage study_help_<kid> {sid, t0, act, to:[ids], seen:{id:at}}. נמשך גם במעבר בין דפים, עד "סיום" (של הילד או העוזר), 20 דק׳ בלי נגיעה, או שעה.
// הפס העליון מעל החלונות של הדף (z-index 55), כך שאפשר לבקש עזרה גם כשחלון הסבר פתוח. לא במצב אורח ולא בתצוגת בדיקה של הורה.
(function(){
  var m=/\/study\/([a-z]+)\/([a-z0-9]+)\/?/.exec(location.pathname);if(!m)return;
  var kid=m[1],app=m[2];if(/^(family|parents|kids|tools|audio|supabase|sqfx|help)$/.test(kid)||/^(notes|audio|try)$/.test(app))return;
  if(window.STUDY_GUEST||window.STUDY_REVIEW||/[?&]review=1/.test(location.search)||window.self!==window.top)return;
  var SB_URL='https://emgtyfksnofzzlutngbf.supabase.co',SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZ3R5Zmtzbm9menpsdXRuZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDI0MTMsImV4cCI6MjEwNjgxODQxM30.b7XE-gbCUlXMqpza1Bn9GvMKQsmu3jKP2eqZ0r4-k2k',FN=SB_URL+'/functions/v1/study-help';
  var BOY={evyatar:1,levi:1,shilo:1}[kid]?1:0,g=function(f,b){return BOY?b:f};
  var K='study_help_'+kid,IDLE=20*60e3,MAX=60*60e3,HOOK=null;
  function rpc(fn,body,keep){return fetch(SB_URL+'/rest/v1/rpc/'+fn,{method:'POST',keepalive:!!keep,headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify(body)}).then(function(r){if(!r.ok)throw new Error('net');return r.json()})}
  function fn(q){return fetch(FN+'?'+q,{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:'{}'}).then(function(r){return r.json()})}
  function ld(){try{return JSON.parse(localStorage.getItem(K))}catch(e){return null}}
  function sv(o){try{o?localStorage.setItem(K,JSON.stringify(o)):localStorage.removeItem(K)}catch(e){}}
  function rid(){var a=new Uint8Array(8);crypto.getRandomValues(a);return Array.from(a,function(b){return('0'+b.toString(16)).slice(-2)}).join('')}
  function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  var S=ld();if(S&&(Date.now()-(S.act||0)>IDLE||Date.now()-(S.t0||0)>MAX)){S=null;sv(null)}
  // מי יכול לעזור (בלי הילד עצמו): [מזהה, שם, אימוג׳י, בן]. הזמינות, המכשירים והוואטסאפ מהשרת.
  var FAMH={a:[['oren','אבא','👨',1],['lior','אמא','👩',0],['evyatar','אביתר','⚽',1],['dani','דני','🎤',0],['lia','ליה','🪐',0]],b:[['yehuda','אבא','👨',1]]};
  var FAM={evyatar:'a',dani:'a',lia:'a',levi:'b',shilo:'b'}[kid]||'a';
  var HL=FAMH[FAM].filter(function(h){return h[0]!==kid}),AV={},AVT=0,PARK=[];
  function hx(id){return HL.filter(function(x){return x[0]===id})[0]||['','','',0]}
  function hn(id){return hx(id)[1]}
  function hb(id){return hx(id)[3]}
  var WA='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#25D366" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/><path fill="#fff" d="M17.3 14.6c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.6.1l-.9 1.1c-.2.2-.3.2-.6.1a7.6 7.6 0 0 1-3.8-3.3c-.3-.5.3-.5.8-1.6.1-.2 0-.3 0-.5l-.9-2c-.2-.5-.4-.5-.6-.5h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.7-.7 1.9-1.4.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z"/></svg>';

  var css='#gbar{position:relative;z-index:55;border-bottom:1px solid transparent}'+
    '#hlpB{margin-inline-start:auto;flex:none;width:96px;height:26px;box-sizing:border-box;font:600 13px system-ui,Arial,sans-serif;border-radius:13px;border:1.5px solid #9fb4d3;background:#fff;color:#2f5d9e;cursor:pointer;padding:0;white-space:nowrap;-webkit-tap-highlight-color:transparent}'+
    '#hlpB:active{background:#e8eef7}#gbar.hlp{background:#e7f6ec!important;border-bottom:1px solid #a7dcb9!important}#gbar.hlp #hlpB{border-color:#1d7a4a;color:#1d7a4a}'+
    '#hlpC{display:none;flex:0 1 auto;min-width:0;height:26px;overflow:hidden;text-overflow:ellipsis;font:600 13px system-ui,Arial,sans-serif;color:#1d7a4a;background:none;border:0;border-radius:13px;padding:0 10px;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent}#gbar.hlp #hlpC{display:block}'+
    '#hlpC.bk{background:#1d7a4a;color:#fff}#hlpC i{font-style:normal;display:inline-block;animation:hlpP 1.6s ease-in-out infinite}@keyframes hlpP{50%{transform:scale(1.18)}}'+
    '#hlpT{display:none;flex:none;width:34px;height:26px;box-sizing:border-box;border-radius:13px;border:0;background:#25D366;padding:0;margin-inline-start:6px;cursor:pointer;place-items:center;animation:hlpG 1.6s ease-in-out infinite;-webkit-tap-highlight-color:transparent}#hlpT svg{width:18px;height:18px}'+
    '#gbar.call #hlpT{display:grid}@keyframes hlpG{0%,100%{box-shadow:0 0 0 0 rgba(37,211,102,.7)}50%{box-shadow:0 0 0 6px rgba(37,211,102,0)}}'+
    '#hlpO{position:fixed;inset:0;background:rgba(15,23,42,.62);display:none;align-items:flex-start;justify-content:center;z-index:60;padding:max(calc(env(safe-area-inset-top,0px) + 40px),48px) 16px 16px;box-sizing:border-box;direction:rtl}#hlpO.on{display:flex}'+
    '#hlpO .pn{background:#fff;border-radius:18px;width:100%;max-width:400px;max-height:100%;overflow-y:auto;box-sizing:border-box;padding:16px 14px 12px;box-shadow:0 10px 40px rgba(0,0,0,.3);color:#1f2933;font:16px/1.45 system-ui,Arial,sans-serif;text-align:center;animation:hlpI .18s ease-out}'+
    '@keyframes hlpI{from{transform:translateY(8px);opacity:0}}#hlpO .em{font-size:36px;line-height:1.1}#hlpO h2{margin:2px 0 4px;font-size:20px}#hlpO p{margin:0 0 10px;font-size:14px;color:#3e4c59}'+
    '#hlpO .bt{display:block;width:100%;box-sizing:border-box;font:600 16px system-ui,Arial,sans-serif;border-radius:14px;padding:10px;margin-top:8px;cursor:pointer;border:1.5px solid #2f5d9e;background:#2f5d9e;color:#fff;text-decoration:none}'+
    '#hlpO .bt.s{background:#fff;color:#2f5d9e}#hlpO .bt.g{background:#fff;color:#1d7a4a;border-color:#1d7a4a}#hlpO .bt.r{background:#fff;color:#b42318;border-color:#e3a19b}'+
    '#hlpO .hl{border:1.5px solid #d3d9e2;border-radius:16px;overflow:hidden;text-align:right}'+
    '#hlpO .hr{padding:10px 10px 10px;border-top:1px solid #e3e8ef}#hlpO .hr:first-child{border-top:0}'+
    '#hlpO .hm{display:flex;align-items:center;gap:10px;min-width:0}#hlpO .hm .e{font-size:26px;width:34px;flex:none;text-align:center}#hlpO .hm b{display:block;font-size:17px}'+
    '#hlpO .hm small{display:block;font-size:13px;color:#5b6675;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#hlpO .hm span{min-width:0}'+
    '#hlpO .dt{display:inline-block;width:9px;height:9px;border-radius:50%;background:#9aa5b1;margin-inline-end:5px;vertical-align:0}#hlpO .dt.ok{background:#1d9a55}#hlpO .dt.pd{background:#d97706;animation:hlpP 1.4s infinite}'+
    '#hlpO .h2b{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}'+
    '#hlpO .hb{height:44px;box-sizing:border-box;border-radius:12px;font:700 15px system-ui,Arial,sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;padding:0 6px;white-space:nowrap;overflow:hidden;text-decoration:none;-webkit-tap-highlight-color:transparent;box-shadow:0 2px 0 rgba(15,23,42,.12)}'+
    '#hlpO .hb:active{transform:translateY(1px);box-shadow:none}'+
    '#hlpO .hb.nt{background:#2f5d9e;color:#fff;border:1.5px solid #2f5d9e}#hlpO .hb.nt.no{background:#eef1f5;color:#5b6675;border-color:#c9d1dc;box-shadow:none;font-weight:600;font-size:13.5px}'+
    '#hlpO .hb.nt.dn{background:#e7f6ec;color:#1d7a4a;border-color:#a7dcb9;box-shadow:none}'+
    '#hlpO .hb.wa{background:#25D366;color:#fff;border:1.5px solid #1ebe5a}#hlpO .hb.wa svg{flex:none}#hlpO .hb.wa.no{visibility:hidden}#hlpO .hb.wa.go{animation:hlpW 1.1s ease-in-out 4}'+
    '@keyframes hlpW{50%{box-shadow:0 0 0 5px rgba(37,211,102,.35)}}#hlpO .hn{margin-top:6px;font-size:13px;color:#9a3412;min-height:0}'+
    '#hlpO .pk{margin:10px 0 0;font-size:14px;color:#3e4c59}';
  var bar,btn,chip,ov,callB;
  function ui(){bar=document.getElementById('gbar');if(!bar){setTimeout(ui,100);return}
    var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    chip=document.createElement('button');chip.type='button';chip.id='hlpC';bar.appendChild(chip);
    btn=document.createElement('button');btn.type='button';btn.id='hlpB';bar.appendChild(btn);
    // שיחה קולית בוואטסאפ עם מי שעוזר (אורן 19.11.2026): מופיע וזוהר כשהעוזר כבר רואה את המסך
    callB=document.createElement('button');callB.type='button';callB.id='hlpT';callB.setAttribute('aria-label','שיחה בוואטסאפ');
    callB.innerHTML=WA.replace('fill="#25D366"','fill="#fff"').replace('fill="#fff" d="M17','fill="#25D366" d="M17');bar.insertBefore(callB,btn);callB.onclick=function(){var w=anySeen();if(w)call(w)};
    btn.onclick=function(){if(S)panel();else think()};chip.onclick=function(){if(PARK.length&&anySeen())back();else panel()};
    ov=document.createElement('div');ov.id='hlpO';document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)close()});
    paint();if(S)start(true)}
  function anySeen(){if(!S||!S.seen)return null;var b=null;for(var k in S.seen)if(Date.now()-S.seen[k]<15000)b=k;return b}
  function paint(){if(!btn)return;btn.textContent='🙋 עזרה';bar.classList.toggle('hlp',!!S);
    var w=anySeen();bar.classList.toggle('call',!!(S&&w&&(!AV[w]||AV[w].wa!==false)));chip.classList.toggle('bk',!!(S&&PARK.length&&w));
    if(!S){chip.innerHTML='';return}
    if(PARK.length&&w)chip.innerHTML='🔙 לשאלה ששמרתי';
    else if(w)chip.innerHTML='<i>👀</i> '+esc(hn(w))+' '+(hb(w)?'רואה':'רואה')+' את המסך שלך';
    else if((S.to||[]).length)chip.innerHTML='<i>⏳</i> מחכים ל'+esc(S.to.map(hn).join(' ול'))+'…';
    else chip.innerHTML='<i>🤝</i> עזרה מהמשפחה'}
  function close(){ov.classList.remove('on');ov.innerHTML=''}
  function show(h,bind){ov.innerHTML='<div class="pn">'+h+'</div>';ov.classList.add('on');
    ov.querySelectorAll('[data-a]').forEach(function(b){b.addEventListener('click',function(e){bind(b.getAttribute('data-a'),b.getAttribute('data-id'),e)})})}
  function wa(id){var w=null;try{w=window.open('','_blank')}catch(e){}var go=function(){var u=FN+'?action=wa&kid='+kid+'&sid='+S.sid+'&to='+id+'&apikey='+SB_KEY;if(w&&!w.closed)w.location.href=u;else location.href=u};if(S&&sentOnce)go();else{begin([]);var n=0,t=setInterval(function(){if(sentOnce||++n>40){clearInterval(t);go()}},200)}}
  // שורה לכל עוזר: מי, זמינות, ושני כפתורים ברורים: "🔔 לשלוח התראה" (באפליקציה, רק אם אישר/ה התראות) ו"וואטסאפ" (אורן 19.11.2026)
  var NOTE={};
  // שיחה: וואטסאפ לא מאפשר להתחיל שיחה קולית מלינק, אז נפתח הצ׳אט עם העוזר, ושם לוחצים על 📞 (המספר רק בשרת)
  function call(id){var w=null;try{w=window.open('','_blank')}catch(e){}var u=FN+'?action=call&kid='+kid+'&sid='+S.sid+'&to='+id+'&apikey='+SB_KEY;
    if(w&&!w.closed)w.location.href=u;else location.href=u;
    show('<div class="em">📞</div><h2>שיחה עם '+esc(hn(id))+'</h2><p>הוואטסאפ נפתח בצ׳אט עם '+esc(hn(id))+'.<br>1. '+g('לחצי','לחץ')+' על 📞 למעלה.<br>2. '+g('כשעונים, לחצי','כשעונים, לחץ')+' על "רמקול".<br>3. '+g('חזרי','חזור')+' לאפליקציה. '+esc(hn(id))+' '+(hb(id)?'רואה':'רואה')+' את המסך שלך ומדבר'+(hb(id)?'':'ת')+' איתך.</p><button class="bt" data-a="x">הבנתי</button>',close)}
  function rows(){return HL.map(function(h){var id=h[0],a=AV[id],req=S&&(S.to||[]).indexOf(id)>=0,seen=S&&S.seen&&S.seen[id]&&Date.now()-S.seen[id]<15000;
      var b=h[3],st=seen?'<span class="dt ok"></span>רואה את המסך שלך עכשיו':req?'<span class="dt pd"></span>מחכים ש'+(b?'יפתח':'תפתח')+' את המסך שלך…':
        !a?'<span class="dt"></span>בודק זמינות…':a.ok?'<span class="dt ok"></span>'+(b?'זמין':'זמינה')+(a.why?' · '+esc(a.why):''):
        '<span class="dt"></span>'+(a.why?esc(a.why):'לא '+(b?'זמין':'זמינה')+' עכשיו')+(a.until?' עד '+esc(a.until):'');
      var nt=req||seen?['dn','✓ נשלחה התראה']:a&&!a.dev?['no','🔕 '+(b?'לא אישר':'לא אישרה')+' התראות']:a&&!a.ok?['no','🔕 לא '+(b?'זמין':'זמינה')+' עכשיו']:['','🔔 לשלוח התראה'];
      return '<div class="hr"><div class="hm"><span class="e">'+h[2]+'</span><span><b>'+esc(h[1])+'</b><small>'+st+'</small></span></div>'+
        '<div class="h2b"><button type="button" class="hb nt'+(nt[0]?' '+nt[0]:'')+'" data-a="ask" data-id="'+id+'">'+nt[1]+'</button>'+
        '<a class="hb wa'+(a&&!a.wa?' no':'')+(NOTE[id]?' go':'')+(seen?' go':'')+'" data-a="'+(seen?'call':'wa')+'" data-id="'+id+'" href="#">'+WA.replace('fill="#25D366"','fill="#fff"').replace('fill="#fff" d="M17','fill="#25D366" d="M17')+(seen?'שיחה בוואטסאפ':'וואטסאפ')+'</a></div>'+
        (NOTE[id]?'<div class="hn">'+esc(NOTE[id])+'</div>':'')+'</div>'}).join('')}
  function noNotif(id){var b=hb(id);NOTE[id]=hn(id)+' עוד לא '+(b?'אישר':'אישרה')+' התראות באפליקציה, אז ההתראה לא '+(b?'תגיע אליו':'תגיע אליה')+'. '+g('שלחי','שלח')+' '+(b?'לו':'לה')+' הודעה בוואטסאפ 👇'}
  function redraw(){var L=ov.querySelector('.hl');if(ov.classList.contains('on')&&L){L.innerHTML=rows();L.querySelectorAll('[data-a]').forEach(function(x){x.addEventListener('click',function(e){act1(x.getAttribute('data-a'),x.getAttribute('data-id'),e)})})}}
  // החלון הראשי: ממי לבקש עזרה + (בזמן עזרה) מצב כל אחד, דילוג על השאלה, חזרה לשאלה, סיום
  // לפני שמבקשים עזרה (אורן 19.11.2026): קודם לחשוב לבד, אחר כך לנסות ולקרוא את ההסבר, ורק אז לבקש. חלונית אחת קצרה, ואז הבחירה הרגילה.
  function think(){show('<div class="em">🧠</div><h2>רגע לפני שמבקשים עזרה</h2><p style="text-align:right">'+'1. '+g('תחשבי','תחשוב')+' חזק לבד. ככה באמת לומדים.<br>'+'2. מותר לטעות! אחרי תשובה לא נכונה האפליקציה מסבירה, ומההסבר אפשר להבין.<br>'+'3. לא עזר? אז '+g('בקשי','בקש')+' עזרה '+(HL.length>1?'מאבא, מאמא או מהאחים':'מאבא')+'.</p>'+'<button class="bt" data-a="go">הבנתי, '+g('רוצה','רוצה')+' עזרה 🙋</button><button class="bt s" data-a="x">'+g('אנסה','אנסה')+' לבד קודם 💪</button>',function(a){if(a==='go')panel();else close()})}
  function panel(){
    var h='<div class="em">🙋</div><h2>'+(S?'עזרה מהמשפחה':'ממי לבקש עזרה?')+'</h2><p>'+(S?'מי שפותח את ההודעה רואה בדיוק את המסך שלך. אפשר לבקש גם ממישהו נוסף.':'מי ש'+g('תבחרי','תבחר')+' יקבל הודעה ויראה בטלפון שלו בדיוק את המסך שלך, כולל השאלה הזאת. אפשר לדבר בטלפון בזמן הזה.')+'</p>'+
      '<div class="hl">'+rows()+'</div>';
    if(S&&HOOK&&(!HOOK.can||HOOK.can())&&!anySeen())h+='<button class="bt g" data-a="skip">⏭️ לדלג על השאלה הזאת עד שיגיעו לעזור</button>';
    if(S&&PARK.length)h+='<div class="pk">📌 '+(PARK.length===1?'שאלה אחת שמורה בצד':PARK.length+' שאלות שמורות בצד')+'</div><button class="bt g" data-a="back">🔙 לחזור לשאלה ששמרתי</button>';
    h+=S?'<button class="bt r" data-a="end">✓ לסיים את העזרה</button><button class="bt s" data-a="x">סגירה</button>':'<button class="bt s" data-a="x">ביטול</button>';
    show(h,act1);
    if(Date.now()-AVT>20000){AVT=Date.now();fn('action=avail&kid='+kid).then(function(j){if(j&&j.list){AV={};j.list.forEach(function(x){AV[x.id]=x});
      redraw()}}).catch(function(){AVT=0})}}
  function act1(a,id,e){
    if(a==='ask'){var v=AV[id],sn=S&&((S.to||[]).indexOf(id)>=0||(S.seen&&S.seen[id]));if(sn)return;
      if(v&&!v.dev){noNotif(id);redraw();return}
      if(v&&!v.ok){NOTE[id]=hn(id)+' לא '+(hb(id)?'זמין':'זמינה')+' עכשיו'+(v.why?' ('+v.why+')':'')+'. אפשר לנסות בוואטסאפ, או לבקש ממישהו אחר.';redraw();return}
      request(id)}
    else if(a==='wa'){e.preventDefault();if(AV[id]&&AV[id].wa)wa(id)}
    else if(a==='call'){e.preventDefault();call(id)}
    else if(a==='skip'){var t=HOOK.skip();close();if(t!=null){PARK.push(t);paint();send(true);var w=(S.to||[])[0];toast('📌 השאלה נשמרה בצד. ממשיכים, ונחזור אליה כש'+(w?hn(w)+' '+(hb(w)?'יגיע':'תגיע'):'יגיעו לעזור')+'.')}else toast('אפשר לדלג רק על שאלה פתוחה, לפני שעונים עליה.')}
    else if(a==='back'){close();back()}
    else if(a==='end'){close();stop(true)}
    else close()}
  function toast(t){var d=document.createElement('div');d.textContent=t;d.style.cssText='position:fixed;left:14px;right:14px;top:calc(max(calc(env(safe-area-inset-top,0px) + 6px),44px) + 40px);z-index:61;background:#1f2933;color:#fff;border-radius:14px;padding:10px 14px;font:600 15px/1.4 system-ui,Arial,sans-serif;text-align:center;direction:rtl;box-shadow:0 6px 20px rgba(0,0,0,.25);pointer-events:none';document.body.appendChild(d);setTimeout(function(){d.remove()},3600)}
  function begin(to){if(!S){S={sid:rid(),t0:Date.now(),act:Date.now(),to:[],seen:{}};sv(S);start(false)}to.forEach(function(x){if(S.to.indexOf(x)<0)S.to.push(x)});sv(S);paint()}
  var PEND=[];
  function request(id){begin([id]);close();PEND.push(id);flush();
    toast('🔔 נשלחה התראה ל'+hn(id)+'.'+(HOOK?' אם לוקח זמן: "🙋 עזרה" ← לדלג על השאלה ולחזור אליה.':''))}
  function flush(){if(!S||!sentOnce)return;send(true);while(PEND.length){var id=PEND.shift();fn('action=help&kid='+kid+'&sid='+S.sid+'&to='+id).catch(function(){})}}
  function back(){if(!PARK.length||!HOOK)return;var t=PARK.shift();HOOK.back(t);paint();send(true)}
  // תוכן שרושם hook לדילוג וחזרה (הדף נטען לפני הקובץ הזה, ולכן דרך תור)
  function reg(h){HOOK=h}
  (window.StudyHelpQ||[]).forEach(reg);window.StudyHelpQ={push:reg};

  // ---- הצילום החי ----
  var mo=null,tm=null,hbt=null,pl=null,lastSent=0,lastH='',busy=false,tap=null,sentOnce=false,lis=false;
  function headCss(){var o=[];document.querySelectorAll('style,link[rel=stylesheet]').forEach(function(el){
      if(el.tagName==='STYLE'){var t=el.textContent;if(t.indexOf('#hlpB{')<0)o.push(['s',t])}else if(el.href)o.push(['l',el.href])});return o}
  function snap(){var b=document.body.cloneNode(true),sI=document.body.querySelectorAll('input,textarea,select,canvas'),dI=b.querySelectorAll('input,textarea,select,canvas');
    for(var i=0;i<sI.length&&i<dI.length;i++){var s=sI[i],d=dI[i];try{
      if(s.tagName==='CANVAS'){var u='';try{if(s.width*s.height<=800*800)u=s.toDataURL('image/png')}catch(e){}var im=document.createElement('img');if(u)im.src=u;im.className=s.className;im.setAttribute('style',(s.getAttribute('style')||'')+';width:'+s.clientWidth+'px;height:'+s.clientHeight+'px');d.parentNode.replaceChild(im,d)}
      else if(s.tagName==='TEXTAREA')d.textContent=s.value;
      else if(s.tagName==='SELECT'){var o=d.options[s.selectedIndex];if(o)o.setAttribute('selected','')}
      else if(s.type==='checkbox'||s.type==='radio'){if(s.checked)d.setAttribute('checked','');else d.removeAttribute('checked')}
      else d.setAttribute('value',s.value)}catch(e){}}
    b.querySelectorAll('script,noscript,iframe,audio,video,#hlpO,#hlpB,#hlpC').forEach(function(x){x.remove()});
    var gb=b.querySelector('#gbar');if(gb)gb.innerHTML='<span style="font:600 13px system-ui;color:#1d7a4a">🤝 עזרה מהמשפחה'+(PARK.length?' · 📌 שאלה שמורה בצד':'')+'</span>';
    var de=document.documentElement;
    return {html:b.innerHTML.replace(/>\s+</g,'><'),ha:{lang:de.lang||'he',dir:de.dir||'rtl',cls:de.className||'',st:de.getAttribute('style')||'',fam:de.getAttribute('data-fam')||''},
      ba:{cls:document.body.className||'',st:document.body.getAttribute('style')||''}}}
  function send(force){if(!S||busy)return;var n=Date.now();if(!force&&n-lastSent<900){clearTimeout(tm);tm=setTimeout(function(){send(false)},950-(n-lastSent));return}
    var sn=snap(),key=sn.html+'|'+sn.ba.cls+'|'+sn.ha.cls+'|'+(tap?tap[2]:'');if(!force&&key===lastH)return;
    var k={v:2,sid:S.sid,on:true,at:n,t0:S.t0,app:app,path:location.pathname+location.search,title:document.title,w:innerWidth,h:innerHeight,
      to:S.to||[],park:PARK.length,css:headCss(),html:sn.html,ha:sn.ha,ba:sn.ba,tap:tap};
    if(JSON.stringify(k).length>190000){k.html=sn.html.replace(/src="data:image\/[^"]{2000,}"/g,'src=""');if(JSON.stringify(k).length>190000){k.css=k.css.filter(function(x){return x[0]==='l'});k.big=1}}
    busy=true;lastSent=n;lastH=key;
    rpc('study_state_put',{p_kid:kid,p_app:'live',p_keys:k,p_score:Math.floor(n/1000)}).then(function(){busy=false;if(!sentOnce){sentOnce=true;flush()}}).catch(function(){busy=false;lastH=''})}
  function act(){if(!S)return;S.act=Date.now();sv(S)}
  function start(resume){sentOnce=false;
    mo=new MutationObserver(function(){send(false)});mo.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
    if(!lis){lis=true;['input','change'].forEach(function(e){document.addEventListener(e,function(){send(false)},true)})}
    hbt=setInterval(function(){if(!S)return;if(Date.now()-S.act>IDLE||Date.now()-S.t0>MAX){stop(true);return}send(true)},10000);
    pl=setInterval(poll,3000);setTimeout(function(){send(true)},resume?600:30);poll()}
  function poll(){if(!S)return;rpc('study_state_get',{p_kid:kid,p_app:'livep'}).then(function(j){if(!S||!j||!j.keys||j.keys.sid!==S.sid)return;
      var by=j.keys.by||'';
      if(j.keys.end){stop(true);show('<div class="em">💪</div><h2>'+(by?esc(hn(by))+' '+(hb(by)?'סיים':'סיימה')+' לעזור':'העזרה הסתיימה')+'</h2><p>כל הכבוד! '+g('את יכולה','אתה יכול')+' להמשיך לבד מכאן.</p><button class="bt" data-a="x">המשך</button>',close);return}
      var a=+j.keys.at||0;S.seen=S.seen||{};if(by&&a>(S.seen[by]||0)){var was=anySeen();S.seen[by]=Math.min(a,Date.now());sv(S);
        if(!was&&PARK.length)toast('👀 '+hn(by)+' '+(hb(by)?'הגיע':'הגיעה')+'! לוחצים למעלה על "🔙 לשאלה ששמרתי".')}paint()}).catch(function(){});paint()}
  function stop(tell){if(!S)return;var sid=S.sid;S=null;sv(null);PARK=[];PEND=[];if(mo)mo.disconnect();clearInterval(hbt);clearInterval(pl);clearTimeout(tm);paint();
    if(tell)rpc('study_state_put',{p_kid:kid,p_app:'live',p_keys:{v:2,sid:sid,on:false,at:Date.now(),app:app},p_score:Math.floor(Date.now()/1000)},true).catch(function(){})}
  // נגיעה של הילד: העוזר רואה נקודה קטנה איפה נגע/ה
  document.addEventListener('pointerdown',function(e){act();if(!S||(e.target&&e.target.closest&&e.target.closest('#gbar,#hlpO')))return;tap=[Math.round(e.clientX),Math.round(e.clientY),Date.now()];send(false)},true);
  document.addEventListener('keydown',act,true);
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&S)send(true)});
  addEventListener('resize',function(){if(S)send(false)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ui);else ui();
  window.StudyHelp={on:function(){return !!S},stop:function(){stop(true)}};
})();
