// "מה לומדים מחר" + מערכת השעות המלאה, בדף הילד (אורן 20.11.2026).
// כרטיס "📚 מה לומדים מחר" (מעל המבחנים הקרובים): היום הבא שיש בו לימודים, כמה שיעורים, עד מתי ומה לומדים.
// לחיצה פותחת חלון בגובה קבוע עם שתי לשוניות: "מחר" (כל השיעורים עם שעות ומורה, הפסקות, דגשים מהמורים
// ומ-Side Quests, מבחן קרוב במקצוע, מה להכניס לתיק) ו"כל המערכת" (טבלה של כל השבוע, היום של מחר מודגש).
// הנתונים: study_kid_timetable(kid) (קריאה בלבד מדשבורד "משפחה ולימודים"): tt, notes (lesson_notes), ev, wk.
// נשמרים במכשיר ב-study_tt_<kid>. בלי מערכת שעות בשרת = הכרטיס לא מוצג.
// שימוש: <div id="ttm"></div> לפני <div id="exm">, ואז StudyTT.mount('dani', false) (true = בן).
(function(){
  var SB='https://emgtyfksnofzzlutngbf.supabase.co/rest/v1/rpc/',SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZ3R5Zmtzbm9menpsdXRuZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDI0MTMsImV4cCI6MjEwNjgxODQxM30.b7XE-gbCUlXMqpza1Bn9GvMKQsmu3jKP2eqZ0r4-k2k';
  var css=
    '.tts{position:relative;display:flex;align-items:center;gap:14px;width:100%;box-sizing:border-box;min-height:84px;margin-top:16px;font:inherit;text-align:right;color:inherit;background:linear-gradient(#f7fbff,#eef6ff) padding-box,linear-gradient(120deg,#0ea5e9,#2f5d9e 55%,#14b8a6) border-box;border:2.5px solid transparent;border-radius:18px;padding:12px 14px;cursor:pointer;box-shadow:0 6px 18px rgba(47,93,158,.16),0 2px 4px rgba(31,41,51,.06);-webkit-tap-highlight-color:transparent;animation:ttin .25s ease-out;overflow:hidden}'+
    '@keyframes ttin{from{opacity:0;transform:translateY(-4px)}}'+
    '@media (max-height:700px){.tts{min-height:72px;margin-top:12px;padding:9px 12px}.tts .ic{width:46px;height:46px;font-size:26px}}'+
    '.tts:active{filter:brightness(.97)}.tts *{pointer-events:none}'+
    '.tts .ic{flex:none;width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:30px;background:linear-gradient(135deg,#bae6fd,#99f6e4);box-shadow:inset 0 0 0 1px rgba(255,255,255,.7)}'+
    '.tts .tx{flex:1;min-width:0}'+
    '.tts b{display:block;font:800 17px/1.3 system-ui,Arial,sans-serif;color:#1e3a6e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tts small{display:block;font-size:14px;color:#5b6675;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '.tts .n{flex:none;font:800 13px system-ui,Arial,sans-serif;color:#fff;background:linear-gradient(135deg,#0ea5e9,#2f5d9e);border-radius:20px;padding:5px 11px;white-space:nowrap;box-shadow:0 2px 6px rgba(47,93,158,.3)}'+
    '.tts .n.hot{background:linear-gradient(135deg,#f59e0b,#ec4899)}'+
    '#tto{position:fixed;inset:0;background:rgba(15,23,42,.7);display:none;justify-content:center;align-items:flex-start;z-index:40;padding:calc(env(safe-area-inset-top,0px) + 56px) 12px 0;box-sizing:border-box}#tto.on{display:flex}'+
    '#tto .pn{background:#fff;border-radius:18px;width:100%;max-width:440px;height:min(620px,calc(100dvh - env(safe-area-inset-top,0px) - 76px));display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.3);overflow:hidden}'+
    '#tto .hd{flex:none;display:flex;align-items:center;gap:8px;padding:12px 14px 10px}#tto .hd h2{flex:1;margin:0;font-size:19px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '#tto .x{flex:none;width:40px;height:40px;border-radius:12px;border:1px solid #d3d9e2;background:#fff;font-size:20px;color:#1f2933;cursor:pointer}'+
    '#tto .tb{flex:none;display:grid;grid-template-columns:1fr 1fr;margin:0 14px 8px;border:1.5px solid #2f5d9e;border-radius:12px;overflow:hidden}'+
    '#tto .tb button{height:40px;border:0;background:#fff;color:#2f5d9e;font:700 15px system-ui,Arial,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}#tto .tb button+button{border-right:1.5px solid #2f5d9e}#tto .tb button.on{background:#2f5d9e;color:#fff}'+
    '#tto .bd{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:0 14px 14px;border-top:1px solid #e3e8ef}'+
    '#tto .dh{margin:12px 0 8px;font:700 15px/1.4 system-ui,Arial,sans-serif;color:#1f2933}#tto .dh small{display:block;font-weight:500;font-size:13.5px;color:#5b6675}'+
    '#tto .al{margin:0 0 10px;border:1.5px solid #f5c48a;background:#fff8ee;border-radius:12px;overflow:hidden}#tto .al div{padding:8px 11px;font-size:14.5px;line-height:1.4;border-top:1px solid #fbe3c4}#tto .al div:first-child{border-top:0}'+
    '#tto .ls{border:1px solid #e3e8ef;border-radius:12px;overflow:hidden}'+
    '#tto .ls .r{display:flex;align-items:center;gap:10px;padding:9px 11px;border-top:1px solid #eef1f5}#tto .ls .r:first-child{border-top:0}'+
    '#tto .ls .pn2{flex:none;width:52px;text-align:center;font:600 12px/1.25 system-ui,Arial,sans-serif;color:#5b6675}#tto .ls .pn2 b{display:block;font-size:16px;color:#2f5d9e}'+
    '#tto .ls .su{flex:1;min-width:0}#tto .ls .su b{display:block;font-size:16px;line-height:1.3}#tto .ls .su small{display:block;font-size:12.5px;color:#5b6675;margin-top:1px}'+
    '#tto .ls .su .nt{color:#9a3412;font-weight:600}#tto .ls .su .ex{color:#c2410c;font-weight:700}'+
    '#tto .ls .br{padding:6px 11px;font-size:12.5px;color:#5b6675;background:#f6f8fb;border-top:1px solid #eef1f5;text-align:center}'+
    '#tto .bag{margin:10px 0 0;border:1px solid #e3e8ef;border-radius:12px;padding:8px 11px}#tto .bag b{display:block;font-size:14.5px;margin-bottom:3px}#tto .bag ul{margin:0;padding:0 18px 0 0;font-size:14px;line-height:1.5}'+
    '#tto .gr{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:12px;font:11px/1.2 system-ui,Arial,sans-serif;letter-spacing:-.2px}'+
    '#tto .gr th,#tto .gr td{border:1px solid #e3e8ef;padding:5px 1px;text-align:center;vertical-align:middle;word-break:keep-all;overflow-wrap:normal}'+
    '#tto .gr th{background:#f2f6fb;color:#1e3a6e;font-size:13px}#tto .gr th:first-child,#tto .gr td:first-child{width:30px;color:#5b6675;font-size:10.5px;background:#f8fafc}'+
    '#tto .gr td.on,#tto .gr th.on{background:#e3effd}#tto .gr td.e{background:#fafafa}#tto .gr tr.bk td{padding:2px;background:#f6f8fb;font-size:10px;color:#8a94a3}'+
    '#tto .gr td i{display:block;font-style:normal;color:#8a94a3;font-size:10px;margin-top:1px}'+
    '#tto .ft2{margin:10px 0 0;font-size:12.5px;color:#5b6675;line-height:1.45}'+
    '#tto .em{padding:30px 10px;text-align:center;color:#5b6675;font-size:15px}';
  var DOW=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'],DOWN=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  function lj(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
  function ls(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function today(){return new Date(new Date().toDateString())}
  function iso(x){return x.getFullYear()+'-'+('0'+(x.getMonth()+1)).slice(-2)+'-'+('0'+x.getDate()).slice(-2)}
  function dd(d){return new Date(d+'T00:00:00')}
  function days(d){return Math.round((dd(d)-today())/864e5)}
  function dm(x){return x.getDate()+'.'+(x.getMonth()+1)}
  function hm(t){return String(t||'').replace(/^0/,'')}
  function tm(t){return esc(t).replace(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/g,'<bdi dir="ltr">$1-$2</bdi>')}
  var SHORT={'גיאוגרפיה':'גיאוגר׳','חינוך גופני':'ספורט','היסטוריה':'היסטוריה'};
  function norm(s){return String(s||'').replace(/[״"׳']/g,'').replace(/\s+/g,' ').trim()}
  window.StudyTT={mount:function(kid,boy){
    var host=document.getElementById('ttm');if(!host)return;
    var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    var key='study_tt_'+kid,C=lj(key,{}),tab='t';
    var b=document.createElement('button');b.type='button';b.className='tts';b.style.display='none';
    b.innerHTML='<span class="ic">📚</span><span class="tx"><b>מה לומדים מחר</b><small></small></span><span class="n">›</span>';host.appendChild(b);
    var o=document.createElement('div');o.id='tto';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');
    o.innerHTML='<div class="pn"><div class="hd"><h2>📚 מה לומדים</h2><button type="button" class="x" aria-label="סגירה">✕</button></div>'+
      '<div class="tb"><button type="button" data-t="t" class="on">מחר</button><button type="button" data-t="w">כל המערכת</button></div><div class="bd"></div></div>';
    document.body.appendChild(o);
    var B=o.querySelector('.bd'),TB=o.querySelectorAll('.tb button');
    function tt(){return C.tt&&C.tt.days?C.tt:null}
    function lessons(dw){var T=tt();return T?(T.days[String(dw)]||[]):[]}
    function hasDay(dw){return lessons(dw).some(function(x){return x})}
    // היום הבא שיש בו לימודים (מחר; בשישי ובשבת = יום ראשון)
    function next(){var x=today();for(var i=1;i<=8;i++){var y=new Date(x);y.setDate(x.getDate()+i);if(hasDay(y.getDay()))return y}return null}
    function lastIdx(L){for(var i=L.length-1;i>=0;i--)if(L[i])return i;return -1}
    function per(i){var T=tt();return (T.per||[])[i]||[String(i+1),'','']}
    function whenW(y){var n=Math.round((y-today())/864e5);return n===1?'מחר':'ביום '+DOWN[y.getDay()]}
    function uniqSubj(L){var s=[];L.forEach(function(x){if(x&&s.indexOf(x.s)<0)s.push(x.s)});return s}
    function examFor(s){var k=norm(s);return (C.ev||[]).filter(function(e){return (e.ty==='exam'||e.ty==='quiz')&&days(e.d)>=1&&norm(e.t).indexOf(k)>=0})[0]}
    function alerts(y){var d=iso(y),dw=y.getDay(),out=[];
      (C.ev||[]).forEach(function(e){if(e.d===d){var ic=e.ty==='exam'?'🎯':e.ty==='quiz'?'📝':e.ty==='submit'?'📤':e.ty==='trip'?'🚌':'📌';
        out.push(ic+' <b>'+esc(e.t)+'</b>'+(e.sub?' · '+esc(e.sub):''))}});
      (C.notes||[]).forEach(function(n){if(n.d===d)out.push('✏️ <b>'+(n.s?esc(n.s)+': ':'')+'</b>'+esc(n.t))});
      (C.wk||[]).forEach(function(w){if(String(w.day||'').replace(/[׳']/g,'')===DOW[dw].replace('׳',''))out.push('📌 '+esc(w.t))});
      return out}
    function strip(){var T=tt(),y=T&&next();if(!y){b.style.display='none';return}
      var L=lessons(y.getDay()),li=lastIdx(L),cnt=L.filter(function(x){return x}).length,end=per(li)[2],al=alerts(y),sb=uniqSubj(L);
      b.style.display='';b.querySelector('b').textContent='מה לומדים '+whenW(y);
      b.querySelector('small').textContent=cnt+' שיעורים, עד '+hm(end)+' · '+sb.join(', ');
      var n=b.querySelector('.n');n.textContent=al.length?'⭐ '+al.length+' דגשים':'›';n.classList.toggle('hot',!!al.length)}
    function dayView(){var y=next();if(!y){B.innerHTML='<div class="em">אין עדיין מערכת שעות</div>';return}
      var T=tt(),dw=y.getDay(),L=lessons(dw),li=lastIdx(L),cnt=L.filter(function(x){return x}).length,al=alerts(y),h='';
      h+='<div class="dh">'+(whenW(y)==='מחר'?'מחר, ':'')+'יום '+DOWN[dw]+' '+dm(y)+'<small>'+cnt+' שיעורים · '+hm(per(0)[1])+' עד '+hm(per(li)[2])+'</small></div>';
      if(al.length)h+='<div class="al">'+al.map(function(a){return '<div>'+a+'</div>'}).join('')+'</div>';
      h+='<div class="ls">';
      for(var i=0;i<=li;i++){var x=L[i],p=per(i);
        h+='<div class="r"><div class="pn2"><b>'+esc(p[0])+'</b>'+hm(p[1])+'</div><div class="su">';
        if(!x)h+='<b style="color:#8a94a3">שעה חופשית</b>';
        else{var ex=examFor(x.s),dn=ex?days(ex.d):0;
          h+='<b>'+esc(x.s)+'</b>'+(x.w?'<small>עם '+esc(x.w)+'</small>':'');
          if(x.n)h+='<small class="nt">💡 '+esc(x.n)+'</small>';
          if(ex&&dn<=14)h+='<small class="ex">🎯 '+esc(ex.t)+' בעוד '+dn+' ימים</small>'}
        h+='</div></div>';
        (T.brk||[]).forEach(function(k){if(k.after===i+1&&i<li)h+='<div class="br">☕ '+tm(k.t)+'</div>'})}
      h+='</div>';
      var bag=[];uniqSubj(L).forEach(function(s){var v=(T.bring||{})[s];if(v)bag.push('<li><b style="display:inline;font-size:inherit">'+esc(s)+':</b> '+esc(v)+'</li>')});
      if(bag.length)h+='<div class="bag"><b>🎒 מה להכניס לתיק</b><ul>'+bag.join('')+'</ul></div>';
      h+='<div class="ft2">דגשים מהמורים מגיעים לכאן מהמיילים של בית הספר. משהו לא נכון? '+(boy?'ספר':'ספרי')+' לאבא ואמא.</div>';
      B.innerHTML=h;B.scrollTop=0}
    function weekView(){var T=tt(),y=next(),on=y?y.getDay():-1,mx=0,h='';
      for(var d=0;d<6;d++)mx=Math.max(mx,lastIdx(lessons(d))+1);
      h+='<table class="gr"><tr><th></th>';for(d=0;d<6;d++)h+='<th'+(d===on?' class="on"':'')+'>'+DOW[d]+'</th>';h+='</tr>';
      for(var i=0;i<mx;i++){var p=per(i);
        h+='<tr><td>'+esc(p[0])+'<i>'+hm(p[1])+'</i></td>';
        for(d=0;d<6;d++){var x=lessons(d)[i];h+='<td class="'+(d===on?'on':'')+(x?'':' e')+'">'+(x?esc(SHORT[x.s]||x.s)+(x.n?'<i>💡</i>':''):'')+'</td>'}
        h+='</tr>';
        (T.brk||[]).forEach(function(k){if(k.after===i+1&&i<mx-1)h+='<tr class="bk"><td colspan="7">'+tm(k.t)+'</td></tr>'})}
      h+='</table>';
      var ends=[];for(d=0;d<6;d++){var li=lastIdx(lessons(d));if(li>=0)ends.push(DOW[d]+' עד '+hm(per(li)[2]))}
      h+='<div class="ft2">🏁 '+ends.join(' · ')+(on>=0?'<br>המודגש = '+whenW(y):'')+'</div>';
      B.innerHTML=h;B.scrollTop=0}
    function draw(){[].forEach.call(TB,function(x){x.classList.toggle('on',x.dataset.t===tab)});if(tab==='w')weekView();else dayView()}
    [].forEach.call(TB,function(x){x.onclick=function(){tab=x.dataset.t;draw()}});
    function close(){o.classList.remove('on')}
    o.querySelector('.x').onclick=close;o.onclick=function(ev){if(ev.target===o)close()};
    b.onclick=function(){tab='t';draw();o.classList.add('on')};
    strip();
    fetch(SB+'study_kid_timetable',{method:'POST',headers:{'Content-Type':'application/json',apikey:SK,Authorization:'Bearer '+SK},body:JSON.stringify({p_kid:kid})})
      .then(function(r){return r.ok?r.json():null}).then(function(j){if(!j||typeof j!=='object')return;
        var n={tt:j.tt||null,notes:j.notes||[],ev:j.ev||[],wk:j.wk||[]};
        if(JSON.stringify(n)===JSON.stringify({tt:C.tt||null,notes:C.notes||[],ev:C.ev||[],wk:C.wk||[]}))return;
        C=n;C.at=Date.now();ls(key,C);strip();if(o.classList.contains('on'))draw()}).catch(function(){});
    // חצות או חזרה לדף אחרי זמן: "מחר" מתעדכן
    document.addEventListener('visibilitychange',function(){if(!document.hidden)strip()});
  }};
})();
