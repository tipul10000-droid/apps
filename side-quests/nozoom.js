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
