// 🎤 תמלול קולי לכל תשובה בטקסט (אורן 14.11.2026, כלל קבוע לכל study ולכל תוכן עתידי).
// בכל textarea (חוץ מ-data-novoice) יש כפתור "🎤 לדבר" בפינה. לחיצה = מקליטים: גל קול חי שזז לפי המיקרופון,
// טיימר ו"⏹ סיום". בסיום הטקסט נכנס לתיבה (נוסף אחרי מה שכבר כתוב) ואפשר לתקן לפני ששולחים.
// דיבור בעברית (he-IL) דרך Web Speech API (באייפון: הדיקטציה של אפל). באייפון ההקלטה נעצרת לבד אחרי שתיקה,
// לכן מתחילים מחדש עד שלוחצים סיום (כמו ב-Side Quests). אם אי אפשר להפעיל מיקרופון במקביל, הגל מונפש לפי הדיבור.
// לא נוגעים ב-input: אפליקציות האיות נשארות עם המקלדת הפנימית (kb.js). guest.js טוען את הקובץ בכל דף.
(function(){
  if(window.StudyVoice)return;
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  var css=
    '.svw{position:relative;display:block;width:100%}'+
    '.svw>textarea{padding-bottom:46px!important}'+
    '.svb{position:absolute;left:8px;bottom:8px;z-index:2;display:flex;align-items:center;gap:5px;height:34px;padding:0 12px;border-radius:17px;border:1.5px solid #93b4e0;background:#eef4fc;color:#1e3a8a;font:700 14px system-ui,Arial,sans-serif;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}'+
    '.svb:active{background:#dbe7f7}'+
    '.svp{position:absolute;inset:0;z-index:3;display:none;flex-direction:column;gap:4px;box-sizing:border-box;padding:8px 10px;border-radius:12px;border:2px solid #e11d48;background:#fff;animation:svIn .18s ease-out}'+
    '.svw.on .svp{display:flex}'+
    '@keyframes svIn{from{opacity:0}to{opacity:1}}'+
    '.svh{display:flex;align-items:center;gap:7px;font:600 13.5px system-ui,Arial,sans-serif;color:#9f1239;min-height:18px;white-space:nowrap;overflow:hidden}'+
    '.svh i{width:9px;height:9px;border-radius:50%;background:#e11d48;flex:none;animation:svB 1s infinite}'+
    '@keyframes svB{50%{opacity:.25}}'+
    '.svh .svt{margin-inline-start:auto;font-variant-numeric:tabular-nums;color:#475569}'+
    '.svl{font:13px system-ui,Arial,sans-serif;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:rtl;min-height:16px}'+
    '.svc{flex:1 1 auto;min-height:18px;width:100%;display:block}'+
    '.svr{display:flex;gap:8px}'+
    '.svr button{height:38px;border-radius:12px;font:700 15px system-ui,Arial,sans-serif;cursor:pointer;touch-action:manipulation}'+
    '.svs{flex:1;border:0;background:#e11d48;color:#fff}'+
    '.svx{flex:none;padding:0 12px;border:1.5px solid #d3d9e2;background:#fff;color:#475569}'+
    '.svw.busy .svs{background:#94a3b8}'+
    '.svw.fl>textarea{animation:svF 1.1s ease-out}'+
    '@keyframes svF{0%{box-shadow:0 0 0 3px #86efac}100%{box-shadow:0 0 0 0 rgba(134,239,172,0)}}'+
    '.svm{position:absolute;left:8px;right:8px;bottom:48px;z-index:4;padding:7px 10px;border-radius:10px;background:#1e293b;color:#fff;font:13px/1.35 system-ui,Arial,sans-serif;display:none}'+
    '.svm.on{display:block}';
  var st=document.createElement('style');st.textContent=css;(document.head||document.documentElement).appendChild(st);

  var cur=null; // the one active recording
  function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
  function simOff(){try{return localStorage.getItem('study_wave_sim')==='1'}catch(e){return false}}

  function attach(ta){
    if(!ta||ta.__sv||ta.hasAttribute('data-novoice')||ta.readOnly)return;
    ta.__sv=1;
    var w=el('span','svw');ta.parentNode.insertBefore(w,ta);w.appendChild(ta);
    var b=el('button','svb');b.type='button';b.setAttribute('aria-label','להקליט תשובה בקול');b.innerHTML='🎤 <span>לדבר</span>';
    var p=el('div','svp'),h=el('div','svh'),dot=el('i'),ht=el('span',null,'מקשיב… דבר בחופשיות'),tm=el('span','svt','0:00');
    h.appendChild(dot);h.appendChild(ht);h.appendChild(tm);
    var ln=el('div','svl',''),cv=el('canvas','svc'),r=el('div','svr'),s=el('button','svs','⏹ סיום'),x=el('button','svx','✕ ביטול');
    s.type=x.type='button';r.appendChild(s);r.appendChild(x);
    p.appendChild(h);p.appendChild(ln);p.appendChild(cv);p.appendChild(r);
    var m=el('div','svm');
    w.appendChild(b);w.appendChild(p);w.appendChild(m);
    var mT=0;function msg(t){m.textContent=t;m.classList.add('on');clearTimeout(mT);mT=setTimeout(function(){m.classList.remove('on')},4500)}
    var ui={w:w,ta:ta,p:p,ht:ht,tm:tm,ln:ln,cv:cv,s:s,msg:msg};
    b.addEventListener('click',function(e){e.preventDefault();if(cur)return;start(ui)});
    s.addEventListener('click',function(e){e.preventDefault();if(cur&&cur.ui===ui)stop()});
    x.addEventListener('click',function(e){e.preventDefault();if(cur&&cur.ui===ui)cancel()});
  }

  function start(ui){
    if(!SR){ui.msg('בטלפון הזה אי אפשר להקליט מכאן. אפשר ללחוץ על 🎤 שבמקלדת של הטלפון ולדבר.');return}
    var c={ui:ui,acc:'',sess:'',stopping:false,t0:Date.now(),speak:0,raf:0,stream:null,ac:null,an:null,rec:null,timer:0,err:''};
    cur=c;ui.w.classList.add('on');ui.w.classList.remove('busy');ui.ht.textContent='מקשיב… דבר בחופשיות';ui.ln.textContent='';ui.tm.textContent='0:00';ui.s.textContent='⏹ סיום';
    try{ui.ta.blur()}catch(e){}
    c.rec=newRec(c);
    try{c.rec.start();if(navigator.vibrate)navigator.vibrate(15)}catch(e){end(c);ui.msg('ההקלטה לא התחילה, נסה שוב');return}
    draw(c);
    if(!simOff()&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){
      navigator.mediaDevices.getUserMedia({audio:true}).then(function(st){
        if(cur!==c){st.getTracks().forEach(function(t){t.stop()});return}
        c.stream=st;try{var AC=window.AudioContext||window.webkitAudioContext;c.ac=new AC();var src=c.ac.createMediaStreamSource(st);c.an=c.ac.createAnalyser();c.an.fftSize=1024;src.connect(c.an)}catch(e){release(c)}
      },function(){});
    }
  }
  function newRec(c){
    var r=new SR();r.lang='he-IL';r.continuous=true;r.interimResults=true;
    r.onresult=function(e){if(c.rec!==r)return;var t='';for(var i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;c.sess=t.trim();c.speak=Date.now();
      var all=join(c.acc,c.sess);c.ui.ln.textContent=all.length>60?'…'+all.slice(-60):all};
    r.onsoundstart=r.onspeechstart=function(){c.speak=Date.now()};
    r.onerror=function(e){if(c.rec!==r)return;var er=e.error||'';c.err=er;
      if(er==='not-allowed'||er==='service-not-allowed'){var u=c.ui;end(c);u.msg('אין גישה למיקרופון. צריך לאשר מיקרופון ל-Safari (בהגדרות), או ללחוץ על 🎤 שבמקלדת.')}
      else if(er==='audio-capture'&&c.stream){release(c);try{localStorage.setItem('study_wave_sim','1')}catch(x){}}};
    // iPhone ends a "continuous" session after a pause: start again until he taps סיום
    r.onend=function(){if(c.rec!==r)return;c.acc=join(c.acc,c.sess);c.sess='';if(c.stopping){finish(c);return}
      try{var n=newRec(c);c.rec=n;n.start()}catch(e){finish(c)}};
    return r;
  }
  function join(a,b){return [a,b].filter(Boolean).join(' ').replace(/\s+/g,' ').trim()}
  function draw(c){
    var cv=c.ui.cv,ctx=cv.getContext('2d'),buf=null,ph=0;
    function loop(){
      c.raf=requestAnimationFrame(loop);
      if(!c.ui.ta.offsetParent&&!c.ui.w.offsetParent){cancel();return} // the window closed while recording
      var sec=Math.floor((Date.now()-c.t0)/1000);c.ui.tm.textContent=Math.floor(sec/60)+':'+('0'+sec%60).slice(-2);
      var w=cv.clientWidth,hh=cv.clientHeight,dpr=window.devicePixelRatio||1;if(!w||!hh)return;
      if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(hh*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(hh*dpr)}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,hh);
      var N=Math.max(12,Math.floor(w/7)),lv=[],i;
      if(c.an){if(!buf)buf=new Uint8Array(c.an.fftSize);c.an.getByteTimeDomainData(buf);var step=Math.floor(buf.length/N);
        for(i=0;i<N;i++){var mx=0;for(var j=0;j<step;j++){mx=Math.max(mx,Math.abs(buf[i*step+j]-128))}lv.push(Math.min(1,mx/45))}}
      else{ph+=.12;var a=Date.now()-c.speak<700?.85:.15;for(i=0;i<N;i++)lv.push(a*(.35+.65*Math.abs(Math.sin(ph+i*.55)*Math.sin(ph*.7+i*.21))))}
      ctx.fillStyle=c.stopping?'#94a3b8':'#2f5d9e';
      var x0=(w-N*7)/2;for(i=0;i<N;i++){var bh=Math.max(3,lv[i]*hh);ctx.fillRect(x0+i*7+1,(hh-bh)/2,4,bh)}
    }
    loop();
  }
  function release(c){if(c.stream){c.stream.getTracks().forEach(function(t){t.stop()});c.stream=null}if(c.ac){try{c.ac.close()}catch(e){}c.ac=null}c.an=null}
  function end(c){cancelAnimationFrame(c.raf);clearTimeout(c.timer);var r=c.rec;c.rec=null;if(r){try{r.onresult=r.onend=r.onerror=null;r.abort()}catch(e){}}release(c);
    c.ui.w.classList.remove('on','busy');if(cur===c)cur=null}
  function stop(){var c=cur;if(!c||c.stopping)return;c.stopping=true;c.ui.w.classList.add('busy');c.ui.ht.textContent='מסיים ומתמלל…';c.ui.s.textContent='רגע…';
    try{c.rec.stop()}catch(e){}clearTimeout(c.timer);c.timer=setTimeout(function(){finish(c)},1500)} // iPhone sometimes never fires "end"
  function cancel(){if(cur)end(cur)}
  function finish(c){
    if(cur!==c)return;var txt=join(c.acc,c.sess),ui=c.ui,err=c.err;end(c);
    if(!txt){ui.msg(err&&err!=='no-speech'&&err!=='aborted'?'ההקלטה נכשלה, נסה שוב':'לא שמעתי כלום. נסה שוב, קרוב יותר לטלפון');return}
    var ta=ui.ta,old=ta.value.replace(/\s+$/,''),v=old?old+(/[.!?…]$/.test(old)?' ':' ')+txt:txt;
    var mx=+ta.getAttribute('maxlength')||0;if(mx&&v.length>mx)v=v.slice(0,mx);
    ta.value=v;ta.dispatchEvent(new Event('input',{bubbles:true}));
    ui.w.classList.remove('fl');void ui.w.offsetWidth;ui.w.classList.add('fl');
    ta.scrollTop=ta.scrollHeight;
    ui.msg('✓ הטקסט בתיבה. אפשר לתקן מילה בלחיצה עליה, או להקליט עוד.');
  }
  function scan(root){var l=(root||document).querySelectorAll?(root||document).querySelectorAll('textarea'):[];for(var i=0;i<l.length;i++)attach(l[i])}
  window.StudyVoice={attach:attach,scan:scan,supported:!!SR,busy:function(){return !!cur}};
  function boot(){scan(document);try{new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var a=ms[i].addedNodes;for(var j=0;j<a.length;j++){var n=a[j];if(n.nodeType!==1)continue;if(n.tagName==='TEXTAREA')attach(n);else if(n.querySelector&&n.querySelector('textarea'))scan(n)}}}).observe(document.documentElement,{childList:true,subtree:true})}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
