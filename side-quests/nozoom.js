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

// 28.11.2026 (אורן: "כפתורי הצד עולים למעלה, לתקן לתמיד"): מנגנון אחד בלבד לעיגון הכפתורים הצפים.
// שורש הבעיה: היו שלושה מנגנונים שנלחמו זה בזה (bottom ב-CSS, translate כאן, ו-top לפי visualViewport.height ב-index.html).
// ה-top חושב מגובה ה-visual viewport, שמצטמצם בזמן מקלדת / חזרה לאפליקציה / קפיצת גלילה, ולכן הכפתורים נתקעו למעלה.
// החוק עכשיו (בודק אותו tests/fab-guard.mjs): הכפתורים תמיד מעוגנים ב-bottom ב-CSS, ורק מותר להזיז אותם מטה
// (translate חיובי, עם תקרה) כשה-layout viewport של iOS נשאר מכווץ. אף פעם לא למעלה, ואף פעם לא עם top.
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
      if(!(d>=2))d=0;                                   // רק מטה. מספר שלילי / NaN = אין תיקון
      d=Math.min(d,Math.round(window.innerHeight*0.4)); // תקרה: תיקון חריג לא יזרוק את הכפתורים מהמסך
    }
    if(d!==last){last=d;document.documentElement.style.setProperty('--vvfix',d+'px');}
    if(d>0&&!editing()&&!fix.n){fix.n=1;setTimeout(function(){fix.n=0;try{window.scrollTo(window.scrollX,window.scrollY);}catch(e){}},60);}
  }
  // 16.10 (אורן 15.11.2026): בקפיצה של סוף הגלילה (rubber band) iOS מזיז את ה-visual viewport. ליד הקצוות מחכים שהגלילה תיעצר.
  var idle=0;
  function edge(){var y=window.scrollY,mx=document.documentElement.scrollHeight-window.innerHeight;return y<=1||y>=mx-1;}
  function q(){if(!raf)raf=requestAnimationFrame(fix);}
  function qs(){clearTimeout(idle);if(edge()&&!editing()){idle=setTimeout(q,300);return;}q();}
  window.addEventListener('scroll',qs,{passive:true});
  window.addEventListener('resize',q);
  window.addEventListener('orientationchange',function(){setTimeout(q,300);});
  window.addEventListener('pageshow',function(){q();setTimeout(q,400);});
  document.addEventListener('focusout',function(){setTimeout(q,50);setTimeout(q,400);});
  document.addEventListener('visibilitychange',function(){q();setTimeout(q,400);});
  if(window.visualViewport){visualViewport.addEventListener('resize',qs);visualViewport.addEventListener('scroll',qs);}
  setInterval(function(){if(!document.hidden&&!editing())q();},1000); // רשת ביטחון: iOS לפעמים לא שולח אירוע
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',q);else q();
})();
