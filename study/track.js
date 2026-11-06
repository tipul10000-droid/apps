// מעקב התקדמות ל-study: זמן פעילות + דיווח לאזור ההורים (Supabase, פונקציה study_report).
// שימוש: StudyTrack.init('dani','spelling'); StudyTrack.report({...נתוני האפליקציה});
// מפתחות מקומיים: study_dev (זהות המכשיר), study_t_<kid>_<app> (זמן), study_r_<kid>_<app> (הדיווח האחרון).
// איפוס מאזור ההורים: init(kid, app, [מפתחות ההתקדמות של האפליקציה]). אם ההורים איפסו (study_reset_get) אחרי שההתקדמות במכשיר התחילה,
// המפתחות נמחקים והדף נטען מחדש. study_rs_<kid>_<app> = האיפוס האחרון שבוצע במכשיר. במצב אורח לא בודקים.
// גיבוי התקדמות (study_state_put/get): בכל דיווח נשמרים גם המפתחות שהועברו ל-init. אם במכשיר אין אף אחד מהם (למשל Study נפתחה מהאייקון במסך הבית,
// שבאייפון יש לו אחסון נפרד מספארי), הגיבוי משוחזר והדף נטען מחדש. השרת שומר את הגיבוי עם הכי הרבה תשובות (att). במצב אורח לא.
// מתנות: StudyTrack.gift(cb) — אם יש מתנה שמחכה (study_gift_take), cb({kind, note}).
(function(){
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
    var o={};for(var k in data)o[k]=data[k];o.first=T.first;o.sec=T.sec;o.last=T.last;o.days=days;o.v=1;return o}
  function putState(keep){if(window.STUDY_GUEST||!KEYS.length)return;var o={},n=0;KEYS.forEach(function(x){var v=localStorage.getItem(x);if(v!=null){o[x]=v;n++}});if(!n)return;
    try{fetch(SB_URL+'/rest/v1/rpc/study_state_put',{method:'POST',keepalive:!!keep,headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},
      body:JSON.stringify({p_kid:kid,p_app:app,p_keys:o,p_score:+data.att||0})}).catch(function(){})}catch(e){}}
  function has(x){return !!PRE[x]}
  function restore(){if(window.STUDY_GUEST)return;if(KEYS.some(has))return;var sk='study_rst_'+kid+'_'+app;
    try{if(sessionStorage.getItem(sk))return}catch(e){}
    rpc('study_state_get',{p_kid:kid,p_app:app}).then(function(j){if(!j||!j.keys)return;var n=0;
      for(var x in j.keys)if(KEYS.indexOf(x)>=0&&typeof j.keys[x]==='string'){try{localStorage.setItem(x,j.keys[x]);n++}catch(e){}}
      if(n){try{sessionStorage.setItem(sk,'1')}catch(e){}stop=true;location.reload()}}).catch(function(){})}
  function send(keep){if(stop)return;var d=dev(),p=payload();putState(keep);set('study_r_'+kid+'_'+app,{at:new Date().toISOString(),data:p});dirty=false;
    try{fetch(SB_URL+'/rest/v1/rpc/study_report',{method:'POST',keepalive:!!keep,headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},
      body:JSON.stringify({p_device:d.id,p_token:d.token,p_kid:kid,p_app:app,p_data:p})}).catch(function(){})}catch(e){}}
  function later(){dirty=true;clearTimeout(timer);timer=setTimeout(function(){send(false)},4000)}
  var lastTap=0;function act(){lastAct=lastTap=Date.now()}
  // שחרור חידון הכניסה (אורן 6.11.2026): בזמן נעילה, כל 5 שניות של לימוד פעיל (נגיעה ב-30 השניות האחרונות) נספרות ב-study_qz_<kid>.act; 20 דקות = הנעילה משתחררת.
  function qzAct(){if(Date.now()-lastTap>30000)return;try{var qk='study_qz_'+kid,q=JSON.parse(localStorage.getItem(qk)||'{}');if(!q.until||q.until<=Date.now())return;q.act=(q.act||0)+5;if(q.act>=1200){q.until=0;q.act=0;q.n=0}localStorage.setItem(qk,JSON.stringify(q))}catch(e){}}
  function rpc(fn,body){return fetch(SB_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify(body)}).then(function(r){return r.ok?r.json():null})}
  function checkReset(keys,old){if(window.STUDY_GUEST)return;var sk='study_rs_'+kid+'_'+app;
    try{rpc('study_reset_get',{p_kid:kid,p_app:app}).then(function(j){if(!j||!j.at)return;var at=new Date(j.at).getTime(),seen=get(sk);if(seen===j.at)return;
      var has=keys.some(function(x){return localStorage.getItem(x)!=null}),before=!old||!old.first||new Date(old.first).getTime()<at;
      set(sk,j.at);if(!(has&&before))return;
      stop=true;keys.concat(['study_t_'+kid+'_'+app,'study_r_'+kid+'_'+app]).forEach(function(x){try{localStorage.removeItem(x)}catch(e){}});
      location.reload()}).catch(function(){})}catch(e){}}
  window.StudyTrack={
    init:function(k,a,keys){kid=k;app=a;KEYS=keys||[];var key='study_t_'+k+'_'+a,old=get(key);if(KEYS.length){checkReset(KEYS,old);restore()}T=old||{first:new Date().toISOString(),sec:0,days:{}};T.days=T.days||{};
      ['pointerdown','keydown','touchstart'].forEach(function(e){addEventListener(e,act,{passive:true})});
      setInterval(function(){if(document.visibilityState!=='visible'||Date.now()-lastAct>60000)return;T.sec+=5;qzAct();var t=today();T.days[t]=(T.days[t]||0)+5;T.last=new Date().toISOString();set(key,T);dirty=true},5000);
      setInterval(function(){if(dirty)send(false)},60000);
      addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&dirty)send(true)});
      addEventListener('pagehide',function(){if(dirty)send(true)});
      T.last=new Date().toISOString();set(key,T)},
    report:function(o){data=o||{};later()},
    gift:function(cb){if(window.STUDY_GUEST)return;try{rpc('study_gift_take',{p_kid:kid,p_app:app}).then(function(j){if(j&&j.kind)cb(j)}).catch(function(){})}catch(e){}},
    test:function(cb){try{rpc('study_test_get',{p_kid:kid,p_app:app}).then(function(j){if(j&&j.d)cb(j)}).catch(function(){})}catch(e){}}
  };
})();
