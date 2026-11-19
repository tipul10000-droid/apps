// דף ילד (אורן 11.11.2026): החדש והרלוונטי למעלה. כל תוכן לימוד = .item עם data-c="<ילד>/<תוכן>" (ו-data-t = מבחן/בוחן/הכתבה, data-gen = בלי ניחוש אוטומטי של תאריך, data-x = נבנה למבחן מסוים ולכן אף פעם לא "למידה כללית").
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
    // אורן 14.11.2026: "למידה כללית" רק לתוכן בלי מבחן. תוכן שקיבל תאריך מבחן יוצא משם אוטומטית, ותוכן שנבנה מראש למבחן/בוחן (data-x) אף פעם לא שם:
    // כשאין לו תאריך קרוב (המבחן עבר, או ההורים סימנו "בוצע") הוא עובר ל"ההישגים שלי" עם "⏳ מחכים לציון" עד שמגיע ציון.
    function grp(a){var t=C[a.dataset.c]||{},n=t.d?days(t.d):t.p?days(t.p):null;if(a.classList.contains('soon'))return 'gen';if(n!=null&&n>=0)return 'up';if(t.s!=null||(n!=null&&n<0)||a.dataset.x)return 'done';return 'gen'}
    function draw(){
      I.forEach(function(a){var t=C[a.dataset.c]||{},ch=a.querySelector('.chip'),n=t.d?days(t.d):null,w=a.dataset.t||'מבחן',g=grp(a);a.dataset.g=g;a.classList.toggle('dn',g==='done');stamp(a,t.s!=null&&!a.classList.contains('soon')?+t.s:null);
        a.dataset.n=g==='up'?n:'';
        var txt=g==='up'?(n===0?'🎯 ה'+w+' היום!':n===1?'🎯 '+w+' מחר':'🎯 '+w+' בעוד '+n+' ימים'):g==='done'?(t.s!=null?(+t.s>=85?'✓ בוצע · מצוין!':'✓ בוצע'):due(t)?'✏️ להזין ציון':'⏳ מחכים לציון'):'';
        if(!txt){if(ch)ch.remove();return}
        if(!ch){ch=document.createElement('span');ch.className='chip';a.querySelector('.tx').appendChild(ch)}
        ch.textContent=txt;ch.classList.toggle('hot',g==='up'&&n<=3);ch.classList.toggle('ok',g==='done'&&!(t.s==null&&due(t)));ch.classList.toggle('sc',g==='done'&&t.s==null&&!!due(t))});
      var S=I.slice().sort(function(a,b){return sc(a)-sc(b)||a.dataset.o-b.dataset.o});
      ['up','gen','done'].forEach(function(g){var G=S.filter(function(a){return a.dataset.g===g});if(!G.length){if(H[g].parentNode)H[g].remove();return}L.appendChild(H[g]);G.forEach(function(a){L.appendChild(a)})})}
    // חותמת ציון (אורן 13.11.2026): תוכן שכבר קיבל ציון במבחן מקבל חותמת עגולה בצד שמאל של הכרטיס. 85 ומעלה = חותמת כחולה מלאה עם כוכב.
    function stamp(a,s){var e=a.querySelector('.stp');if(s==null||a.classList.contains('soon')){if(e)e.remove();return}
      if(!e){e=document.createElement('span');e.className='stp';a.insertBefore(e,a.querySelector('.go'))}
      var g=s>=85?'hi':s>=70?'ok':'low',v=String(Math.round(s));e.className='stp '+g+(v.length>2?' d3':'');e.setAttribute('aria-label','ציון '+v);
      e.innerHTML=(g==='hi'?'<i>★</i>':'<i>ציון</i>')+'<b>'+v+'</b>';
      // פעם ראשונה שהציון הזה מופיע במכשיר: החותמת "ננחתת" על הכרטיס (פעם אחת בלבד, study_stp_seen)
      var sn=lj('study_stp_seen');if(sn[a.dataset.c]!==v){sn[a.dataset.c]=v;try{localStorage.setItem('study_stp_seen',JSON.stringify(sn))}catch(x){}e.classList.add('pop')}}
    // אורן 19.11.2026: יומיים אחרי מבחן עם תאריך ידוע הילד יכול להזין את הציון בעצמו (study_kid_result), וההורים מקבלים על זה הודעה.
    // לא במצב אורח ולא בתצוגת בדיקה. אחרי הזנה אי אפשר לשנות (רק ההורים מוחקים).
    function due(t){if(window.STUDY_GUEST||window.STUDY_REVIEW||t.s!=null)return null;var d=t.d&&days(t.d)<=-2?t.d:(t.p&&days(t.p)<=-2?t.p:null);return d&&days(d)>=-60?d:null}
    var BOY=/^(evyatar|levi|shilo)$/.test(kid);
    function css(){if(document.getElementById('ksCss'))return;var st=document.createElement('style');st.id='ksCss';st.textContent=
      '.item .chip.sc{background:#2563eb;color:#fff;box-shadow:0 0 0 0 rgba(37,99,235,.5);animation:kspl 1.8s ease-out infinite;cursor:pointer}@keyframes kspl{0%{box-shadow:0 0 0 0 rgba(37,99,235,.5)}70%{box-shadow:0 0 0 7px rgba(37,99,235,0)}100%{box-shadow:0 0 0 0 rgba(37,99,235,0)}}'+
      '#ksOv{position:fixed;inset:0;z-index:60;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px}#ksOv[hidden]{display:none}'+
      '#ksOv .kb{width:100%;max-width:340px;height:470px;box-sizing:border-box;background:#fff;border-radius:20px;padding:16px;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.25);animation:ksin .25s ease}@keyframes ksin{from{transform:translateY(12px);opacity:0}}'+
      '#ksOv h3{margin:0;font-size:19px;text-align:center}#ksOv .ksu{margin:4px 0 10px;text-align:center;color:#64748b;font-size:14px;height:38px;overflow:hidden}'+
      '#ksOv .ksv{height:62px;border:2px solid #2f5d9e;border-radius:14px;display:flex;align-items:center;justify-content:center;font:800 38px/1 system-ui,Arial,sans-serif;font-variant-numeric:tabular-nums;color:#0f172a}#ksOv .ksv.e{color:#cbd5e1}'+
      '#ksOv .ksm{height:22px;margin:6px 0;text-align:center;font-size:14px;color:#b91c1c}#ksOv .ksm.ok{color:#15803d}'+
      '#ksOv .ksk{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;flex:1}#ksOv .ksk button{font:700 22px system-ui,Arial,sans-serif;border:1px solid #d6dee9;background:#f6f8fc;border-radius:12px;color:#0f172a;-webkit-tap-highlight-color:transparent;touch-action:manipulation}#ksOv .ksk button:active{background:#e3eaf5}'+
      '#ksOv .ksb{display:flex;gap:8px;margin-top:10px;height:48px}#ksOv .ksb button{flex:1;border-radius:12px;font:700 16px system-ui,Arial,sans-serif;border:1.5px solid #2f5d9e;background:#fff;color:#2f5d9e}#ksOv .ksb .go{background:#2f5d9e;color:#fff}#ksOv .ksb .go:disabled{opacity:.45}';
      document.head.appendChild(st)}
    function open(a){var t=C[a.dataset.c]||{},d=due(t);if(!d||a.classList.contains('soon'))return;css();var o=document.getElementById('ksOv');if(!o){o=document.createElement('div');o.id='ksOv';document.body.appendChild(o)}
      var w=a.dataset.t||'מבחן',nm=(a.querySelector('.tx b')||{}).textContent||'',v='',busy=0,dd=d.split('-');
      o.innerHTML='<div class="kb" role="dialog" aria-modal="true"><h3>✏️ כמה קיבלת ב'+w+'?</h3><div class="ksu">'+nm.replace(/[<>&]/g,'')+'<br>'+w+' מ-'+(+dd[2])+'.'+(+dd[1])+'</div><div class="ksv e">0</div><div class="ksm"></div><div class="ksk">'+
        [1,2,3,4,5,6,7,8,9,'⌫',0,'C'].map(function(x){return '<button type="button" data-k="'+x+'">'+x+'</button>'}).join('')+'</div><div class="ksb"><button type="button" class="no">ביטול</button><button type="button" class="go" disabled>לשלוח ✓</button></div></div>';
      o.hidden=false;var V=o.querySelector('.ksv'),M=o.querySelector('.ksm'),G=o.querySelector('.go');
      function show(){V.textContent=v||'0';V.classList.toggle('e',!v);G.disabled=!v||busy;M.className='ksm';M.textContent=v&&+v>100?'ציון עד 100':''}
      o.querySelectorAll('[data-k]').forEach(function(b){b.onclick=function(){if(busy)return;var k=b.dataset.k;if(k==='⌫')v=v.slice(0,-1);else if(k==='C')v='';else if(v.length<3)v=(v==='0'?'':v)+k;show()}});
      o.querySelector('.no').onclick=function(){if(!busy)o.hidden=true};o.onclick=function(e){if(e.target===o&&!busy)o.hidden=true};
      G.onclick=function(){var n=+v;if(!v||n>100)return;busy=1;show();M.textContent='שולח...';var p=a.dataset.c.split('/');
        fetch(SB+'study_kid_result',{method:'POST',headers:{'Content-Type':'application/json',apikey:SK,Authorization:'Bearer '+SK},body:JSON.stringify({p_kid:p[0],p_app:p[1],p_d:d,p_score:n})})
         .then(function(r){return r.ok?r.json():null}).then(function(j){busy=0;
           if(j&&j.ok){C[a.dataset.c]={s:n,k:1};try{localStorage.setItem(key,JSON.stringify(C))}catch(e){}M.className='ksm ok';M.textContent='✓ הציון נשלח לאבא ואמא!';G.disabled=true;setTimeout(function(){o.hidden=true;draw()},1300);return}
           var e=j&&j.err;M.textContent=e==='dup'?'כבר הוזן ציון למבחן הזה':e==='date'?'אפשר להזין ציון יומיים אחרי המבחן':e==='test'?'לא מצאתי את המבחן הזה. '+(BOY?'תבקש':'תבקשי')+' מאבא או אמא':'לא הצלחתי לשלוח. נסו שוב';show();M.className='ksm';if(!j||!e)M.textContent='לא הצלחתי לשלוח. נסו שוב';else M.textContent=M.textContent})
         .catch(function(){busy=0;show();M.textContent='אין חיבור. נסו שוב'})};
      show()}
    L.addEventListener('click',function(e){var ch=e.target.closest&&e.target.closest('.chip.sc');if(!ch)return;e.preventDefault();e.stopPropagation();open(ch.closest('.item'))},true);
    var Q=(location.search.match(/[?&]score=([a-z0-9_]+)/)||[])[1],asked=0;
    function ask(){if(asked||!Q)return;var a=I.filter(function(x){return x.dataset.c===kid+'/'+Q})[0];if(a&&!a.classList.contains('soon')&&due(C[a.dataset.c]||{})){asked=1;open(a)}}
    function sc(a){if(a.classList.contains('soon'))return 900;return (a.querySelector('.nwr')?0:50)+(a.dataset.n!==''?+a.dataset.n:30)} // בתוך כל אזור: חדש + מבחן קרוב = הכי למעלה
    draw();ask();
    // אורן 11.11.2026: "חדש!" רק עד הכניסה הראשונה. לחיצה על התוכן מסמנת אותו כנראה מיד, וחזרה לדף (גם מהמטמון של ספארי) מורידה את הסרט.
    function unNew(){I.forEach(function(a){var r=a.querySelector('.nwr');if(r&&window.StudyContent&&!StudyContent.isNew(a.dataset.c))r.remove()});draw()}
    I.forEach(function(a){a.addEventListener('click',function(){if(window.StudyContent&&!a.classList.contains('soon'))StudyContent.seen(a.dataset.c)})});
    addEventListener('pageshow',function(e){if(e.persisted)unNew()});
    I.forEach(function(a){var p=a.dataset.c.split('/');if(p[0]!==kid)return;
      fetch(SB+'study_test_get',{method:'POST',headers:{'Content-Type':'application/json',apikey:SK,Authorization:'Bearer '+SK},body:JSON.stringify({p_kid:p[0],p_app:p[1]})})
       .then(function(r){return r.ok?r.json():null}).then(function(j){if(!j)return;var v=j.d&&!(j.auto&&a.dataset.gen)?{d:j.d}:{};if(j.past&&!a.dataset.gen)v.p=j.past;if(j.score!=null)v.s=+j.score;if(j.by_kid)v.k=1;
         if(JSON.stringify(C[a.dataset.c]||{})===JSON.stringify(v))return;C[a.dataset.c]=v;try{localStorage.setItem(key,JSON.stringify(C))}catch(e){}draw();ask()}).catch(function(){ask()})})
  }};
})();
