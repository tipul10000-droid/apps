// התראות ל-Study (Web Push), אורן 6.11.2026.
// ילד: StudyPush.kid(host, 'dani', false)  (false = בת, true = בן) — כפתור "🔔 התראות" בדף הילד: הסבר איך מוסיפים למסך הבית, ואז הפעלה.
//   הילד מקבל התראה על כל תוכן חדש (study_notify) ועל מתנות. רק אם רוצים.
// הורה: StudyPush.parent(button) — באזור ההורים (הקוד נשמר ב-study_par_pin). מקבלים דוח אחרי כל תרגול, התראה כשמבחן קרוב וההתקדמות נמוכה,
//   והודעה כשהילד יודע הכל. השרת: פונקציית study-push (כל 5 דקות). הסכמה: supabase/push.sql.
// באייפון התראות עובדות רק מאפליקציה שנוספה למסך הבית ונפתחה מהאייקון (manifest: display standalone). ההתקדמות עוברת דרך study_state (track.js).
(function(){
  var SB_URL='https://emgtyfksnofzzlutngbf.supabase.co',SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZ3R5Zmtzbm9menpsdXRuZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDI0MTMsImV4cCI6MjEwNjgxODQxM30.b7XE-gbCUlXMqpza1Bn9GvMKQsmu3jKP2eqZ0r4-k2k';
  var ROOT=(document.currentScript&&document.currentScript.src||location.href).replace(/push\.js(\?.*)?$/,'');
  function rpc(fn,body){return fetch(SB_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify(body)}).then(function(r){if(!r.ok)throw new Error('net');return r.json()})}
  function lsG(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function lsS(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}
  function supported(){return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window}
  function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
  function standalone(){return navigator.standalone===true||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)}
  function b64(b){var p='='.repeat((4-b.length%4)%4),raw=atob((b+p).replace(/-/g,'+').replace(/_/g,'/')),o=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)o[i]=raw.charCodeAt(i);return o}
  var reg=null,POPEN=null,PDOT=null,PON=false,PBTN=null;
  function glow(el,v){if(el)el.classList.toggle('pglow',!!v&&!window.STUDY_GUEST)} // התראות כבויות = כפתור זוהר כתזכורת (רק צל, הגודל לא משתנה)
  if(supported()&&!window.STUDY_GUEST){try{navigator.serviceWorker.register(ROOT+'sw.js',{scope:ROOT}).then(function(r){reg=r}).catch(function(){})}catch(e){}}
  function ready(){return reg?Promise.resolve(reg):navigator.serviceWorker.ready}
  function current(){if(!supported()||Notification.permission!=='granted')return Promise.resolve(null);return ready().then(function(r){return r.pushManager.getSubscription()})}

  var css='.pbn{display:flex;align-items:center;gap:14px;width:100%;box-sizing:border-box;font:inherit;text-align:right;color:inherit;background:#f6f8fc;border:1.5px dashed #9fb4d3;border-radius:16px;padding:12px 16px;cursor:pointer;-webkit-tap-highlight-color:transparent}'+
    '.pbn:active{background:#e8eef7}.pbn *{pointer-events:none}.pbn .ic{width:44px;height:44px;flex:none;border-radius:12px;display:grid;place-items:center;font-size:24px;background:#e8eef7}.pbn>span:last-child{flex:1 1 0;min-width:0}'+
    '.pbn b{display:block;font-size:18px}.pbn small{display:block;font-size:13px;color:var(--mut,#5b6675);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pbn small.on{color:#1d7a4a}'+
    '#pov{position:fixed;inset:0;background:rgba(15,23,42,.62);display:none;align-items:center;justify-content:center;z-index:40;padding:calc(env(safe-area-inset-top,0px) + 50px) 14px calc(env(safe-area-inset-bottom,0px) + 14px);box-sizing:border-box}'+
    '#pov.on{display:flex}#pov .pn{background:#fff;border-radius:18px;width:100%;max-width:440px;height:min(560px,100%);box-sizing:border-box;box-shadow:0 10px 40px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden;color:#1f2933;text-align:right}'+
    '#pov .hd{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 16px;border-bottom:1px solid #e3e8ef}#pov h2{margin:0;font-size:19px}'+
    '#pov .x{flex:none;width:40px;height:40px;border-radius:12px;border:1px solid #d3d9e2;background:#fff;font-size:18px;cursor:pointer;color:#1f2933}'+
    '#pov .bd{flex:1 1 0;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 16px;font-size:15px;line-height:1.5}#pov .bd p{margin:0 0 10px}#pov ol{margin:0 0 10px;padding-inline-start:22px}#pov li{margin-bottom:6px}'+
    '#pov .ft{flex:none;padding:10px 16px 14px;border-top:1px solid #e3e8ef}#pov .m{height:20px;font-size:14px;margin-bottom:8px;text-align:center;color:#2f5d9e}'+
    '#pov .go{display:block;width:100%;height:48px;font:600 16px system-ui,Arial,sans-serif;border-radius:12px;border:1px solid #2f5d9e;background:#2f5d9e;color:#fff;cursor:pointer}#pov .go.off{background:#fff;color:#1f2933;border-color:#d3d9e2}#pov .go:disabled{opacity:.5}'+
    '.pglow{animation:pglow 1.8s ease-in-out infinite}@keyframes pglow{0%,100%{box-shadow:0 0 0 0 rgba(232,145,30,0)}50%{box-shadow:0 0 0 3px rgba(232,145,30,.55),0 0 16px rgba(232,145,30,.6)}}'+
    '#pov .ok{background:#e9f7ef;border-radius:12px;padding:10px 12px;margin-bottom:10px;color:#1d7a4a;font-weight:600}#pov .sm{font-size:13px;color:#5b6675}';

  function mount(o){
    if(!document.getElementById('povcss')){var st=document.createElement('style');st.id='povcss';st.textContent=css;document.head.appendChild(st)}
    var ov=document.createElement('div');ov.id='pov';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
    ov.innerHTML='<div class="pn"><div class="hd"><h2>🔔 התראות</h2><button type="button" class="x" aria-label="סגירה">✕</button></div><div class="bd"></div><div class="ft"><div class="m"></div><button type="button" class="go"></button></div></div>';
    document.body.appendChild(ov);
    var bd=ov.querySelector('.bd'),m=ov.querySelector('.m'),go=ov.querySelector('.go'),busy=false,on=false;
    var flag='study_push_'+o.role+(o.kid?'_'+o.kid:'');
    function close(){ov.classList.remove('on')}
    ov.querySelector('.x').onclick=close;ov.onclick=function(e){if(e.target===ov)close()};
    function steps(){return '<p><b>שלב 1: מוסיפים את Study Monster למסך הבית</b></p><ol>'+
      '<li>בספארי לוחצים על שלוש הנקודות (או כפתור השיתוף ⬆️) ליד שורת הכתובת.</li>'+
      '<li>לוחצים <b>"שיתוף"</b>.</li>'+
      '<li>גוללים למטה ברשימה ובוחרים <b>"הוספה למסך הבית"</b>.</li>'+
      '<li>מוודאים ש<b>"פתיחה כאפליקציית רשת"</b> מסומן.</li>'+
      '<li>לוחצים <b>"הוספה"</b>.</li></ol>'+
      '<p><b>שלב 2: פותחים מהאייקון</b></p><ol start="6"><li>פותחים את <b>Study Monster</b> מהאייקון החדש במסך הבית (היצור הירוק עם הספר), לא מהלינק.</li>'+
      '<li>'+o.again+'</li></ol><p class="sm">ההתקדמות עוברת לבד לאפליקציה במסך הבית.</p>'}
    function draw(){
      m.textContent='';go.disabled=false;
      if(o.guest&&window.STUDY_GUEST){bd.innerHTML='<p>'+o.what+'</p><p><b>במצב אורח אין התראות.</b> יוצאים ממצב אורח, ואז אפשר להפעיל.</p>';go.textContent='הבנתי';go.className='go off';go.onclick=close;return}
      if(on){bd.innerHTML='<div class="ok">✓ ההתראות פועלות במכשיר הזה</div><p>'+o.what+'</p>';go.textContent='כיבוי התראות';go.className='go off';go.onclick=off;return}
      if(supported()&&(!isIOS()||standalone())){bd.innerHTML='<p>'+o.what+'</p><p class="sm">הטלפון ישאל אם לאשר התראות. לוחצים "אפשר".</p>';go.textContent='הפעלת התראות';go.className='go';go.onclick=enable;return}
      if(isIOS()){bd.innerHTML='<p>'+o.what+'</p><p>באייפון התראות עובדות רק כש-Study Monster נמצאת במסך הבית.</p>'+steps();go.textContent='הבנתי';go.className='go off';go.onclick=close;return}
      bd.innerHTML='<p>'+o.what+'</p><p>הדפדפן הזה לא תומך בהתראות. אפשר לנסות בכרום, או בספארי באייפון.</p>';go.textContent='הבנתי';go.className='go off';go.onclick=close}
    function enable(){if(busy)return;busy=true;go.disabled=true;
      var ask=Notification.requestPermission(); // חייב לצאת ישר מהלחיצה, אחרת אייפון לא שואל
      m.textContent='מפעיל...';
      Promise.resolve(ask).then(function(p){if(p!=='granted')throw new Error('denied');return Promise.all([ready(),rpc('study_push_key',{})])})
        .then(function(a){var r=a[0],key=a[1];if(!key)throw new Error('key');return r.pushManager.getSubscription().then(function(s){return s||r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(key)})})})
        .then(function(s){var j=s.toJSON();return rpc('study_push_save',{p_role:o.role,p_kid:o.kid||'',p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_pin:o.pin?o.pin():null})})
        .then(function(j){if(!j||!j.ok)throw new Error(j&&j.err||'save');on=true;lsS(flag,'1');busy=false;state();draw();m.textContent='מעולה! מעכשיו יגיעו התראות 🎉'})
        .catch(function(e){busy=false;draw();m.textContent=e.message==='denied'?'ההתראות חסומות. מאשרים בהגדרות של הטלפון ← התראות ← Study Monster':e.message==='locked'?'יותר מדי ניסיונות קוד. נסו בעוד חצי שעה':e.message==='bad'?'צריך להיכנס שוב עם הקוד':'לא הצלחנו להפעיל. נסו שוב'})}
    function off(){if(busy)return;busy=true;go.disabled=true;
      current().then(function(s){if(s)return rpc('study_push_off',{p_endpoint:s.endpoint,p_role:o.role,p_kid:o.kid||''}).catch(function(){})})
        .then(function(){on=false;lsS(flag,null);busy=false;state();draw();m.textContent='ההתראות כובו'})
        .catch(function(){busy=false;draw();m.textContent='לא הצלחנו לכבות. נסו שוב'})}
    function state(){if(o.onState)o.onState(on)}
    current().then(function(s){on=!!(s&&lsG(flag));state();
      if(on){var j=s.toJSON();rpc('study_push_save',{p_role:o.role,p_kid:o.kid||'',p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_pin:o.pin?o.pin():null}).catch(function(){})}}).catch(function(){});
    return function(){draw();ov.classList.add('on')};
  }

  window.StudyPush={
    kid:function(host,kid,boy){
      var open=mount({role:'kid',kid:kid,guest:true,
        what:'ההתראות הן <b>רק אם רוצים</b>. אם מפעילים, תקבל'+(boy?'':'י')+' הודעה על כל תוכן חדש שאבא ואמא מכינים לך (מילים חדשות, מבחן חדש), ועל מתנות 🎁.',
        again:'נכנסים לאזור שלך, לוחצים כאן על <b>🔔 התראות</b> ואז <b>"הפעלת התראות"</b>, ומאשרים כשהטלפון שואל.',
        onState:function(v){if(window.STUDY_GUEST)return;sm.textContent=v?'פועלות ✓ על כל תוכן חדש':'כבויות · לחיצה להסבר והפעלה';sm.className=v?'on':'';glow(b,!v)}});
      var b=document.createElement('button');b.type='button';b.className='pbn';
      b.innerHTML='<span class="ic">🔔</span><span><b>התראות על תוכן חדש</b><small>כבויות · לחיצה להסבר והפעלה</small></span>';
      var sm=b.querySelector('small');if(window.STUDY_GUEST)sm.textContent='לא פעילות במצב אורח';
      glow(b,true);b.onclick=open;host.appendChild(b);return b},
    parent:function(btn,getPin){ // אפשר לקרוא שוב אחרי רינדור מחדש: החלון נבנה פעם אחת
      var dot=document.createElement('i');dot.style.cssText='display:inline-block;width:8px;height:8px;border-radius:50%;background:'+(PON?'#1d9e5a':'#c3cad4')+';margin-inline-start:6px;vertical-align:middle';btn.appendChild(dot);PDOT=dot;PBTN=btn;glow(btn,!PON);
      if(!POPEN)POPEN=mount({role:'parent',pin:getPin,
        what:'מקבלים: <b>דוח קטן אחרי כל תרגול</b> (כמה זמן, כמה תשובות, כמה נכונות ובאחוזים), <b>תזכורת לבדוק עם הילד</b> כשהמבחן קרוב וההתקדמות נמוכה (יום-יומיים לפני: עד 3 פעמים ביום), והודעה כשהילד יודע הכל לפני המבחן (והוא מקבל מתנה באפליקציה). בשקט 22:00-07:00.',
        again:'נכנסים לאזור ההורים, לוחצים <b>🔔 התראות</b> ואז <b>"הפעלת התראות"</b>.',
        onState:function(v){PON=v;if(PDOT)PDOT.style.background=v?'#1d9e5a':'#c3cad4';glow(PBTN,!v)}});
      btn.onclick=POPEN}
  };
})();
