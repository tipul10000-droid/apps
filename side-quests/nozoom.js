// חסימת זום בכל דפי Side Quests (אורן 6.11.2026): פינץ' והקשה כפולה. אותה שיטה כמו study/guest.js.
(function(){
  var vp='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  var m=document.querySelector('meta[name=viewport]');
  if(m)m.content=vp;else{m=document.createElement('meta');m.name='viewport';m.content=vp;document.head.appendChild(m);}
  var s=document.createElement('style');s.textContent='html,body,*{touch-action:manipulation}';document.head.appendChild(s);
  var no=function(ev){ev.preventDefault()};
  ['gesturestart','gesturechange','gestureend'].forEach(function(e){document.addEventListener(e,no,{passive:false})});
  document.addEventListener('touchstart',function(ev){if(ev.touches.length>1)ev.preventDefault()},{passive:false});
  document.addEventListener('touchmove',function(ev){if(ev.touches.length>1||(ev.scale&&ev.scale!==1))ev.preventDefault()},{passive:false});
  // באייפון user-scalable=no לבד לא מספיק: הקשה שנייה תוך 350ms לא מגיעה לזום, והלחיצה נשלחת ידנית (חוץ משדות קלט).
  var lastT=0;
  document.addEventListener('touchend',function(ev){
    var n=Date.now(),t=ev.target;
    if(n-lastT<350&&ev.cancelable&&ev.changedTouches.length===1&&!(t.closest&&t.closest('input,textarea,select,[contenteditable]'))){ev.preventDefault();if(t.click)t.click();}
    lastT=n;
  },{passive:false});
})();

// 16.1 (אורן 13.11.2026): באייפון (iOS 26) אחרי שהמקלדת נסגרת ה-layout viewport לפעמים נשאר מכווץ,
// וכל מה שמוצמד לתחתית (position:fixed; bottom) "עולה" לאמצע המסך בזמן גלילה. מודדים איפה התחתית של
// ה-fixed בפועל מול התחתית של המסך הנראה, ומזיזים את הכפתורים הצפים בהפרש (--vvfix). בלי מקלדת פתוחה בלבד.
(function(){
  var st=document.createElement('style');
  st.textContent='.fab,.toast,.syncsheet{translate:0 var(--vvfix,0px)}';
  document.head.appendChild(st);
  var probe=null,raf=0,last=-1;
  function editing(){var a=document.activeElement;return !!(a&&a.closest&&a.closest('input,textarea,select,[contenteditable]'));}
  function fix(){
    raf=0;
    if(!document.body)return;
    if(!probe){probe=document.createElement('div');probe.setAttribute('aria-hidden','true');probe.style.cssText='position:fixed;left:0;bottom:0;width:0;height:0;pointer-events:none;visibility:hidden';document.body.appendChild(probe);}
    var d=0;
    if(!editing()){
      var vv=window.visualViewport,target=vv?vv.offsetTop+vv.height:window.innerHeight;
      var cur=probe.getBoundingClientRect().bottom;
      d=Math.round(target-cur);
      if(d<2)d=0;
    }
    if(d!==last){last=d;document.documentElement.style.setProperty('--vvfix',d+'px');}
    if(d>0&&!editing()&&!fix.n){fix.n=1;setTimeout(function(){fix.n=0;try{window.scrollTo(window.scrollX,window.scrollY);}catch(e){}},60);}
  }
  function q(){if(!raf)raf=requestAnimationFrame(fix);}
  window.addEventListener('scroll',q,{passive:true});
  window.addEventListener('resize',q);
  window.addEventListener('orientationchange',function(){setTimeout(q,300);});
  document.addEventListener('focusout',function(){setTimeout(q,50);setTimeout(q,400);});
  document.addEventListener('visibilitychange',q);
  if(window.visualViewport){visualViewport.addEventListener('resize',q);visualViewport.addEventListener('scroll',q);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',q);else q();
})();
