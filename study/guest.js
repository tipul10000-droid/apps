// מצב אורח של study: כל ההתקדמות נשמרת בנפרד (מפתחות עם הקידומת "guest:"), ושום דבר לא נשלח לשרת
// (לא לאזור ההורים ולא ללוח הדירוג). נטען ראשון בכל דף. הדגל: study_guest = "1".
// מרווח עליון קבוע (44px לפחות, אורן ביקש פחות מ-72), כדי שכלום לא ייכנס מתחת לאיילנד/שורת הסטטוס (אורן 6.11.2026).
// גם: כל דף לימוד נכנס במסך אחד, בלי גלילה ובלי זום (אורן 6.11.2026). דף שצריך גלילה (אזור ההורים) לא טוען את הקובץ הזה.
// 🔊 סאונדים קטנים שנעלמו אחרי 2-3 שאלות (אורן 19.11.2026, כל האפליקציות): באייפון ה-AudioContext עובר למצב "interrupted"
// (אחרי הקראה של speechSynthesis, הקלטה מתנגנת או שינוי של audioSession.type), והקוד הישן חידש אותו רק ממצב "suspended".
// כאן, לפני כל קוד אחר בדף: כל AudioContext שנוצר נרשם, ובכל נגיעה/מקש/חזרה לדף מחדשים כל אחד שלא "running".
// audioSession.type נקבע פעם אחת ל-playback, וכתיבה חוזרת של אותו ערך (שמפריעה לסאונד שמתנגן) מדולגת.
(function(){
  try{var S=navigator.audioSession;if(S){try{if(S.type!=='playback')S.type='playback'}catch(e){}
    var P=Object.getPrototypeOf(S),D=P&&Object.getOwnPropertyDescriptor(P,'type');
    if(D&&D.get&&D.set)Object.defineProperty(S,'type',{configurable:true,get:function(){return D.get.call(S)},set:function(v){try{if(D.get.call(S)!==v)D.set.call(S,v)}catch(e){}}})}}catch(e){}
  var L=[],N=window.AudioContext||window.webkitAudioContext;if(!N)return;
  function fix(){for(var i=0;i<L.length;i++){var c=L[i];try{if(c.state!=='running'&&c.state!=='closed'){var p=c.resume();if(p&&p.catch)p.catch(function(){})}}catch(e){}}}
  function W(a,b){var c=b===undefined?new N(a):new N(a,b);L.push(c);
    try{c.addEventListener('statechange',function(){if(c.state==='interrupted'&&!document.hidden)setTimeout(fix,250)})}catch(e){}return c}
  W.prototype=N.prototype;try{Object.setPrototypeOf(W,N)}catch(e){}
  window.AudioContext=W;if(window.webkitAudioContext)window.webkitAudioContext=W;
  ['touchstart','touchend','pointerdown','mousedown','keydown','click'].forEach(function(ev){document.addEventListener(ev,fix,{capture:true,passive:true})});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)fix()});window.addEventListener('pageshow',fix);window.addEventListener('focus',fix);
  // אחרי הקראה (speechSynthesis) באייפון: מחדשים כשהיא נגמרת
  try{var sp=window.speechSynthesis&&speechSynthesis.speak.bind(speechSynthesis);if(sp)speechSynthesis.speak=function(u){try{u.addEventListener('end',function(){setTimeout(fix,60)});u.addEventListener('error',function(){setTimeout(fix,60)})}catch(e){}return sp(u)}}catch(e){}
  window.StudyAudioFix=fix;
})();
(function(){
  var css='html,body,*{touch-action:manipulation}html,body{height:100%;overflow:hidden;overscroll-behavior:none}body{height:100dvh;min-height:0!important;display:flex;flex-direction:column}html{padding-top:0!important;padding-bottom:0!important}body{box-sizing:border-box;padding-top:max(calc(env(safe-area-inset-top,0px) + 6px),44px);padding-bottom:env(safe-area-inset-bottom,0px)}main{flex:1 1 auto;min-height:0!important;width:100%;box-sizing:border-box;overflow:hidden}';
  var st=document.createElement('style');st.textContent=css;(document.head||document.documentElement).appendChild(st);
  // בלי זום ובלי סימון טקסט: nozoom.js (נטען כאן גם בדף שלא כלל אותו ב-<head>)
  if(!window.StudyNoZoom){var cs=document.currentScript,nz=document.createElement('script');nz.src=(cs&&cs.src?cs.src.replace(/guest\.js(\?.*)?$/,''):'/apps/study/')+'nozoom.js?v=1';(document.head||document.documentElement).appendChild(nz)}
  addEventListener('scroll',function(){if(scrollX||scrollY)scrollTo(0,0)});
})();
(function(){
  var G=false;try{G=localStorage.getItem('study_guest')==='1'}catch(e){}
  window.STUDY_GUEST=G;
  window.studyGuest=function(on,to){try{if(on)localStorage.setItem('study_guest','1');else localStorage.removeItem('study_guest')}catch(e){}location.href=to||location.href};
  // פס עליון בגובה קבוע בכל דף ובשני המצבים (אורן 6.11.2026): במצב רגיל הוא ריק, במצב אורח מציג "מצב אורח" + יציאה, כך ששום דבר לא זז כשנכנסים או יוצאים.
  function bar(){if(document.getElementById('gbar'))return;var b=document.createElement('div');b.id='gbar';
    b.style.cssText='flex:none;height:32px;box-sizing:border-box;display:flex;align-items:center;gap:8px;justify-content:center;font:600 14px system-ui,Arial,sans-serif;padding:0 10px;direction:rtl;white-space:nowrap;'+(G?'background:#fff7e6;color:#9a3412;border-bottom:1px solid #fcd9a8':'');
    if(G){b.innerHTML='👀 מצב אורח: לא נשמר לילדים <button type="button" style="font:inherit;font-size:13px;color:#9a3412;background:#fff;border:1px solid #fcd9a8;border-radius:14px;padding:2px 10px;cursor:pointer">יציאה</button>';
      var root=location.pathname.replace(/study\/.*$/,'study/');b.querySelector('button').onclick=function(){window.studyGuest(false,root)}}
    document.body.insertBefore(b,document.body.firstChild)}
  if(document.body)bar();else document.addEventListener('DOMContentLoaded',bar);
  if(!G)return;
  var P=Storage.prototype,gi=P.getItem,si=P.setItem,ri=P.removeItem;
  // חידון הכניסה (אורן 6.11.2026): הנעילה (study_qz_*) וסימון 'עבר' (study_ok_*) משותפים לרגיל ולאורח, כדי שאורח באותו מכשיר לא יעקוף נעילה קיימת
  // study_profile (המשפחה שנבחרה במכשיר, 9.11.2026) משותף גם הוא
  // study_adopt (13.11.2026): בקשה מהאורח להעביר את ההתקדמות שלו לילד (track.js), ולכן נכתבת במפתח הרגיל
  function k(x){x=String(x);return (/^(appstat_dev|sq_pin|sq_key)$|^appstat_o_/.test(x)||x==='study_guest'||x==='study_profile'||x==='study_adopt'||/^study_(qz|ok)_/.test(x))?x:'guest:'+x}
  P.getItem=function(x){return gi.call(this,k(x))};
  P.setItem=function(x,v){return si.call(this,k(x),v)};
  P.removeItem=function(x){return ri.call(this,k(x))};
  var f=window.fetch;
  window.fetch=function(u){var s=String(u&&u.url||u);
    if(/\/rpc\/(study_report|vocab_lb_upsert|study_parents_set_test|study_request_add|study_material_add|study_material_hide|study_state_put|study_push_save|study_push_off|study_gift_take)/.test(s))return Promise.resolve(new Response('true',{status:200,headers:{'Content-Type':'application/json'}}));
    return f.apply(this,arguments)};
  var gs=document.createElement('style');gs.textContent='body{background-color:#f7efe2!important;background-image:linear-gradient(rgba(180,83,9,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(180,83,9,.08) 1px,transparent 1px)!important}';(document.head||document.documentElement).appendChild(gs);// רקע חם במצב אורח
})();

