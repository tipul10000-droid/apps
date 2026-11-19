// 🙋 עזרה מקרוב משפחה בזמן אמת (אורן 19.11.2026, כלל קבוע לכל הילדים ולכל תוכן לימוד, קיים ועתידי).
// נטען אוטומטית מ-guest.js בכל דף תוכן (study/<ילד>/<תוכן>/), כך שכל תוכן חדש מקבל את זה בלי קוד נוסף.
// 1. כפתור "🙋 עזרה" בפס העליון (#gbar) פותח חלון צף (רקע מוחשך): ממי לבקש עזרה? כל בני המשפחה (אבא, אמא, האחים), עם נקודת זמינות
//    (study-help?action=avail: כללים קבועים + הלו״ז של אבא) ואייקון וואטסאפ לכל אחד (?action=wa, המספרים רק בשרת).
// 2. בחירה = מצב "עזרה" (פס ירוק) + התראה רק למי שנבחר (?action=help&to=). בפס: "⏳ מחכים ל..." עד שהוא פותח את המסך, ואז "👀 ... רואה".
// 3. בזמן המצב הדף שולח "צילום" חי של המסך (ה-DOM כמו שהוא: השאלה המדויקת, מה שהוקלד, חלונות, צבעים) כשמשהו משתנה (עד פעם בשנייה)
//    ל-study_state_put (app 'live', בלי שינוי סכמה; score = שניות, תמיד עולה). העוזר פותח את study/help/?kid=<ילד> ורואה בדיוק את אותו מסך,
//    מכל מקום, בלי לייצר מחדש את השאלות. העוזר מסמן שהוא מחובר ב-app 'livep' {sid, at, by}; "סיום עזרה" אצלו = end.
// 4. דילוג וחזרה: תוכן שרושם hook ((window.StudyHelpQ=window.StudyHelpQ||[]).push({can, skip, back})) מקבל בחלון "⏭️ לדלג על השאלה";
//    השאלה נשמרת, ממשיכים, וכשהעוזר מגיע מופיע בפס "🔙 לשאלה ששמרתי". היום: lia/math4, dani/math6. תוכן חדש עם תור שאלות = לרשום hook כזה.
// מצב: localStorage study_help_<kid> {sid, t0, act, to:[ids], seen:{id:at}}. נמשך גם במעבר בין דפים, עד "סיום" (של הילד או העוזר), 20 דק׳ בלי נגיעה, או שעה.
// הפס העליון מעל החלונות של הדף (z-index 55), כך שאפשר לבקש עזרה גם כשחלון הסבר פתוח. לא במצב אורח ולא בתצוגת בדיקה של הורה.
(function(){
  var m=/\/study\/([a-z]+)\/([a-z0-9]+)\/?/.exec(location.pathname);if(!m)return;
  var kid=m[1],app=m[2];if(/^(family|parents|kids|tools|audio|supabase|sqfx|help)$/.test(kid)||/^(notes|audio|try)$/.test(app))return;
  if(window.STUDY_GUEST||window.STUDY_REVIEW||/[?&]review=1/.test(location.search)||window.self!==window.top)return;
  var SB_URL='https://emgtyfksnofzzlutngbf.supabase.co',SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZ3R5Zmtzbm9menpsdXRuZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDI0MTMsImV4cCI6MjEwNjgxODQxM30.b7XE-gbCUlXMqpza1Bn9GvMKQsmu3jKP2eqZ0r4-k2k',FN=SB_URL+'/functions/v1/study-help';
  var BOY={evyatar:1,levi:1,shilo:1}[kid]?1:0,g=function(f,b){return BOY?b:f};
  var K='study_help_'+kid,IDLE=20*60e3,MAX=60*60e3,HOOK=null;
  function rpc(fn,body,keep){return fetch(SB_URL+'/rest/v1/rpc/'+fn,{method:'POST',keepalive:!!keep,headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify(body)}).then(function(r){if(!r.ok)throw new Error('net');return r.json()})}
  function fn(q){return fetch(FN+'?'+q,{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:'{}'}).then(function(r){return r.json()})}
  function ld(){try{return JSON.parse(localStorage.getItem(K))}catch(e){return null}}
  function sv(o){try{o?localStorage.setItem(K,JSON.stringify(o)):localStorage.removeItem(K)}catch(e){}}
  function rid(){var a=new Uint8Array(8);crypto.getRandomValues(a);return Array.from(a,function(b){return('0'+b.toString(16)).slice(-2)}).join('')}
  function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  var S=ld();if(S&&(Date.now()-(S.act||0)>IDLE||Date.now()-(S.t0||0)>MAX)){S=null;sv(null)}
  // מי יכול לעזור (בלי הילד עצמו): [מזהה, שם, אימוג׳י, בן]. הזמינות, המכשירים והוואטסאפ מהשרת.
  var FAMH={a:[['oren','אבא','👨',1],['lior','אמא','👩',0],['evyatar','אביתר','⚽',1],['dani','דני','🎤',0],['lia','ליה','🪐',0]],b:[['yehuda','אבא','👨',1]]};
  var FAM={evyatar:'a',dani:'a',lia:'a',levi:'b',shilo:'b'}[kid]||'a';
  var HL=FAMH[FAM].filter(function(h){return h[0]!==kid}),AV={},AVT=0,PARK=[];
  function hx(id){return HL.filter(function(x){return x[0]===id})[0]||['','','',0]}
  function hn(id){return hx(id)[1]}
  function hb(id){return hx(id)[3]}
  var WA='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#25D366" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/><path fill="#fff" d="M17.3 14.6c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.6.1l-.9 1.1c-.2.2-.3.2-.6.1a7.6 7.6 0 0 1-3.8-3.3c-.3-.5.3-.5.8-1.6.1-.2 0-.3 0-.5l-.9-2c-.2-.5-.4-.5-.6-.5h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.7-.7 1.9-1.4.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z"/></svg>';

  var css='#gbar{position:relative;z-index:55;border-bottom:1px solid transparent}'+
    '#hlpB{margin-inline-start:auto;flex:none;width:96px;height:26px;box-sizing:border-box;font:600 13px system-ui,Arial,sans-serif;border-radius:13px;border:1.5px solid #9fb4d3;background:#fff;color:#2f5d9e;cursor:pointer;padding:0;white-space:nowrap;-webkit-tap-highlight-color:transparent}'+
    '#hlpB:active{background:#e8eef7}#gbar.hlp{background:#e7f6ec!important;border-bottom:1px solid #a7dcb9!important}#gbar.hlp #hlpB{border-color:#1d7a4a;color:#1d7a4a}'+
    '#hlpC{display:none;flex:0 1 auto;min-width:0;height:26px;overflow:hidden;text-overflow:ellipsis;font:600 13px system-ui,Arial,sans-serif;color:#1d7a4a;background:none;border:0;border-radius:13px;padding:0 10px;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent}#gbar.hlp #hlpC{display:block}'+
    '#hlpC.bk{background:#1d7a4a;color:#fff}#hlpC i{font-style:normal;display:inline-block;animation:hlpP 1.6s ease-in-out infinite}@keyframes hlpP{50%{transform:scale(1.18)}}'+
    '#hlpO{position:fixed;inset:0;background:rgba(15,23,42,.62);display:none;align-items:center;justify-content:center;z-index:60;padding:16px;box-sizing:border-box;direction:rtl}#hlpO.on{display:flex}'+
    '#hlpO .pn{background:#fff;border-radius:18px;width:100%;max-width:400px;max-height:100%;overflow-y:auto;box-sizing:border-box;padding:16px 14px 12px;box-shadow:0 10px 40px rgba(0,0,0,.3);color:#1f2933;font:16px/1.45 system-ui,Arial,sans-serif;text-align:center;animation:hlpI .18s ease-out}'+
    '@keyframes hlpI{from{transform:translateY(8px);opacity:0}}#hlpO .em{font-size:36px;line-height:1.1}#hlpO h2{margin:2px 0 4px;font-size:20px}#hlpO p{margin:0 0 10px;font-size:14px;color:#3e4c59}'+
    '#hlpO .bt{display:block;width:100%;box-sizing:border-box;font:600 16px system-ui,Arial,sans-serif;border-radius:14px;padding:10px;margin-top:8px;cursor:pointer;border:1.5px solid #2f5d9e;background:#2f5d9e;color:#fff;text-decoration:none}'+
    '#hlpO .bt.s{background:#fff;color:#2f5d9e}#hlpO .bt.g{background:#fff;color:#1d7a4a;border-color:#1d7a4a}#hlpO .bt.r{background:#fff;color:#b42318;border-color:#e3a19b}'+
    '#hlpO .hl{border:1.5px solid #d3d9e2;border-radius:16px;overflow:hidden;text-align:right}'+
    '#hlpO .hr{display:flex;align-items:center;gap:8px;min-height:54px;padding:4px 8px 4px 10px;border-top:1px solid #e3e8ef}#hlpO .hr:first-child{border-top:0}'+
    '#hlpO .hm{flex:1 1 0;min-width:0;display:flex;align-items:center;gap:10px;background:none;border:0;font:inherit;color:inherit;text-align:right;padding:4px 0;cursor:pointer}'+
    '#hlpO .hm:disabled{cursor:default}#hlpO .hm.off{opacity:.55}#hlpO .hm .e{font-size:26px;width:34px;flex:none;text-align:center}#hlpO .hm b{display:block;font-size:17px}'+
    '#hlpO .hm small{display:block;font-size:13px;color:#5b6675;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '#hlpO .dt{display:inline-block;width:9px;height:9px;border-radius:50%;background:#9aa5b1;margin-inline-end:5px;vertical-align:0}#hlpO .dt.ok{background:#1d9a55}#hlpO .dt.pd{background:#d97706;animation:hlpP 1.4s infinite}'+
    '#hlpO .wa{flex:none;width:44px;height:44px;border-radius:12px;border:1.5px solid #bfe8cf;background:#f1fbf5;display:grid;place-items:center;text-decoration:none}#hlpO .wa.no{visibility:hidden}'+
    '#hlpO .pk{margin:10px 0 0;font-size:14px;color:#3e4c59}';
  var bar,btn,chip,ov;
  function ui(){bar=document.getElementById('gbar');if(!bar){setTimeout(ui,100);return}
    var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    chip=document.createElement('button');chip.type='button';chip.id='hlpC';bar.appendChild(chip);
    btn=document.createElement('button');btn.type='button';btn.id='hlpB';bar.appendChild(btn);
    btn.onclick=panel;chip.onclick=function(){if(PARK.length&&anySeen())back();else panel()};
    ov=document.createElement('div');ov.id='hlpO';document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)close()});
    paint();if(S)start(true)}
  function anySeen(){if(!S||!S.seen)return null;var b=null;for(var k in S.seen)if(Date.now()-S.seen[k]<15000)b=k;return b}
  function paint(){if(!btn)return;btn.textContent='🙋 עזרה';bar.classList.toggle('hlp',!!S);
    var w=anySeen();chip.classList.toggle('bk',!!(S&&PARK.length&&w));
    if(!S){chip.innerHTML='';return}
    if(PARK.length&&w)chip.innerHTML='🔙 לשאלה ששמרתי';
    else if(w)chip.innerHTML='<i>👀</i> '+esc(hn(w))+' '+(hb(w)?'רואה':'רואה')+' את המסך שלך';
    else if((S.to||[]).length)chip.innerHTML='<i>⏳</i> מחכים ל'+esc(S.to.map(hn).join(' ול'))+'…';
    else chip.innerHTML='<i>🤝</i> עזרה מהמשפחה'}
  function close(){ov.classList.remove('on');ov.innerHTML=''}
  function show(h,bind){ov.innerHTML='<div class="pn">'+h+'</div>';ov.classList.add('on');
    ov.querySelectorAll('[data-a]').forEach(function(b){b.addEventListener('click',function(e){bind(b.getAttribute('data-a'),b.getAttribute('data-id'),e)})})}
  function wa(id){var w=null;try{w=window.open('','_blank')}catch(e){}var go=function(){var u=FN+'?action=wa&kid='+kid+'&sid='+S.sid+'&to='+id+'&apikey='+SB_KEY;if(w&&!w.closed)w.location.href=u;else location.href=u};if(S&&sentOnce)go();else{begin([]);var n=0,t=setInterval(function(){if(sentOnce||++n>40){clearInterval(t);go()}},200)}}
  function rows(){return HL.map(function(h){var a=AV[h[0]],req=S&&(S.to||[]).indexOf(h[0])>=0,seen=S&&S.seen&&S.seen[h[0]]&&Date.now()-S.seen[h[0]]<15000;
      var b=h[3],st=seen?'<span class="dt ok"></span>רואה את המסך שלך עכשיו':req?'<span class="dt pd"></span>'+(b?'קיבל':'קיבלה')+' הודעה, מחכים ש'+(b?'יפתח':'תפתח')+'…':
        !a?'<span class="dt"></span>בודק זמינות…':a.ok?'<span class="dt ok"></span>'+(b?'זמין':'זמינה')+(a.why?' · '+esc(a.why):'')+(a.dev?'':' · בלי התראות, רק וואטסאפ'):
        '<span class="dt"></span>'+(a.why?esc(a.why):'לא '+(b?'זמין':'זמינה')+' עכשיו')+(a.until?' עד '+esc(a.until):'');
      var off=!seen&&!req&&a&&(!a.ok||!a.dev);
      return '<div class="hr"><button class="hm'+(off?' off':'')+'" data-a="ask" data-id="'+h[0]+'"'+(off||seen||req?' disabled':'')+'><span class="e">'+h[2]+'</span><span style="min-width:0"><b>'+esc(h[1])+'</b><small>'+st+'</small></span></button>'+
        '<a class="wa'+(a&&a.wa?'':' no')+'" data-a="wa" data-id="'+h[0]+'" href="#" aria-label="וואטסאפ ל'+esc(h[1])+'">'+WA+'</a></div>'}).join('')}
  // החלון הראשי: ממי לבקש עזרה + (בזמן עזרה) מצב כל אחד, דילוג על השאלה, חזרה לשאלה, סיום
  function panel(){
    var h='<div class="em">🙋</div><h2>'+(S?'עזרה מהמשפחה':'ממי לבקש עזרה?')+'</h2><p>'+(S?'מי שפותח את ההודעה רואה בדיוק את המסך שלך. אפשר לבקש גם ממישהו נוסף.':'מי ש'+g('תבחרי','תבחר')+' יקבל הודעה ויראה בטלפון שלו בדיוק את המסך שלך, כולל השאלה הזאת. אפשר לדבר בטלפון בזמן הזה.')+'</p>'+
      '<div class="hl">'+rows()+'</div>';
    if(S&&HOOK&&(!HOOK.can||HOOK.can())&&!anySeen())h+='<button class="bt g" data-a="skip">⏭️ לדלג על השאלה הזאת עד שיגיעו לעזור</button>';
    if(S&&PARK.length)h+='<div class="pk">📌 '+(PARK.length===1?'שאלה אחת שמורה בצד':PARK.length+' שאלות שמורות בצד')+'</div><button class="bt g" data-a="back">🔙 לחזור לשאלה ששמרתי</button>';
    h+=S?'<button class="bt r" data-a="end">✓ לסיים את העזרה</button><button class="bt s" data-a="x">סגירה</button>':'<button class="bt s" data-a="x">ביטול</button>';
    show(h,act1);
    if(Date.now()-AVT>20000){AVT=Date.now();fn('action=avail&kid='+kid).then(function(j){if(j&&j.list){AV={};j.list.forEach(function(x){AV[x.id]=x});
      var L=ov.querySelector('.hl');if(ov.classList.contains('on')&&L){L.innerHTML=rows();L.querySelectorAll('[data-a]').forEach(function(b){b.addEventListener('click',function(e){act1(b.getAttribute('data-a'),b.getAttribute('data-id'),e)})})}}}).catch(function(){AVT=0})}}
  function act1(a,id,e){
    if(a==='ask')request(id);
    else if(a==='wa'){e.preventDefault();if(AV[id]&&AV[id].wa)wa(id)}
    else if(a==='skip'){var t=HOOK.skip();close();if(t!=null){PARK.push(t);paint();send(true);var w=(S.to||[])[0];toast('📌 השאלה נשמרה בצד. ממשיכים, ונחזור אליה כש'+(w?hn(w)+' '+(hb(w)?'יגיע':'תגיע'):'יגיעו לעזור')+'.')}else toast('אפשר לדלג רק על שאלה פתוחה, לפני שעונים עליה.')}
    else if(a==='back'){close();back()}
    else if(a==='end'){close();stop(true)}
    else close()}
  function toast(t){var d=document.createElement('div');d.textContent=t;d.style.cssText='position:fixed;left:14px;right:14px;top:calc(max(calc(env(safe-area-inset-top,0px) + 6px),44px) + 40px);z-index:61;background:#1f2933;color:#fff;border-radius:14px;padding:10px 14px;font:600 15px/1.4 system-ui,Arial,sans-serif;text-align:center;direction:rtl;box-shadow:0 6px 20px rgba(0,0,0,.25);pointer-events:none';document.body.appendChild(d);setTimeout(function(){d.remove()},3600)}
  function begin(to){if(!S){S={sid:rid(),t0:Date.now(),act:Date.now(),to:[],seen:{}};sv(S);start(false)}to.forEach(function(x){if(S.to.indexOf(x)<0)S.to.push(x)});sv(S);paint()}
  var PEND=[];
  function request(id){begin([id]);close();PEND.push(id);flush();
    toast('📨 '+hn(id)+' '+(hb(id)?'יקבל':'תקבל')+' הודעה עכשיו.'+(HOOK?' אם לוקח זמן: "🙋 עזרה" ← לדלג על השאלה ולחזור אליה.':''))}
  function flush(){if(!S||!sentOnce)return;send(true);while(PEND.length){var id=PEND.shift();fn('action=help&kid='+kid+'&sid='+S.sid+'&to='+id).catch(function(){})}}
  function back(){if(!PARK.length||!HOOK)return;var t=PARK.shift();HOOK.back(t);paint();send(true)}
  // תוכן שרושם hook לדילוג וחזרה (הדף נטען לפני הקובץ הזה, ולכן דרך תור)
  function reg(h){HOOK=h}
  (window.StudyHelpQ||[]).forEach(reg);window.StudyHelpQ={push:reg};

  // ---- הצילום החי ----
  var mo=null,tm=null,hbt=null,pl=null,lastSent=0,lastH='',busy=false,tap=null,sentOnce=false,lis=false;
  function headCss(){var o=[];document.querySelectorAll('style,link[rel=stylesheet]').forEach(function(el){
      if(el.tagName==='STYLE'){var t=el.textContent;if(t.indexOf('#hlpB{')<0)o.push(['s',t])}else if(el.href)o.push(['l',el.href])});return o}
  function snap(){var b=document.body.cloneNode(true),sI=document.body.querySelectorAll('input,textarea,select,canvas'),dI=b.querySelectorAll('input,textarea,select,canvas');
    for(var i=0;i<sI.length&&i<dI.length;i++){var s=sI[i],d=dI[i];try{
      if(s.tagName==='CANVAS'){var u='';try{if(s.width*s.height<=800*800)u=s.toDataURL('image/png')}catch(e){}var im=document.createElement('img');if(u)im.src=u;im.className=s.className;im.setAttribute('style',(s.getAttribute('style')||'')+';width:'+s.clientWidth+'px;height:'+s.clientHeight+'px');d.parentNode.replaceChild(im,d)}
      else if(s.tagName==='TEXTAREA')d.textContent=s.value;
      else if(s.tagName==='SELECT'){var o=d.options[s.selectedIndex];if(o)o.setAttribute('selected','')}
      else if(s.type==='checkbox'||s.type==='radio'){if(s.checked)d.setAttribute('checked','');else d.removeAttribute('checked')}
      else d.setAttribute('value',s.value)}catch(e){}}
    b.querySelectorAll('script,noscript,iframe,audio,video,#hlpO,#hlpB,#hlpC').forEach(function(x){x.remove()});
    var gb=b.querySelector('#gbar');if(gb)gb.innerHTML='<span style="font:600 13px system-ui;color:#1d7a4a">🤝 עזרה מהמשפחה'+(PARK.length?' · 📌 שאלה שמורה בצד':'')+'</span>';
    var de=document.documentElement;
    return {html:b.innerHTML.replace(/>\s+</g,'><'),ha:{lang:de.lang||'he',dir:de.dir||'rtl',cls:de.className||'',st:de.getAttribute('style')||'',fam:de.getAttribute('data-fam')||''},
      ba:{cls:document.body.className||'',st:document.body.getAttribute('style')||''}}}
  function send(force){if(!S||busy)return;var n=Date.now();if(!force&&n-lastSent<900){clearTimeout(tm);tm=setTimeout(function(){send(false)},950-(n-lastSent));return}
    var sn=snap(),key=sn.html+'|'+sn.ba.cls+'|'+sn.ha.cls+'|'+(tap?tap[2]:'');if(!force&&key===lastH)return;
    var k={v:2,sid:S.sid,on:true,at:n,t0:S.t0,app:app,path:location.pathname+location.search,title:document.title,w:innerWidth,h:innerHeight,
      to:S.to||[],park:PARK.length,css:headCss(),html:sn.html,ha:sn.ha,ba:sn.ba,tap:tap};
    if(JSON.stringify(k).length>190000){k.html=sn.html.replace(/src="data:image\/[^"]{2000,}"/g,'src=""');if(JSON.stringify(k).length>190000){k.css=k.css.filter(function(x){return x[0]==='l'});k.big=1}}
    busy=true;lastSent=n;lastH=key;
    rpc('study_state_put',{p_kid:kid,p_app:'live',p_keys:k,p_score:Math.floor(n/1000)}).then(function(){busy=false;if(!sentOnce){sentOnce=true;flush()}}).catch(function(){busy=false;lastH=''})}
  function act(){if(!S)return;S.act=Date.now();sv(S)}
  function start(resume){sentOnce=false;
    mo=new MutationObserver(function(){send(false)});mo.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
    if(!lis){lis=true;['input','change'].forEach(function(e){document.addEventListener(e,function(){send(false)},true)})}
    hbt=setInterval(function(){if(!S)return;if(Date.now()-S.act>IDLE||Date.now()-S.t0>MAX){stop(true);return}send(true)},10000);
    pl=setInterval(poll,3000);setTimeout(function(){send(true)},resume?600:30);poll()}
  function poll(){if(!S)return;rpc('study_state_get',{p_kid:kid,p_app:'livep'}).then(function(j){if(!S||!j||!j.keys||j.keys.sid!==S.sid)return;
      var by=j.keys.by||'';
      if(j.keys.end){stop(true);show('<div class="em">💪</div><h2>'+(by?esc(hn(by))+' '+(hb(by)?'סיים':'סיימה')+' לעזור':'העזרה הסתיימה')+'</h2><p>כל הכבוד! '+g('את יכולה','אתה יכול')+' להמשיך לבד מכאן.</p><button class="bt" data-a="x">המשך</button>',close);return}
      var a=+j.keys.at||0;S.seen=S.seen||{};if(by&&a>(S.seen[by]||0)){var was=anySeen();S.seen[by]=Math.min(a,Date.now());sv(S);
        if(!was&&PARK.length)toast('👀 '+hn(by)+' '+(hb(by)?'הגיע':'הגיעה')+'! לוחצים למעלה על "🔙 לשאלה ששמרתי".')}paint()}).catch(function(){});paint()}
  function stop(tell){if(!S)return;var sid=S.sid;S=null;sv(null);PARK=[];PEND=[];if(mo)mo.disconnect();clearInterval(hbt);clearInterval(pl);clearTimeout(tm);paint();
    if(tell)rpc('study_state_put',{p_kid:kid,p_app:'live',p_keys:{v:2,sid:sid,on:false,at:Date.now(),app:app},p_score:Math.floor(Date.now()/1000)},true).catch(function(){})}
  // נגיעה של הילד: העוזר רואה נקודה קטנה איפה נגע/ה
  document.addEventListener('pointerdown',function(e){act();if(!S||(e.target&&e.target.closest&&e.target.closest('#gbar,#hlpO')))return;tap=[Math.round(e.clientX),Math.round(e.clientY),Date.now()];send(false)},true);
  document.addEventListener('keydown',act,true);
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&S)send(true)});
  addEventListener('resize',function(){if(S)send(false)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ui);else ui();
  window.StudyHelp={on:function(){return !!S},stop:function(){stop(true)}};
})();
