// בלי זום ובלי סימון טקסט בכל אפליקציית Study (אורן 19.11.2026, כלל קבוע לכל הדפים ולכל תוכן עתידי):
// אין זום בצביטה, אין זום בהקשה כפולה, אין סימון טקסט / תפריט בלחיצה ארוכה. גם בספארי באייפון וגם באפליקציה ממסך הבית.
// שדות הקלדה (input/textarea/contenteditable) נשארים רגילים. כל דף טוען את הקובץ הזה ב-<head>; guest.js טוען אותו גם אם נשכח.
(function(){
  if(window.StudyNoZoom)return;window.StudyNoZoom=1;
  var ED='input,textarea,select,[contenteditable]:not([contenteditable=false])';
  function ed(t){return !!(t&&t.closest&&t.closest(ED))}
  var css='html,body,*{touch-action:manipulation}'+
    'html,body{-webkit-text-size-adjust:100%;text-size-adjust:100%}'+
    '*{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}'+
    'img,svg,a{-webkit-user-drag:none}'+
    'input,textarea,[contenteditable]:not([contenteditable=false]),[contenteditable]:not([contenteditable=false]) *{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}';
  var st=document.createElement('style');st.id='nozoomCss';st.textContent=css;(document.head||document.documentElement).appendChild(st);
  // מטא viewport: גם בלי זום אוטומטי כשנכנסים לשדה הקלדה
  var VP='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  function fixVp(){var m=document.querySelector('meta[name=viewport]');if(!m){m=document.createElement('meta');m.name='viewport';(document.head||document.documentElement).appendChild(m)}if(m.content!==VP)m.content=VP}
  fixVp();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fixVp);
  // צביטה: באייפון user-scalable=no לא מספיק, חוסמים את מחוות הזום עצמן
  ['gesturestart','gesturechange','gestureend'].forEach(function(e){document.addEventListener(e,function(ev){ev.preventDefault()},{passive:false})});
  document.addEventListener('touchstart',function(ev){if(ev.touches.length>1)ev.preventDefault()},{passive:false});
  document.addEventListener('touchmove',function(ev){if(ev.touches.length>1||(ev.scale&&ev.scale!==1))ev.preventDefault()},{passive:false});
  // הקשה כפולה: touch-action:manipulation מבטל אותה, ולמקרה שלא: הקשה שנייה מהירה לא מגיעה לזום, והלחיצה נשלחת ידנית.
  var lastT=0;document.addEventListener('touchend',function(ev){var n=Date.now(),t=ev.target;if(n-lastT<350&&ev.cancelable&&!ed(t)&&ev.changedTouches&&ev.changedTouches.length===1&&ev.touches.length===0){ev.preventDefault();if(t.click)t.click();else if(t.dispatchEvent)t.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))}lastT=n},{passive:false});
  document.addEventListener('dblclick',function(ev){ev.preventDefault()},{passive:false});
  // ctrl/⌘ + גלגלת או +/- במחשב
  document.addEventListener('wheel',function(ev){if(ev.ctrlKey)ev.preventDefault()},{passive:false});
  document.addEventListener('keydown',function(ev){if((ev.ctrlKey||ev.metaKey)&&['+','=','-','_','0'].indexOf(ev.key)>=0)ev.preventDefault()});
  // לחיצה ארוכה: בלי סימון טקסט ובלי תפריט (חוץ משדות הקלדה)
  document.addEventListener('selectstart',function(ev){if(!ed(ev.target))ev.preventDefault()});
  document.addEventListener('contextmenu',function(ev){if(!ed(ev.target))ev.preventDefault()});
  document.addEventListener('dragstart',function(ev){if(!ed(ev.target))ev.preventDefault()});
  document.addEventListener('selectionchange',function(){var s=window.getSelection&&getSelection();if(!s||s.isCollapsed||!s.rangeCount)return;var a=document.activeElement;if(ed(a))return;var n=s.anchorNode;n=n&&(n.nodeType===1?n:n.parentElement);if(!ed(n))s.removeAllRanges()});
})();