// 🎤 תמלול קולי בכל תיבת טקסט (voice.js, אורן 14.11.2026): נטען אוטומטית בכל דף study
(function(){try{var me=document.currentScript&&document.currentScript.src;if(!me)return;var f=document.createElement('script');f.src=me.replace(/guest\.js(\?.*)?$/,'fresh.js?v=1');f.defer=true;(document.head||document.documentElement).appendChild(f)}catch(e){}})();
(function(){try{var me=document.currentScript&&document.currentScript.src;if(!me||window.StudyVoice)return;var v=document.createElement('script');v.src=me.replace(/guest\.js(\?.*)?$/,'voice.js?v=1');v.defer=true;(document.head||document.documentElement).appendChild(v)}catch(e){}})();

// 🙋 תמיכת הורה בזמן אמת (help.js, אורן 19.11.2026): כפתור "עזרה" בפס העליון בכל דף תוכן, וההורה רואה את אותו מסך בדיוק
(function(){try{var me=document.currentScript&&document.currentScript.src;if(!me||window.StudyHelp)return;var v=document.createElement('script');v.src=me.replace(/guest\.js(\?.*)?$/,'help.js?v=4');v.defer=true;(document.head||document.documentElement).appendChild(v)}catch(e){}})();

// 📊 סטטיסטיקת שימוש (appstat.js, אורן 18.11.2026): נטען אוטומטית בכל דף study. משתמש = הילד לפי הכתובת; אורח בלי משתמש; תצוגת בדיקה של הורה לא נספרת
(function(){try{var me=document.currentScript&&document.currentScript.src;if(!me)return;var v=document.createElement('script');v.src=me.replace(/study\/guest\.js(\?.*)?$/,'appstat.js?v=1');v.defer=true;
  v.onload=function(){var m=/\/study\/([a-z]+)\//.exec(location.pathname),kid=m&&!/^(family|parents|kids|tools|audio|supabase)$/.test(m[1])?m[1]:null;
    window.AppStat&&AppStat.init({app:'study',uid:function(){return window.STUDY_GUEST?null:kid},skip:function(){return !!window.STUDY_REVIEW}})};
  (document.head||document.documentElement).appendChild(v)}catch(e){}})();
