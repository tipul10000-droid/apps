// דף ילד (אורן 11.11.2026): החדש והרלוונטי למעלה. כל תוכן לימוד = .item עם data-c="<ילד>/<תוכן>" (ו-data-t = מבחן/בוחן/הכתבה, data-gen = בלי ניחוש אוטומטי של תאריך).
// סדר: חדש עם מבחן קרוב ← חדש ← מבחן קרוב (הקרוב ראשון, עד 14 יום) ← השאר לפי הסדר בקובץ ← "בקרוב" (בבדיקה) בסוף.
// תאריכי המבחנים נשמרים במכשיר (study_kl_<ילד>), כך שהסדר נקבע מיד כשהדף נפתח ולא קופץ אחרי טעינה.
(function(){
  var SB='https://emgtyfksnofzzlutngbf.supabase.co/rest/v1/rpc/',SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZ3R5Zmtzbm9menpsdXRuZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDI0MTMsImV4cCI6MjEwNjgxODQxM30.b7XE-gbCUlXMqpza1Bn9GvMKQsmu3jKP2eqZ0r4-k2k';
  function lj(k){try{return JSON.parse(localStorage.getItem(k))||{}}catch(e){return{}}}
  function days(d){var t=new Date(new Date().toDateString()),x=new Date(d+'T00:00:00');return Math.round((x-t)/864e5)}
  window.StudyList={init:function(kid){
    var L=document.querySelector('.list');if(!L)return;var I=[].slice.call(L.querySelectorAll('.item[data-c]')),key='study_kl_'+kid,C=lj(key);
    I.forEach(function(a,i){a.dataset.o=i});
    // אורן 13.11.2026: שלושה אזורים ברורים: 🎯 לפנינו (מבחן עם תאריך), 📚 למידה כללית (תמיד לפנינו), 🏆 ההישגים שלי (מבחן שבוצע, עם חותמת הציון).
    var H={};[['up','🎯 לפנינו'],['gen','📚 למידה כללית'],['done','🏆 ההישגים שלי']].forEach(function(x){var h=document.createElement('div');h.className='lh lh-'+x[0];h.textContent=x[1];H[x[0]]=h});
    function grp(a){var t=C[a.dataset.c]||{},n=t.d?days(t.d):null;if(a.classList.contains('soon'))return 'gen';if(n!=null&&n>=0)return 'up';if(t.s!=null||(n!=null&&n<0))return 'done';return 'gen'}
    function draw(){
      I.forEach(function(a){var t=C[a.dataset.c]||{},ch=a.querySelector('.chip'),n=t.d?days(t.d):null,w=a.dataset.t||'מבחן',g=grp(a);a.dataset.g=g;a.classList.toggle('dn',g==='done');stamp(a,t.s!=null&&!a.classList.contains('soon')?+t.s:null);
        a.dataset.n=g==='up'?n:'';
        var txt=g==='up'?(n===0?'🎯 ה'+w+' היום!':n===1?'🎯 '+w+' מחר':'🎯 '+w+' בעוד '+n+' ימים'):g==='done'?(t.s!=null?(+t.s>=85?'✓ בוצע · מצוין!':'✓ בוצע'):'⏳ מחכים לציון'):'';
        if(!txt){if(ch)ch.remove();return}
        if(!ch){ch=document.createElement('span');ch.className='chip';a.querySelector('.tx').appendChild(ch)}
        ch.textContent=txt;ch.classList.toggle('hot',g==='up'&&n<=3);ch.classList.toggle('ok',g==='done')});
      var S=I.slice().sort(function(a,b){return sc(a)-sc(b)||a.dataset.o-b.dataset.o});
      ['up','gen','done'].forEach(function(g){var G=S.filter(function(a){return a.dataset.g===g});if(!G.length){if(H[g].parentNode)H[g].remove();return}L.appendChild(H[g]);G.forEach(function(a){L.appendChild(a)})})}
    // חותמת ציון (אורן 13.11.2026): תוכן שכבר קיבל ציון במבחן מקבל חותמת עגולה בצד שמאל של הכרטיס. 85 ומעלה = חותמת כחולה מלאה עם כוכב.
    function stamp(a,s){var e=a.querySelector('.stp');if(s==null||a.classList.contains('soon')){if(e)e.remove();return}
      if(!e){e=document.createElement('span');e.className='stp';a.insertBefore(e,a.querySelector('.go'))}
      var g=s>=85?'top':s>=70?'ok':'low',v=String(Math.round(s));e.className='stp '+g;e.setAttribute('aria-label','ציון '+v);
      e.innerHTML=(g==='top'?'<i>★</i>':'<i>ציון</i>')+'<b>'+v+'</b>';
      // פעם ראשונה שהציון הזה מופיע במכשיר: החותמת "ננחתת" על הכרטיס (פעם אחת בלבד, study_stp_seen)
      var sn=lj('study_stp_seen');if(sn[a.dataset.c]!==v){sn[a.dataset.c]=v;try{localStorage.setItem('study_stp_seen',JSON.stringify(sn))}catch(x){}e.classList.add('pop')}}
    function sc(a){if(a.classList.contains('soon'))return 900;return (a.querySelector('.nwr')?0:50)+(a.dataset.n!==''?+a.dataset.n:30)} // בתוך כל אזור: חדש + מבחן קרוב = הכי למעלה
    draw();
    // אורן 11.11.2026: "חדש!" רק עד הכניסה הראשונה. לחיצה על התוכן מסמנת אותו כנראה מיד, וחזרה לדף (גם מהמטמון של ספארי) מורידה את הסרט.
    function unNew(){I.forEach(function(a){var r=a.querySelector('.nwr');if(r&&window.StudyContent&&!StudyContent.isNew(a.dataset.c))r.remove()});draw()}
    I.forEach(function(a){a.addEventListener('click',function(){if(window.StudyContent&&!a.classList.contains('soon'))StudyContent.seen(a.dataset.c)})});
    addEventListener('pageshow',function(e){if(e.persisted)unNew()});
    I.forEach(function(a){var p=a.dataset.c.split('/');if(p[0]!==kid)return;
      fetch(SB+'study_test_get',{method:'POST',headers:{'Content-Type':'application/json',apikey:SK,Authorization:'Bearer '+SK},body:JSON.stringify({p_kid:p[0],p_app:p[1]})})
       .then(function(r){return r.ok?r.json():null}).then(function(j){if(!j)return;var v=j.d&&!(j.auto&&a.dataset.gen)?{d:j.d}:{};if(j.score!=null)v.s=+j.score;
         if(JSON.stringify(C[a.dataset.c]||{})===JSON.stringify(v))return;C[a.dataset.c]=v;try{localStorage.setItem(key,JSON.stringify(C))}catch(e){}draw()}).catch(function(){})})
  }};
})();
