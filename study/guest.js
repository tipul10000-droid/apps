// מצב אורח של study: כל ההתקדמות נשמרת בנפרד (מפתחות עם הקידומת "guest:"), ושום דבר לא נשלח לשרת
// (לא לאזור ההורים ולא ללוח הדירוג). נטען ראשון בכל דף. הדגל: study_guest = "1".
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
  function bar(){if(document.getElementById('gbar'))return;var b=document.createElement('div');b.id='gbar';
    b.style.cssText='position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:8px;justify-content:center;background:#fff7e6;color:#9a3412;border-bottom:1px solid #fcd9a8;font:600 14px system-ui,Arial,sans-serif;padding:7px 10px;direction:rtl';
    b.innerHTML='🧪 מצב אורח: ההתקדמות כאן לא נשמרת לילדים <button type="button" style="font:inherit;font-size:13px;color:#9a3412;background:#fff;border:1px solid #fcd9a8;border-radius:14px;padding:2px 10px;cursor:pointer">יציאה</button>';
    var root=location.pathname.replace(/study\/.*$/,'study/');
    b.querySelector('button').onclick=function(){window.studyGuest(false,root)};
    document.body.insertBefore(b,document.body.firstChild)}
  if(document.body)bar();else document.addEventListener('DOMContentLoaded',bar);
})();
