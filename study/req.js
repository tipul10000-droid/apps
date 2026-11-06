// בקשות והצעות מהילד להורים (אורן 6.11.2026): כפתור בדף הילד ← חלון עם 6 סוגים (כולל 🐞 באג) + טקסט ← study_request_add ← אזור ההורים.
// החלון קבוע למעלה (לא ממורכז), כדי שהמקלדת של הטלפון לא תכסה אותו ושום כפתור לא יזוז כשמקלידים.
// שימוש: <div id="rqm"></div><script src="../req.js"></script><script>StudyReq.mount('lia',false)</script> (false = בת, true = בן)
(function(){
  var SB_URL='https://emgtyfksnofzzlutngbf.supabase.co',SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZ3R5Zmtzbm9menpsdXRuZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDI0MTMsImV4cCI6MjEwNjgxODQxM30.b7XE-gbCUlXMqpza1Bn9GvMKQsmu3jKP2eqZ0r4-k2k';
  var css='.rqb{display:flex;align-items:center;gap:14px;width:100%;box-sizing:border-box;font:inherit;text-align:right;color:inherit;background:#f6f8fc;border:1.5px dashed #9fb4d3;border-radius:16px;padding:12px 16px;cursor:pointer;-webkit-tap-highlight-color:transparent}'+
    '.rqb:active{background:#e8eef7}.rqb *{pointer-events:none}.rqb .ic{width:44px;height:44px;flex:none;border-radius:12px;display:grid;place-items:center;font-size:24px;background:#e8eef7}.rqb b{display:block;font-size:18px}.rqb small{display:block;font-size:13px;color:var(--mut,#5b6675);margin-top:2px}'+
    '#rq{position:fixed;inset:0;background:rgba(15,23,42,.62);display:none;align-items:center;justify-content:center;z-index:40;padding:calc(env(safe-area-inset-top,0px) + 14px) 14px calc(env(safe-area-inset-bottom,0px) + 14px);box-sizing:border-box}'+
    '#rq.on{display:flex}#rq{align-items:flex-start;padding-top:calc(env(safe-area-inset-top,0px) + 56px)}#rq .pn{background:#fff;border-radius:18px;padding:16px;width:100%;max-width:440px;box-sizing:border-box;box-shadow:0 10px 40px rgba(0,0,0,.3)}'+
    '#rq h2{margin:0 0 4px;font-size:20px}#rq p{margin:0 0 10px;font-size:14px;color:#5b6675}#rq .ks{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px}'+
    '#rq .k{height:42px;box-sizing:border-box;font:600 14px system-ui,Arial,sans-serif;border:1.5px solid #d3d9e2;background:#fff;color:#1f2933;border-radius:12px;padding:0 6px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-tap-highlight-color:transparent}'+
    '#rqd{position:fixed;inset:0;background:rgba(15,23,42,.62);display:none;align-items:center;justify-content:center;z-index:41;padding:14px;box-sizing:border-box}#rqd.on{display:flex}#rqd .pn{background:#fff;border-radius:18px;padding:18px;width:100%;max-width:400px;box-sizing:border-box;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.3)}#rqd h2{margin:0 0 6px;font-size:21px;color:#15803d}#rqd p{margin:0 0 10px;color:#5b6675;font-size:15px}#rqd .ls div{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:8px 10px;margin-bottom:6px;text-align:right}#rqd .ls b{display:block;font-size:15px}#rqd .ls span{display:block;font-size:14px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#rqd .ok{width:100%;height:46px;margin-top:6px;font:700 16px system-ui,Arial,sans-serif;border:0;border-radius:12px;background:#2f5d9e;color:#fff;cursor:pointer}'+
    '#rq .k.on{border-color:#2f5d9e;background:#e8eef7;color:#2f5d9e}'+
    '#rq textarea{display:block;width:100%;height:96px;box-sizing:border-box;resize:none;font:16px system-ui,Arial,sans-serif;border:1.5px solid #d3d9e2;border-radius:12px;padding:10px;color:#1f2933}#rq textarea:focus{outline:none;border-color:#2f5d9e}'+
    '#rq .m{height:20px;font-size:14px;margin:6px 0;color:#2f5d9e;text-align:center}#rq .bs{display:grid;grid-template-columns:2fr 1fr;gap:8px}'+
    '#rq .bs button{height:46px;font:600 16px system-ui,Arial,sans-serif;border-radius:12px;border:1px solid #d3d9e2;background:#fff;color:#1f2933;cursor:pointer}#rq .bs .go{background:#2f5d9e;border-color:#2f5d9e;color:#fff}#rq .bs .go:disabled{opacity:.5}';
  function el(h){var d=document.createElement('div');d.innerHTML=h;return d.firstChild}
  window.StudyReq={mount:function(kid,boy,where){
    var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    var Y=boy?'':'י';
    var K=[['test','📅 יש מבחן קרוב','באיזה מקצוע, ומתי? מה צריך לדעת למבחן?'],['quiz','⏰ יש בוחן עוד מעט','באיזה מקצוע, ומתי?'],
      ['hard','🤔 לא הבנתי נושא','מה לא ברור? אבא יעזור לך להבין'],['topic','📚 נושא חדש ללימוד','מה תרצ'+(boy?'ה':'י')+' שאבא יכין לך ללמוד?'],
      ['idea','💡 רעיון לאפליקציה','מה היה כיף להוסיף או לשנות באפליקציה?'],['bug','🐞 מצאתי באג','מה קרה? באיזה מסך? מה לחצת רגע לפני?']];
    var host=where||document.getElementById('rqm');
    var b=el('<button type="button" class="rqb"><span class="ic">💬</span><span><b>הצעות ובקשות לאבא ואמא!</b><small>מבחן קרוב, נושא קשה, רעיון או באג</small></span></button>');host.appendChild(b);
    var o=el('<div id="rq" role="dialog" aria-modal="true"><div class="pn"><h2>💬 מה תרצ'+(boy?'ה':'י')+' לבקש?</h2><p>הצעות ובקשות לאבא ואמא! הם יראו את זה באזור ההורים</p><div class="ks">'+
      K.map(function(k){return '<button type="button" class="k" data-k="'+k[0]+'">'+k[1]+'</button>'}).join('')+
      '</div><textarea maxlength="500" placeholder="קוד'+'ם בחר'+Y+' למעלה מה תרצ'+(boy?'ה':'י')+' לבקש"></textarea><div class="m"></div><div class="bs"><button type="button" class="go">שליחה לאבא ולאמא 💌</button><button type="button" class="no">סגירה</button></div></div></div>');
    document.body.appendChild(o);
    var ta=o.querySelector('textarea'),m=o.querySelector('.m'),go=o.querySelector('.go'),kind=null,busy=false;
    function close(){o.classList.remove('on');ta.blur()}
    b.onclick=function(){kind=null;ta.value='';m.textContent='';busy=false;go.disabled=false;[].forEach.call(o.querySelectorAll('.k'),function(x){x.classList.remove('on')});
      ta.placeholder='קודם בחר'+Y+' למעלה מה תרצ'+(boy?'ה':'י')+' לבקש';o.classList.add('on')};
    o.querySelector('.no').onclick=close;o.onclick=function(e){if(e.target===o)close()};
    [].forEach.call(o.querySelectorAll('.k'),function(x){x.onclick=function(){kind=x.dataset.k;[].forEach.call(o.querySelectorAll('.k'),function(y){y.classList.toggle('on',y===x)});
      K.forEach(function(k){if(k[0]===kind)ta.placeholder=k[2]});m.textContent=''}});
    go.onclick=function(){if(busy)return;if(!kind){m.textContent='קודם בחר'+Y+' למעלה מה תרצ'+(boy?'ה':'י')+' לבקש 👆';return}
      if(!ta.value.trim()){m.textContent='כתב'+Y+' כמה מילים ✍️';ta.focus();return}
      busy=true;go.disabled=true;m.textContent='שולח...';
      fetch(SB_URL+'/rest/v1/rpc/study_request_add',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify({p_kid:kid,p_kind:kind,p_txt:ta.value})})
        .then(function(r){return r.json()}).then(function(j){if(j===true||(j&&j.ok)){if(j&&j.id){var mine=lsj('study_rq_mine_'+kid,{});mine[j.id]=ta.value.trim().slice(0,140);var ks=Object.keys(mine);if(ks.length>30)delete mine[ks[0]];lss('study_rq_mine_'+kid,mine)}m.textContent=window.STUDY_GUEST?'במצב אורח זה לא נשלח באמת 👀':'נשלח! אבא ואמא יראו את זה 💌';ta.blur();setTimeout(close,1600)}
          else{busy=false;go.disabled=false;m.textContent=j&&j.err==='limit'?'שלחת הרבה בקשות. נסה'+Y+' שוב עוד קצת':'משהו לא הצליח. נסה'+Y+' שוב'}})
        .catch(function(){busy=false;go.disabled=false;m.textContent='אין חיבור כרגע. נסה'+Y+' שוב עוד מעט'})}
    // בקשה שאבא ואמא סימנו "טופל" (אורן 6.11.2026): חלון קטן פעם אחת לכל בקשה. השרת מחזיר רק id, סוג ומועד, בלי הטקסט; הטקסט נשמר רק במכשיר ששלח.
    if(!window.STUDY_GUEST)fetch(SB_URL+'/rest/v1/rpc/study_request_status',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify({p_kid:kid})})
      .then(function(r){return r.ok?r.json():[]}).then(function(L){if(!L||!L.length)return;var seen=lsj('study_rq_seen_'+kid,[]),mine=lsj('study_rq_mine_'+kid,{}),N=L.filter(function(x){return seen.indexOf(x.id)<0});if(!N.length)return;
        var lbl={};K.forEach(function(k){lbl[k[0]]=k[1]});
        var d=el('<div id="rqd" role="dialog" aria-modal="true"><div class="pn"><h2>✅ אבא ואמא טיפלו בזה!</h2><p>'+(N.length===1?'הבקשה ששלחת טופלה':'הבקשות ששלחת טופלו')+'. תודה ששיתפת 💜</p><div class="ls">'+N.slice(0,4).map(function(x){return '<div><b>'+lbl[x.kind]+'</b>'+(mine[x.id]?'<span>'+esc(mine[x.id])+'</span>':'')+'</div>'}).join('')+'</div><button type="button" class="ok">יופי! 👍</button></div></div>');
        document.body.appendChild(d);requestAnimationFrame(function(){d.classList.add('on')});
        d.querySelector('.ok').onclick=function(){d.classList.remove('on');lss('study_rq_seen_'+kid,seen.concat(N.map(function(x){return x.id})).slice(-60))}}).catch(function(){});
  }};
  function lsj(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
  function lss(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function esc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
})();
