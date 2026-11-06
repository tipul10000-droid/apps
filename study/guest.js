// מצב אורח של study: כל ההתקדמות נשמרת בנפרד (מפתחות עם הקידומת "guest:"), ושום דבר לא נשלח לשרת
// (לא לאזור ההורים ולא ללוח הדירוג). נטען ראשון בכל דף. הדגל: study_guest = "1".
// גם: כל דף לימוד נכנס במסך אחד, בלי גלילה ובלי זום (אורן 6.11.2026). דף שצריך גלילה (אזור ההורים) לא טוען את הקובץ הזה.
(function(){
  var css='html,body{height:100%;overflow:hidden;overscroll-behavior:none;touch-action:manipulation}body{height:100dvh;min-height:0!important;display:flex;flex-direction:column}main{flex:1 1 auto;min-height:0!important;width:100%;box-sizing:border-box;overflow:hidden}';
  var st=document.createElement('style');st.textContent=css;(document.head||document.documentElement).appendChild(st);
  var fixVp=function(){var m=document.querySelector('meta[name=viewport]');if(m)m.content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fixVp);else fixVp();
  ['gesturestart','gesturechange'].forEach(function(e){document.addEventListener(e,function(ev){ev.preventDefault()},{passive:false})});
  addEventListener('scroll',function(){if(scrollX||scrollY)scrollTo(0,0)});
})();
(function(){
  var G=false;try{G=localStorage.getItem('study_guest')==='1'}catch(e){}
  window.STUDY_GUEST=G;
  window.studyGuest=function(on,to){try{if(on)localStorage.setItem('study_guest','1');else localStorage.removeItem('study_guest')}catch(e){}location.href=to||location.href};
  if(!G)return;
  var P=Storage.prototype,gi=P.getItem,si=P.setItem,ri=P.removeItem;
  function k(x){x=String(x);return x==='study_guest'?x:'guest:'+x}
  P.getItem=function(x){return gi.call(this,k(x))};
  P.setItem=function(x,v){return si.call(this,k(x),v)};
  P.removeItem=function(x){return ri.call(this,k(x))};
  var f=window.fetch;
  window.fetch=function(u){var s=String(u&&u.url||u);
    if(/\/rpc\/(study_report|vocab_lb_upsert|study_parents_set_test)/.test(s))return Promise.resolve(new Response('true',{status:200,headers:{'Content-Type':'application/json'}}));
    return f.apply(this,arguments)};
  var gs=document.createElement('style');gs.textContent='body{background-color:#f7efe2!important;background-image:linear-gradient(rgba(180,83,9,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(180,83,9,.07) 1px,transparent 1px)!important}';(document.head||document.documentElement).appendChild(gs);// רקע חם במצב אורח
  function bar(){if(document.getElementById('gbar'))return;var b=document.createElement('div');b.id='gbar';
    b.style.cssText='position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:8px;justify-content:center;background:#fff7e6;color:#9a3412;border-bottom:1px solid #fcd9a8;font:600 14px system-ui,Arial,sans-serif;padding:7px 10px;direction:rtl';
    b.innerHTML='🧪 מצב אורח: ההתקדמות כאן לא נשמרת לילדים <button type="button" style="font:inherit;font-size:13px;color:#9a3412;background:#fff;border:1px solid #fcd9a8;border-radius:14px;padding:2px 10px;cursor:pointer">יציאה</button>';
    var root=location.pathname.replace(/study\/.*$/,'study/');
    b.querySelector('button').onclick=function(){window.studyGuest(false,root)};
    document.body.insertBefore(b,document.body.firstChild)}
  if(document.body)bar();else document.addEventListener('DOMContentLoaded',bar);
})();
