// תוכן לימוד בבדיקה (אורן 6.11.2026): תוכן חדש מוצג קודם רק להורים, באזור ההורים ("🧪 תוכן בבדיקה").
// הילד רואה "בקרוב" עד שההורה לוחץ "✓ התוכן אושר". אחרי האישור התוכן נפתח לילד עם סרט "חדש!" חגיגי (עד שנכנס אליו, ולכל היותר 10 ימים).
// REG: מצב כל תוכן בקוד. 'review' = בבדיקה (נפתח רק אחרי אישור בשרת: study_content_get), 'live' = פתוח תמיד.
// תוכן חדש: מוסיפים כאן 'review', ובדף התוכן StudyContent.guard('<kid>/<app>') מיד אחרי guest.js.
(function(){
  var REG={'evyatar/vocab':'live','dani/spelling':'live','lia/phonics':'review','levi/phonics':'live'}; // levi/phonics: אותו שיעור של ליה, אורן ביקש ישירות (9.11.2026)
  var SB='https://emgtyfksnofzzlutngbf.supabase.co',KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZ3R5Zmtzbm9menpsdXRuZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDI0MTMsImV4cCI6MjEwNjgxODQxM30.b7XE-gbCUlXMqpza1Bn9GvMKQsmu3jKP2eqZ0r4-k2k';
  var CK='study_cnt_ok',SK='study_cnt_seen';
  function lj(k){try{return JSON.parse(localStorage.getItem(k))||{}}catch(e){return{}}}
  function sj(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function approvedAt(id){return REG[id]==='live'?'live':(lj(CK)[id]||null)}
  function ok(id){return !!approvedAt(id)}
  function review(){try{return sessionStorage.getItem('study_review')==='1'}catch(e){return false}}
  function refresh(cb){
    fetch(SB+'/rest/v1/rpc/study_content_get',{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+KEY},body:'{}'})
      .then(function(r){return r.ok?r.json():null}).then(function(j){if(!j||!j.items)return;var m={};j.items.forEach(function(x){if(x.approved_at)m[x.id]=x.approved_at});
        var old=Object.keys(lj(CK)).sort().join();sj(CK,m);if(cb&&old!==Object.keys(m).sort().join())cb()}).catch(function(){})}
  window.StudyContent={
    reg:REG,ok:ok,refresh:refresh,
    // "נראה" נשמר עם זמן האישור: אישור מחדש (או ערך ישן 1) מחזיר את הסרט "חדש!" עד הכניסה הבאה.
    isNew:function(id){var a=approvedAt(id);if(!a||a==='live')return false;if(lj(SK)[id]===a)return false;return Date.now()-Date.parse(a)<10*864e5},
    seen:function(id){var s=lj(SK),a=approvedAt(id)||1;if(s[id]!==a){s[id]=a;sj(SK,s)}},
    // בדף התוכן: ילד שעוד אין לו אישור חוזר לדף שלו. הורה שנכנס מאזור ההורים (?review=1) רואה הכול, עם פס "תצוגת בדיקה".
    guard:function(id){
      try{if(/[?&]review=1/.test(location.search))sessionStorage.setItem('study_review','1')}catch(e){}
      if(REG[id]==='live')return;
      if(review()){window.STUDY_REVIEW=1; // תצוגת בדיקה של הורה: לא מדווחים ולא מגבים התקדמות בשם הילד (track.js)
        document.addEventListener('DOMContentLoaded',function(){var b=document.createElement('div');b.textContent='🧪 תצוגת בדיקה להורים: הילד עוד לא רואה את התוכן הזה';b.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:60;background:#fff7ed;color:#9a3412;border-top:1px solid #fed7aa;font:600 12px system-ui,Arial,sans-serif;text-align:center;padding:4px 8px calc(env(safe-area-inset-bottom,0px) + 4px);pointer-events:none';document.body.appendChild(b)});return}
      if(ok(id)){StudyContent.seen(id);return}
      document.documentElement.style.visibility='hidden';
      refresh();setTimeout(function(){if(ok(id)){document.documentElement.style.visibility='';StudyContent.seen(id)}else location.replace('../')},900)}
  };
})();
