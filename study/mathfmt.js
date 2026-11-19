// תצוגת מספרים בתוכן מתמטיקה של ליה ודני (אורן 19.11.2026). כל תוכן מתמטיקה חדש שלהן טוען את הקובץ הזה.
// 1. בלי פסיק בין האלפים למאות: MathFmt.fmt(3800) = "3800" (אצל אביתר משאירים פסיק, לא טוענים את הקובץ שם).
//    בטקסטים כותבים 3800 ולא 3,800. פסיק נשאר רק כסימן פיסוק ובין פריטים ברשימה ("0, 1, 2, 3").
// 2. סדרה: MathFmt.seqH('3800, 3700, 3600, ?') = כל מספר במשבצת משלו מעל קו, המקום החסר ריק עם ? מעליו.
// 3. שום תרגיל לא נחתך: כל .ex/.sx/.eq/.weq/.seq שחורג מהרוחב מתכווץ אוטומטית עד שהוא נכנס.
(function(){
  var css='.seq{display:flex;direction:ltr;unicode-bidi:isolate;justify-content:center;gap:10px;width:100%;max-width:400px;margin:2px auto}'+
    '.sl{flex:1 1 0;min-width:0;max-width:92px;height:50px;display:flex;align-items:flex-end;justify-content:center;border-bottom:3px solid #334155;padding-bottom:2px}'+
    '.sl b{font:800 clamp(19px,7vw,32px)/1.1 system-ui,Arial,sans-serif;font-variant-numeric:tabular-nums;color:var(--fg,#0f172a);white-space:nowrap}'+
    '.sl.q{border-bottom:3px dashed var(--pk,#f97316)}.sl.q i{font:900 clamp(24px,8vw,36px)/1 system-ui,Arial,sans-serif;font-style:normal;color:var(--pk,#f97316);align-self:center}'+
    '.sl.a b{color:var(--ok,#16a34a)}.seq.ls{margin:8px auto}.seq.ls .sl{height:40px}.seq.ls .sl b{font-size:clamp(17px,6vw,26px)}'+
    '@media(max-height:700px){.sl{height:42px}}';
  var st=document.createElement('style');st.textContent=css;(document.head||document.documentElement).appendChild(st);
  function fmt(n){return String(n)}
  function isSeq(s){return /, /.test(s||'')&&/\?/.test(s||'')}
  // ans: להציג את התשובה במקום ה-? (בהסברים)
  function seqH(s,cls,ans){return '<div class="seq'+(cls?' '+cls:'')+'">'+String(s).split(/,\s*/).map(function(t){t=t.trim();
    if(t==='?')return ans!=null?'<span class="sl a"><b>'+ans+'</b></span>':'<span class="sl q"><i>?</i></span>';
    return '<span class="sl"><b>'+t+'</b></span>'}).join('')+'</div>'}
  var SEL='.ex,.sx,.eq,.weq,.sl b',busy=false;
  function fit(){busy=false;document.querySelectorAll(SEL).forEach(function(el){
    if(!el.offsetParent)return;el.style.fontSize='';
    var b=el.tagName==='B';var par=el.parentElement;
    var room=function(){return Math.min(par.clientWidth,document.documentElement.clientWidth-16)};
    var w=function(){return b||el.classList.contains('sx')?el.getBoundingClientRect().width:el.scrollWidth};
    var fs=parseFloat(getComputedStyle(el).fontSize),n=0;
    while(w()>room()+1&&fs>13&&n++<40){fs-=1;el.style.fontSize=fs+'px'}})}
  function later(){if(!busy){busy=true;requestAnimationFrame(fit)}}
  function start(){new MutationObserver(later).observe(document.body,{childList:true,subtree:true,characterData:true});addEventListener('resize',later);later()}
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
  window.MathFmt={fmt:fmt,isSeq:isSeq,seqH:seqH,fit:fit};
})();
