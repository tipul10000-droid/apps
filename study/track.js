// מעקב התקדמות ל-study: זמן פעילות + דיווח לאזור ההורים (Supabase, פונקציה study_report).
// שימוש: StudyTrack.init('dani','spelling'); StudyTrack.report({...נתוני האפליקציה});
// מפתחות מקומיים: study_dev (זהות המכשיר), study_t_<kid>_<app> (זמן), study_r_<kid>_<app> (הדיווח האחרון).
// איפוס מאזור ההורים: init(kid, app, [מפתחות ההתקדמות של האפליקציה]). אם ההורים איפסו (study_reset_get) אחרי שההתקדמות במכשיר התחילה,
// המפתחות נמחקים והדף נטען מחדש. study_rs_<kid>_<app> = האיפוס האחרון שבוצע במכשיר. במצב אורח לא בודקים.
// גיבוי התקדמות (study_state_put/get): בכל דיווח נשמרים גם המפתחות שהועברו ל-init. אם במכשיר אין אף אחד מהם (למשל Study נפתחה מהאייקון במסך הבית,
// שבאייפון יש לו אחסון נפרד מספארי), הגיבוי משוחזר והדף נטען מחדש. השרת שומר את הגיבוי עם הכי הרבה תשובות (att). במצב אורח לא.
// מתנות: StudyTrack.gift(cb) — אם יש מתנה שמחכה (study_gift_take), cb({kind, note}).
(function(){
  function off(){return !!(window.STUDY_GUEST||window.STUDY_REVIEW)} // אורח או תצוגת בדיקה של הורה: בלי דיווח, גיבוי, שחזור ואיפוס
  var SB_URL='https://emgtyfksnofzzlutngbf.supabase.co',SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZ3R5Zmtzbm9menpsdXRuZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDI0MTMsImV4cCI6MjEwNjgxODQxM30.b7XE-gbCUlXMqpza1Bn9GvMKQsmu3jKP2eqZ0r4-k2k';
  function get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}
  function set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function rid(){var a=new Uint8Array(16);crypto.getRandomValues(a);return Array.from(a,function(b){return('0'+b.toString(16)).slice(-2)}).join('')}
  function uuid(){if(crypto.randomUUID)return crypto.randomUUID();var h=rid();return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20)}
  function today(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
  // המפתחות שהיו במכשיר לפני שהאפליקציה נטענה (האפליקציה יוצרת מפתחות ריקים בטעינה; track.js נטען לפניה)
  var PRE={};try{for(var i=0;i<localStorage.length;i++)PRE[localStorage.key(i)]=1}catch(e){}
  var kid,app,KEYS=[],T,data={},lastAct=Date.now(),dirty=false,timer=null,stop=false;
  function dev(){var d=get('study_dev');if(!d||!d.id||!d.token){d={id:uuid(),token:rid()+rid()};set('study_dev',d)}return d}
  function payload(){var days={},ks=Object.keys(T.days).sort().slice(-60);ks.forEach(function(k){days[k]=T.days[k]});
    var o={};for(var k in data)o[k]=data[k];o.first=T.first;o.sec=T.sec;o.last=T.last;o.days=days;if(T.tl&&T.tl.length)o.tl=T.tl;o.v=1;return o}
  function putState(keep){if(off()||!KEYS.length)return;var o={},n=0;KEYS.forEach(function(x){var v=localStorage.getItem(x);if(v!=null){o[x]=v;n++}});if(!n)return;
    try{fetch(SB_URL+'/rest/v1/rpc/study_state_put',{method:'POST',keepalive:!!keep,headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},
      body:JSON.stringify({p_kid:kid,p_app:app,p_keys:o,p_score:+data.att||0})}).catch(function(){})}catch(e){}}
  function has(x){return !!PRE[x]}
  // שחזור גם כשבמכשיר יש התקדמות, אבל הגיבוי גדול ממנה ביותר מ-10 תשובות (אורן 6.11.2026: ההתקדמות של ליה נמחקה במכשיר והגיבוי נשאר).
  // הגיבוי שהשרת מחזיר תמיד מאוחר מהאיפוס האחרון, כך שאיפוס של ההורים לא מתבטל.
  function restore(){if(off())return;var sk='study_rsd_'+kid+'_'+app;// רק נגד לולאת שחזורים באותה לשונית (לא נחסם אחרי איפוס: הגיבוי שהשרת מחזיר מאוחר מהאיפוס)
    try{if(sessionStorage.getItem(sk))return}catch(e){}
    var any=KEYS.some(has),lr=get('study_r_'+kid+'_'+app),la=(lr&&lr.data&&+lr.data.att)||0;
    // גיבוי מ-2 הדקות שאחרי איפוס לא חוזר: זה הדיווח האחרון של מכשיר שעוד לא קלט את האיפוס (אחרת האיפוס מתבטל בפתיחה הבאה)
    Promise.all([rpc('study_state_get',{p_kid:kid,p_app:app}),rpc('study_reset_get',{p_kid:kid,p_app:app})]).then(function(r){var j=r[0],rs=r[1];if(!j||!j.keys)return;
      if(rs&&rs.at&&j.at&&new Date(j.at).getTime()<new Date(rs.at).getTime()+120000)return;if(any&&!((+j.score||0)>la+10))return;var n=0;
      for(var x in j.keys)if(KEYS.indexOf(x)>=0&&typeof j.keys[x]==='string'){try{localStorage.setItem(x,j.keys[x]);n++}catch(e){}}
      if(n){set('study_r_'+kid+'_'+app,{at:new Date().toISOString(),data:{att:+j.score||0}});try{sessionStorage.setItem(sk,'1')}catch(e){}stop=true;location.reload()}}).catch(function(){})}
  function send(keep){if(stop||off())return;var d=dev(),p=payload();putState(keep);set('study_r_'+kid+'_'+app,{at:new Date().toISOString(),data:p});dirty=false;
    try{fetch(SB_URL+'/rest/v1/rpc/study_report',{method:'POST',keepalive:!!keep,headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},
      body:JSON.stringify({p_device:d.id,p_token:d.token,p_kid:kid,p_app:app,p_data:p})}).catch(function(){})}catch(e){}}
  function later(){dirty=true;clearTimeout(timer);timer=setTimeout(function(){send(false)},4000)}
  var lastTap=0;function act(){lastAct=lastTap=Date.now()}
  // שחרור חידון הכניסה (אורן 6.11.2026): בזמן נעילה, כל 5 שניות של לימוד פעיל (נגיעה ב-30 השניות האחרונות) נספרות ב-study_qz_<kid>.act; 20 דקות = הנעילה משתחררת.
  function qzAct(){if(Date.now()-lastTap>30000)return;try{var qk='study_qz_'+kid,q=JSON.parse(localStorage.getItem(qk)||'{}');if(!q.until||q.until<=Date.now())return;q.act=(q.act||0)+5;if(q.act>=1200){q.until=0;q.act=0;q.n=0}localStorage.setItem(qk,JSON.stringify(q))}catch(e){}}
  function rpc(fn,body){return fetch(SB_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify(body)}).then(function(r){return r.ok?r.json():null})}
  function checkReset(keys,old){if(off()||stop)return;var sk='study_rs_'+kid+'_'+app;
    try{rpc('study_reset_get',{p_kid:kid,p_app:app}).then(function(j){if(!j||!j.at)return;var at=new Date(j.at).getTime(),seen=get(sk);if(seen===j.at)return;
      var has=keys.some(function(x){return localStorage.getItem(x)!=null}),before=!!(old&&old.first)&&new Date(old.first).getTime()<at;
      set(sk,j.at);if(!(has&&before))return;
      stop=true;keys.concat(['study_t_'+kid+'_'+app,'study_r_'+kid+'_'+app]).forEach(function(x){try{localStorage.removeItem(x)}catch(e){}});
      location.reload()}).catch(function(){})}catch(e){}}
  // גרף שיפור לאזור ההורים (אורן 7.11.2026): T.tl = [[בלוק, תשובות מצטבר, נכונות מצטבר], ...], בלוק = 20 דקות של זמן פעילות.
  // הרשומה הראשונה היא נקודת ההתחלה של המעקב: מה שנענה לפניה מוצג כבלוק אחד ("עד דקה X"). ירידה במונה (איפוס) מתחילה מחדש.
  // מ-7.11.2026 גם [3] = כמה הילד יודע ברמה הנוכחית (data.prog), [4] = רמת הקושי (data.lv), [5] = דקות לימוד. נקודה חדשה כשמשתנה הבלוק או הרמה.
  function tl(){var a=+data.att,k=+data.ok;if(!T||!isFinite(a)||!isFinite(k))return;var L=T.tl||(T.tl=[]),b=Math.floor((T.sec||0)/1200),z=L[L.length-1],pg=isFinite(+data.prog)?+data.prog:null,lv=+data.lv||1,m=Math.round((T.sec||0)/60);
    if(z&&(a<z[1]||k<z[2])){L=T.tl=[];z=null}
    if(z&&z[0]===b&&L.length>1&&(z[4]||1)===lv){z[1]=a;z[2]=k;z[3]=pg;z[5]=m}else if(!z||z[1]!==a||z[0]!==b||(z[4]||1)!==lv)L.push([b,a,k,pg,lv,m]);
    if(L.length>80)L.splice(1,L.length-80);set('study_t_'+kid+'_'+app,T)}
  // מצב אורח (אורן 13.11.2026), כלל לכל study ולכל שיעור עתידי:
  // 1. אחרי 2 דקות של לימוד פעיל במצב אורח עם התקדמות אמיתית (יותר תשובות מבכניסה), חלון עדין: "במצב אורח ההתקדמות לא נשמרת, עוברים למשתמש שלך".
  //    "זה אני" = יציאה ממצב אורח לאותו שיעור, וההתקדמות של האורח עוברת לילד (study_adopt). "להמשיך כאורח" = שוב רק אחרי עוד 5 דקות.
  // 2. העברה (adopt): מפתחות ההתקדמות של השיעור (KEYS) עוברים מ-guest:<מפתח> לרגיל, רק אם לאורח יש יותר תשובות (att). סקווישים (מערכים) מתאחדים,
  //    זמן הלימוד והימים מתחברים, ומפתחות האורח נמחקים מהמכשיר. אחר כך טעינה מחדש והדיווח הרגיל שולח לשרת.
  // 3. AUTO: לביא שיחק הרבה בצלילים במצב אורח לפני 13.11.2026, ולכן אצלו ההעברה קורית פעם אחת אוטומטית כשהשיעור נפתח במשתמש שלו (study_adopted_<kid>_<app>).
  var NAMES={evyatar:'אביתר',dani:'דני',lia:'ליה',levi:'לביא',shilo:'שילה'},AUTO=['levi/phonics'];
  function raw(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function attOf(v){try{var o=JSON.parse(v);return o&&typeof o==='object'&&!Array.isArray(o)?(+o.att||+o.okc||0):0}catch(e){return 0}}
  function adopt(){if(off()||!KEYS.length)return false;var id=kid+'/'+app,ak='study_adopted_'+kid+'_'+app,L=get('study_adopt'),asked=false;
    if(Array.isArray(L)&&L.indexOf(id)>=0){asked=true;L.splice(L.indexOf(id),1);set('study_adopt',L)}
    if(!asked&&(AUTO.indexOf(id)<0||raw(ak)))return false;
    var gv=raw('guest:'+KEYS[0]),rv=raw(KEYS[0]);if(gv==null||(rv!=null&&attOf(gv)<=attOf(rv)))return false;
    KEYS.forEach(function(x){var g=raw('guest:'+x);if(g==null)return;var r=raw(x),v=g;
      try{var a=JSON.parse(g),b=r!=null?JSON.parse(r):null;if(Array.isArray(a)&&Array.isArray(b))v=JSON.stringify(b.concat(a.filter(function(y){return b.indexOf(y)<0})))}catch(e){}
      try{localStorage.setItem(x,v);localStorage.removeItem('guest:'+x)}catch(e){}});
    var tk='study_t_'+kid+'_'+app,gt=get('guest:'+tk);
    if(gt){var rt=get(tk);if(!rt)rt=gt;else{rt.sec=(rt.sec||0)+(gt.sec||0);rt.days=rt.days||{};for(var d in(gt.days||{}))rt.days[d]=(rt.days[d]||0)+gt.days[d];if(gt.first&&(!rt.first||gt.first<rt.first))rt.first=gt.first;if(gt.tl)rt.tl=gt.tl}
      set(tk,rt);try{localStorage.removeItem('guest:'+tk)}catch(e){}}
    var n=attOf(gv);set(ak,{at:new Date().toISOString(),att:n});set('study_r_'+kid+'_'+app,{at:new Date().toISOString(),data:{att:n}});// שהגיבוי הישן בשרת לא ידרוס את מה שעבר
    stop=true;location.reload();return true}
  var gSec=0,gNext=120,gAtt0=null,gProg=false,gOpen=false;
  function nudge(){if(gOpen||document.getElementById('gnud'))return;gOpen=true;var nm=NAMES[kid]||'',o=document.createElement('div');o.id='gnud';
    o.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(30,41,59,.45);display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl;font-family:system-ui,Arial,sans-serif';
    o.innerHTML='<div style="background:#fff;border-radius:18px;max-width:340px;width:100%;padding:20px 18px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.2);color:#1e293b">'
      +'<div style="font-size:40px;line-height:1">🌟</div><div style="font-size:20px;font-weight:700;margin:8px 0 6px">וואו, איזו התקדמות יפה!</div>'
      +'<div style="font-size:16px;line-height:1.5;color:#334155">רק שתדעו: ב<b>מצב אורח</b> ההתקדמות, הנקודות והסקווישים <b>לא נשמרים</b>.<br>'+(nm?'אם זה '+nm+', עוברים עכשיו למשתמש של '+nm+', וכל מה שעשית עד עכשיו יעבור איתך.':'כדאי לעבור למשתמש שלך.')+'</div>'
      +'<button type="button" id="gnY" style="display:block;width:100%;margin-top:16px;padding:12px;font:700 17px system-ui,Arial,sans-serif;color:#fff;background:#2563eb;border:0;border-radius:14px;cursor:pointer">'+(nm?'✓ זה אני, '+nm+'! לשמור אצלי':'✓ לעבור למשתמש שלי')+'</button>'
      +'<button type="button" id="gnN" style="display:block;width:100%;margin-top:8px;padding:10px;font:600 15px system-ui,Arial,sans-serif;color:#475569;background:#f1f5f9;border:0;border-radius:14px;cursor:pointer">להמשיך כאורח</button></div>';
    document.body.appendChild(o);
    o.querySelector('#gnY').onclick=function(){var L=get('study_adopt');if(!Array.isArray(L))L=[];var id=kid+'/'+app;if(L.indexOf(id)<0)L.push(id);set('study_adopt',L);
      if(window.studyGuest)window.studyGuest(false,location.href.split('#')[0]);else location.reload()};
    o.querySelector('#gnN').onclick=function(){o.remove();gOpen=false;gSec=0;gNext=300}}
  function gTick(){if(!window.STUDY_GUEST||window.STUDY_REVIEW)return;gSec+=5;if(gSec>=gNext&&gProg)nudge()}
  window.StudyTrack={
    init:function(k,a,keys){kid=k;app=a;KEYS=keys||[];if(adopt())return;var key='study_t_'+k+'_'+a,old=get(key);if(KEYS.length){checkReset(KEYS,old);restore()}T=old||{first:new Date().toISOString(),sec:0,days:{}};T.days=T.days||{};
      ['pointerdown','keydown','touchstart'].forEach(function(e){addEventListener(e,act,{passive:true})});
      setInterval(function(){if(document.visibilityState!=='visible'||Date.now()-lastAct>60000)return;T.sec+=5;qzAct();gTick();var t=today();T.days[t]=(T.days[t]||0)+5;T.last=new Date().toISOString();set(key,T);dirty=true},5000);
      setInterval(function(){if(dirty)send(false)},60000);
      // איפוס מאזור ההורים גם כשהדף כבר פתוח (אורן 6.11.2026: לחץ איפוס והטלפון של ליה המשיך מאותו מקום): בדיקה כל 30 שניות וכשחוזרים לדף
      if(KEYS.length){setInterval(function(){checkReset(KEYS,T)},30000);addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')checkReset(KEYS,T)})}
      addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&dirty)send(true)});
      addEventListener('pagehide',function(){if(dirty)send(true)});
      T.last=new Date().toISOString();set(key,T)},
    report:function(o){data=o||{};var na=+data.att;if(isFinite(na)){if(gAtt0==null)gAtt0=na;else if(na>gAtt0)gProg=true}tl();later()},
    gift:function(cb){if(off())return;try{rpc('study_gift_take',{p_kid:kid,p_app:app}).then(function(j){if(j&&j.kind)cb(j)}).catch(function(){})}catch(e){}},
    test:function(cb){try{rpc('study_test_get',{p_kid:kid,p_app:app}).then(function(j){if(j&&j.d)cb(j)}).catch(function(){})}catch(e){}}
  };
})();
