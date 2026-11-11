// המבחנים הקרובים של הילד, מדשבורד הלימודים של המשפחה (אורן 11.11.2026).
// בדף הילד, בין תוכני הלימוד לכפתורי העזר: כרטיס קטן "📅 המבחנים הקרובים שלי" עם המבחן הבא.
// לחיצה פותחת חלון בגובה קבוע עם כל המבחנים ל-8 שבועות, לפי שבועות. לכל מבחן "📤 לבקש חומר":
// תזכורת מה לשלוח לאבא ואמא בוואטסאפ (תמונות מהמחברת, דפי עבודה, ההודעה של המורה, רשימת נושאים)
// + בקשה לאזור ההורים (study_request_add, סוג test/quiz) + פתיחת וואטסאפ עם הודעה מוכנה (הילד בוחר למי).
// הנתונים: study_kid_events(kid) (קריאה בלבד: תאריך, סוג, שם). נשמרים במכשיר ב-study_ex_<kid> כדי שהדף לא יקפוץ.
// שימוש: <div id="exm"></div> לפני .tools, ואז StudyTests.mount('evyatar', true) (true = בן).
(function(){
  var SB='https://emgtyfksnofzzlutngbf.supabase.co/rest/v1/rpc/',SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZ3R5Zmtzbm9menpsdXRuZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDI0MTMsImV4cCI6MjEwNjgxODQxM30.b7XE-gbCUlXMqpza1Bn9GvMKQsmu3jKP2eqZ0r4-k2k';
  var css=
    '.exs{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;margin-top:14px;font:inherit;text-align:right;color:inherit;background:#fffaf3;border:1.5px solid #f3d3a8;border-radius:14px;padding:10px 12px;cursor:pointer;-webkit-tap-highlight-color:transparent;animation:exin .25s ease-out}'+
    '@keyframes exin{from{opacity:0;transform:translateY(-4px)}}'+
    '.exs:active{background:#fdf0dd}.exs *{pointer-events:none}.exs .ic{font-size:24px;flex:none}.exs .tx{flex:1;min-width:0}'+
    '.exs b{display:block;font:700 15px/1.3 system-ui,Arial,sans-serif;color:#7c2d12}.exs small{display:block;font-size:13px;color:#5b6675;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '.exs .n{flex:none;font:700 13px system-ui,Arial,sans-serif;color:#9a3412;background:#fde8cc;border-radius:20px;padding:3px 10px;white-space:nowrap}'+
    '#exo{position:fixed;inset:0;background:rgba(15,23,42,.62);display:none;justify-content:center;align-items:flex-start;z-index:40;padding:calc(env(safe-area-inset-top,0px) + 56px) 12px 0;box-sizing:border-box}#exo.on{display:flex}'+
    '#exo .pn{background:#fff;border-radius:18px;width:100%;max-width:440px;height:min(600px,calc(100dvh - env(safe-area-inset-top,0px) - 76px));display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.3);overflow:hidden}'+
    '#exo .hd{flex:none;display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #e3e8ef}#exo .hd h2{flex:1;margin:0;font-size:19px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '#exo .x{flex:none;width:40px;height:40px;border-radius:12px;border:1px solid #d3d9e2;background:#fff;font-size:20px;color:#1f2933;cursor:pointer}'+
    '#exo .bd{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:4px 14px 14px}'+
    '#exo .wk{margin:12px 0 4px;font:700 13px system-ui,Arial,sans-serif;color:#5b6675}'+
    '#exo .rw{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #eef1f5}'+
    '#exo .dt{flex:none;width:52px;text-align:center;font:600 12px/1.25 system-ui,Arial,sans-serif;color:#5b6675}#exo .dt b{display:block;font-size:17px;color:#1f2933}'+
    '#exo .rt{flex:1;min-width:0}#exo .rt b{display:block;font-size:15px;line-height:1.3}#exo .rt small{display:block;font-size:12.5px;color:#5b6675;margin-top:1px}#exo .rt small.hot{color:#c2410c;font-weight:700}'+
    '#exo .ask{flex:none;width:96px;height:38px;border-radius:11px;border:1.5px solid #2f5d9e;background:#fff;color:#2f5d9e;font:700 13px system-ui,Arial,sans-serif;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent}'+
    '#exo .ask.done{border-color:#86c79b;color:#15803d;background:#f0faf3}'+
    '#exo .rq p{margin:10px 0 6px;font-size:15px;line-height:1.45}#exo .rq ul{margin:0 0 10px;padding:0;list-style:none;border:1px solid #e3e8ef;border-radius:12px;overflow:hidden}'+
    '#exo .rq li{padding:9px 12px;font-size:14.5px;line-height:1.35;border-bottom:1px solid #eef1f5}#exo .rq li:last-child{border-bottom:0}'+
    '#exo .rq textarea{display:block;width:100%;height:62px;box-sizing:border-box;resize:none;font:16px system-ui,Arial,sans-serif;border:1.5px solid #d3d9e2;border-radius:12px;padding:8px 10px;color:#1f2933}#exo .rq textarea:focus{outline:none;border-color:#2f5d9e}'+
    '#exo .ft{flex:none;padding:10px 14px 12px;border-top:1px solid #e3e8ef;display:none}#exo .ft.on{display:block}'+
    '#exo .m{height:20px;font-size:13.5px;margin:0 0 6px;color:#2f5d9e;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '#exo .bs{display:grid;grid-template-columns:1fr 1fr;gap:8px}#exo .bs button{height:46px;font:700 15px system-ui,Arial,sans-serif;border-radius:12px;border:1px solid #d3d9e2;background:#fff;color:#1f2933;cursor:pointer;white-space:nowrap;padding:0 4px}'+
    '#exo .bs .go{background:#2f5d9e;border-color:#2f5d9e;color:#fff}#exo .bs .wa{border-color:#25a366;color:#15803d}#exo .bs .go:disabled{opacity:.55}'+
    '#exo .bk{display:block;margin:2px 0 0;padding:4px 0;border:0;background:none;color:#2f5d9e;font:600 14px system-ui,Arial,sans-serif;cursor:pointer}'+
    '#exo .em{padding:30px 10px;text-align:center;color:#5b6675;font-size:15px}';
  var DOW=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
  function lj(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
  function ls(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function today(){return new Date(new Date().toDateString())}
  function dd(d){return new Date(d+'T00:00:00')}
  function days(d){return Math.round((dd(d)-today())/864e5)}
  function dm(d){var x=dd(d);return x.getDate()+'.'+(x.getMonth()+1)}
  function when(n){return n===0?'היום!':n===1?'מחר':'בעוד '+n+' ימים'}
  function kindW(e){return e.ty==='quiz'?'בוחן':'מבחן'}
  function name(e){var t=String(e.t||'').replace(/\s*[-–]\s*בוחן\s*$/,'').trim();return t||kindW(e)}
  function full(e){var t=name(e);return /מבחן|בוחן|בגרות|מועד/.test(t)?t:kindW(e)+' '+t}
  function wk(d){var t=today(),s=new Date(t);s.setDate(t.getDate()-t.getDay());var w=Math.floor((dd(d)-s)/864e5/7);
    return w<=0?'השבוע':w===1?'שבוע הבא':'בעוד '+w+' שבועות'}
  function idOf(e){return e.d+'|'+e.t}
  window.StudyTests={mount:function(kid,boy){
    var host=document.getElementById('exm');if(!host)return;
    var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    var Y=boy?'':'י',key='study_ex_'+kid,rk='study_ex_rq_'+kid,C=lj(key,{}),R=lj(rk,{}),L=[],cur=null,busy=false;
    var b=document.createElement('button');b.type='button';b.className='exs';b.style.display='none';
    b.innerHTML='<span class="ic">📅</span><span class="tx"><b>המבחנים הקרובים שלי</b><small></small></span><span class="n"></span>';host.appendChild(b);
    var o=document.createElement('div');o.id='exo';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');
    o.innerHTML='<div class="pn"><div class="hd"><h2></h2><button type="button" class="x" aria-label="סגירה">✕</button></div><div class="bd"></div>'+
      '<div class="ft"><div class="m"></div><div class="bs"><button type="button" class="go">📨 לבקש מאבא ואמא</button><button type="button" class="wa">💬 לשלוח בוואטסאפ</button></div></div></div>';
    document.body.appendChild(o);
    var H=o.querySelector('h2'),B=o.querySelector('.bd'),F=o.querySelector('.ft'),M=o.querySelector('.m'),go=o.querySelector('.go'),wa=o.querySelector('.wa');
    function live(){return (C.L||[]).filter(function(e){var n=days(e.d);return n>=0&&n<=56})}
    function strip(){L=live();if(!L.length){b.style.display='none';return}
      var e=L[0],n=days(e.d);b.style.display='';
      b.querySelector('small').textContent=full(e)+' · '+when(n);b.querySelector('small').style.color=n<=3?'#c2410c':'';
      b.querySelector('.n').textContent=L.length>1?'עוד '+(L.length-1)+' ›':'›'}
    function list(){cur=null;H.textContent='📅 המבחנים הקרובים שלי';F.classList.remove('on');L=live();
      if(!L.length){B.innerHTML='<div class="em">אין מבחנים ב-8 השבועות הקרובים 🎉</div>';return}
      var h='',g=null;L.forEach(function(e,i){var w=wk(e.d),n=days(e.d),x=dd(e.d);if(w!==g){g=w;h+='<div class="wk">'+w+'</div>'}
        h+='<div class="rw"><div class="dt">יום '+DOW[x.getDay()]+'<b>'+dm(e.d)+'</b></div><div class="rt"><b>'+esc(full(e))+'</b><small'+(n<=3?' class="hot"':'')+'>'+when(n)+(e.sub?' · '+esc(e.sub):'')+'</small></div>'+
          '<button type="button" class="ask'+(R[idOf(e)]?' done':'')+'" data-i="'+i+'">'+(R[idOf(e)]?'✓ ביקשת':'📤 לבקש חומר')+'</button></div>'});
      B.innerHTML=h;B.scrollTop=0;
      [].forEach.call(B.querySelectorAll('.ask'),function(a){a.onclick=function(){ask(L[+a.dataset.i])}})}
    function ask(e){cur=e;busy=false;go.disabled=false;var n=days(e.d);H.textContent='📤 חומר ל'+full(e);
      B.innerHTML='<button type="button" class="bk">→ כל המבחנים</button><div class="rq">'+
        '<p><b>'+esc(full(e))+'</b>, יום '+DOW[dd(e.d).getDay()]+' '+dm(e.d)+' ('+when(n)+').<br>כדי שאבא ואמא יכינו לך תרגול באפליקציה, של'+(boy?'ח':'חי')+' להם בוואטסאפ:</p>'+
        '<ul><li>📸 תמונות של המחברת או הסיכום</li><li>📄 דפי עבודה או מצגת מהמורה</li><li>💬 ההודעה של המורה על החומר למבחן</li><li>📝 רשימת הנושאים או העמודים בספר</li></ul>'+
        '<textarea maxlength="300" placeholder="מה נכנס למבחן? (לא חובה)"></textarea></div>';
      B.scrollTop=0;B.querySelector('.bk').onclick=list;F.classList.add('on');
      M.textContent=R[idOf(e)]?'✓ כבר ביקשת. אפשר לשלוח שוב אם יש עוד חומר':'';}
    function txt(){var t=B.querySelector('textarea');return t?t.value.trim():''}
    go.onclick=function(){if(busy||!cur)return;busy=true;go.disabled=true;M.textContent='שולח...';var e=cur,nt=txt();
      fetch(SB+'study_request_add',{method:'POST',headers:{'Content-Type':'application/json',apikey:SK,Authorization:'Bearer '+SK},
        body:JSON.stringify({p_kid:kid,p_kind:e.ty==='quiz'?'quiz':'test',p_txt:'חומר ל'+full(e)+' ('+dm(e.d)+')'+(nt?': '+nt:'')})})
        .then(function(r){return r.json()}).then(function(j){if(!(j===true||(j&&j.ok)))throw 0;
          R[idOf(e)]=Date.now();ls(rk,R);
          if(j&&j.id){var mine=lj('study_rq_mine_'+kid,{});mine[j.id]=('חומר ל'+full(e)).slice(0,140);ls('study_rq_mine_'+kid,mine)}
          M.textContent=window.STUDY_GUEST?'במצב אורח זה לא נשלח באמת 👀':'נשלח! עכשיו של'+(boy?'ח':'חי')+' להם את החומר בוואטסאפ 📸';busy=false;go.disabled=false})
        .catch(function(){busy=false;go.disabled=false;M.textContent='אין חיבור כרגע. נס'+(boy?'ה':'י')+' שוב עוד מעט'})};
    wa.onclick=function(){if(!cur)return;var e=cur,nt=txt();
      var m='היי, '+'יש לי '+full(e)+' ביום '+DOW[dd(e.d).getDay()]+' '+dm(e.d)+'. הנה החומר, אפשר להכין לי תרגול באפליקציה?'+(nt?'\n'+nt:'');
      window.open('https://wa.me/?text='+encodeURIComponent(m),'_blank')};
    function close(){o.classList.remove('on');var t=B.querySelector('textarea');if(t)t.blur()}
    o.querySelector('.x').onclick=close;o.onclick=function(ev){if(ev.target===o)close()};
    b.onclick=function(){list();o.classList.add('on')};
    strip();
    fetch(SB+'study_kid_events',{method:'POST',headers:{'Content-Type':'application/json',apikey:SK,Authorization:'Bearer '+SK},body:JSON.stringify({p_kid:kid})})
      .then(function(r){return r.ok?r.json():null}).then(function(j){if(!Array.isArray(j))return;
        if(JSON.stringify(j)===JSON.stringify(C.L||[]))return;C={L:j,at:Date.now()};ls(key,C);strip();if(o.classList.contains('on')&&!cur)list()}).catch(function(){});
  }};
})();
