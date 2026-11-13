// מצב אורח של study: כל ההתקדמות נשמרת בנפרד (מפתחות עם הקידומת "guest:"), ושום דבר לא נשלח לשרת
// (לא לאזור ההורים ולא ללוח הדירוג). נטען ראשון בכל דף. הדגל: study_guest = "1".
// מרווח עליון קבוע (44px לפחות, אורן ביקש פחות מ-72), כדי שכלום לא ייכנס מתחת לאיילנד/שורת הסטטוס (אורן 6.11.2026).
// גם: כל דף לימוד נכנס במסך אחד, בלי גלילה ובלי זום (אורן 6.11.2026). דף שצריך גלילה (אזור ההורים) לא טוען את הקובץ הזה.
(function(){
  var css='html,body,*{touch-action:manipulation}html,body{height:100%;overflow:hidden;overscroll-behavior:none}body{height:100dvh;min-height:0!important;display:flex;flex-direction:column}html{padding-top:0!important;padding-bottom:0!important}body{box-sizing:border-box;padding-top:max(calc(env(safe-area-inset-top,0px) + 6px),44px);padding-bottom:env(safe-area-inset-bottom,0px)}main{flex:1 1 auto;min-height:0!important;width:100%;box-sizing:border-box;overflow:hidden}';
  var st=document.createElement('style');st.textContent=css;(document.head||document.documentElement).appendChild(st);
  var fixVp=function(){var m=document.querySelector('meta[name=viewport]');if(m)m.content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fixVp);else fixVp();
  ['gesturestart','gesturechange','gestureend'].forEach(function(e){document.addEventListener(e,function(ev){ev.preventDefault()},{passive:false})});
  document.addEventListener('touchmove',function(ev){if(ev.touches.length>1||(ev.scale&&ev.scale!==1))ev.preventDefault()},{passive:false});
  // דאבל-טאפ: באייפון user-scalable=no לא עובד. touch-action:manipulation מבטל זום בהקשה כפולה, ולמקרה שלא: הקשה שנייה מהירה לא מגיעה לזום, והלחיצה נשלחת ידנית.
  var lastT=0;document.addEventListener('touchend',function(ev){var n=Date.now(),t=ev.target;if(n-lastT<350&&ev.cancelable&&!(t.closest&&t.closest('input,textarea,select,[contenteditable]'))){ev.preventDefault();if(t.click)t.click();else if(t.dispatchEvent)t.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))}lastT=n},{passive:false});
  document.addEventListener('touchstart',function(ev){if(ev.touches.length>1)ev.preventDefault()},{passive:false});
  document.addEventListener('dblclick',function(ev){ev.preventDefault()},{passive:false});
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
  function k(x){x=String(x);return (x==='study_guest'||x==='study_profile'||x==='study_adopt'||/^study_(qz|ok)_/.test(x))?x:'guest:'+x}
  P.getItem=function(x){return gi.call(this,k(x))};
  P.setItem=function(x,v){return si.call(this,k(x),v)};
  P.removeItem=function(x){return ri.call(this,k(x))};
  var f=window.fetch;
  window.fetch=function(u){var s=String(u&&u.url||u);
    if(/\/rpc\/(study_report|vocab_lb_upsert|study_parents_set_test|study_request_add|study_material_add|study_material_hide|study_state_put|study_push_save|study_push_off|study_gift_take)/.test(s))return Promise.resolve(new Response('true',{status:200,headers:{'Content-Type':'application/json'}}));
    return f.apply(this,arguments)};
  var gs=document.createElement('style');gs.textContent='body{background-color:#f7efe2!important;background-image:linear-gradient(rgba(180,83,9,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(180,83,9,.08) 1px,transparent 1px)!important}';(document.head||document.documentElement).appendChild(gs);// רקע חם במצב אורח
})();
