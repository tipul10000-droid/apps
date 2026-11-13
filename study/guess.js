// study/guess.js: זיהוי ניחושים (אורן 13.11.2026, כלל קבוע לכל הילדים ולכל השיעורים, גם העתידיים).
// ניחוש = כמה טעויות מהירות מדי (בלי זמן לחשוב), או תשובות לפני שההקלטה של השאלה הסתיימה.
// כשמזהים: התשובה לא מתקבלת, ומתנגנת הודעה קולית נעימה (הילה) שאי אפשר לדלג עליה בשום לחיצה, ואז השאלה חוזרת.
// ניחוש שחוזר (אזהרה שנייה תוך 30 דקות) = הפרסים (סקווישים) נעצרים, עד 10 תשובות נכונות במחשבה.
// שימוש בשיעור:
//   StudyGuess.init(kid, app, {fast: ms, stop: fn})  פעם אחת (fast = תשובה מהר מזה נחשבת "בלי מחשבה"; stop = עוצר את השמע של השיעור)
//   StudyGuess.q({audio:true})   כששאלה חדשה מוצגת (audio = מתנגנת עכשיו הקלטה של השאלה)
//   StudyGuess.heard()           כשההקלטה של השאלה הסתיימה (מכאן סופרים את זמן המחשבה)
//   StudyGuess.tap()             לחיצה על תשובה בזמן שהן נעולות (באמצע הקלטה)
//   if(StudyGuess.chk(ok, redo)) return;   לפני שמקבלים תשובה. true = ניחוש: לא לקבל, redo נקרא אחרי ההודעה
//   StudyGuess.reward()          false = לא נותנים סקווישי/פרס על התשובה הזו
// הנתונים: study_gs_<kid>_<app> {w אזהרות ברצף, at, lock, need, tot}. הדיווח להורים: gs (כמה פעמים), gl (פרסים עצורים).
(function(){
  const V='?v=1',BASE=(document.currentScript&&document.currentScript.src||'').replace(/guess\.js.*$/,'')+'audio/';
  const CL={g1:{f:'g1.mp3',d:15.1},g2:{f:'g2.mp3',d:10.8},g3:{f:'g3.mp3',d:2.5}};
  const NEED=10,WIN=6,LIM=3;
  const LS={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  let K=null,cfg={fast:1000},st=null,H=[],t0=Date.now(),aud=false,early=0,busy=false,AU={};
  const save=()=>{if(K&&!window.STUDY_REVIEW)LS.set(K,st)};
  function load(f){if(!AU[f]){const a=new Audio(BASE+f+V);a.preload='auto';try{a.load()}catch(e){}AU[f]=a}return AU[f]}
  function css(){if(document.getElementById('gscss'))return;const s=document.createElement('style');s.id='gscss';
    s.textContent=`#gsov{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:18px;touch-action:none;animation:gsin .35s ease}
#gsov .c{background:#fff;border-radius:22px;max-width:340px;width:100%;padding:22px 20px 18px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.25);font-family:inherit;color:#1f2937;direction:rtl}
#gsov .e{font-size:64px;line-height:1;animation:gsb 2.4s ease-in-out infinite}#gsov h2{margin:10px 0 6px;font-size:24px;color:#2f5d9e}
#gsov p{margin:6px 0;font-size:17px;line-height:1.45}#gsov .s{color:#6b7280;font-size:14px;margin-top:10px}
#gsov .w{display:flex;justify-content:center;gap:5px;margin-top:12px}#gsov .w i{width:7px;height:7px;border-radius:50%;background:#93c5fd;animation:gsd 1.2s infinite}#gsov .w i:nth-child(2){animation-delay:.2s}#gsov .w i:nth-child(3){animation-delay:.4s}
@keyframes gsin{from{opacity:0}to{opacity:1}}@keyframes gsb{50%{transform:translateY(-6px) rotate(-4deg)}}@keyframes gsd{50%{opacity:.25;transform:scale(.7)}}
#gstoast{position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:9998;background:#fff;border-radius:16px;padding:12px 18px;font-size:18px;box-shadow:0 8px 30px rgba(0,0,0,.2);direction:rtl;animation:gsin .3s ease}`;
    document.head.appendChild(s)}
  // בזמן ההודעה שום לחיצה, מגע או מקש לא עוברים לשיעור (גם לא כדי לסגור אותה).
  const eat=e=>{if(!busy)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()};
  ['pointerdown','pointerup','touchstart','touchend','mousedown','mouseup','click','keydown','keyup'].forEach(t=>window.addEventListener(t,eat,{capture:true,passive:false}));
  function play(f,done){const c=CL[f];let fin=false;const end=()=>{if(fin)return;fin=true;clearTimeout(tm);done&&done()};
    let tm=setTimeout(end,(c.d+2.5)*1000);// גיבוי: אם השמע לא נטען, ההודעה נשארת בערך כאורך ההקלטה
    try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
    try{const a=load(c.f);a.currentTime=0;a.onended=()=>setTimeout(end,500);const p=a.play();if(p&&p.catch)p.catch(()=>{})}catch(e){}}
  function show(lock,redo){css();busy=true;try{cfg.stop&&cfg.stop()}catch(e){}try{speechSynthesis.cancel()}catch(e){}
    const o=document.createElement('div');o.id='gsov';
    o.innerHTML=`<div class="c"><div class="e">${lock?'🤗':'🤔'}</div><h2>${lock?'שוב יש פה ניחושים':'רגע, לא מנחשים'}</h2>`+
      (lock?`<p>בינתיים אין פרסים.</p><p>כשעונים במחשבה, בלי לנחש, הפרסים חוזרים.</p><div class="s">עוד ${st.need} תשובות נכונות במחשבה</div>`
           :`<p>מקשיבים עד הסוף, חושבים, ורק אז עונים.</p><p>פרסים מקבלים רק כשבאמת יודעים.</p>`)+`<div class="w"><i></i><i></i><i></i></div></div>`;
    document.body.appendChild(o);
    play(lock?'g2':'g1',()=>{o.remove();busy=false;H=[];early=0;aud=false;t0=Date.now();redo&&redo()})}
  function toast(t){css();const d=document.createElement('div');d.id='gstoast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2600)}
  const S={
    init(kid,app,o){K='study_gs_'+kid+'_'+app;Object.assign(cfg,o||{});st=Object.assign({w:0,at:0,lock:0,need:0,tot:0},LS.get(K)||{});
      if(!st.lock&&st.at&&Date.now()-st.at>30*60e3)st.w=0;Object.keys(CL).forEach(k=>load(CL[k].f));
      if(window.StudyTrack&&!StudyTrack._gs){StudyTrack._gs=1;const r=StudyTrack.report;StudyTrack.report=function(d){d=d||{};d.gs=st.tot;d.gl=st.lock?1:0;return r.call(this,d)}}},
    q(o){t0=Date.now();aud=!!(o&&o.audio);early=0},
    heard(){if(aud){aud=false;t0=Date.now()}},
    tap(){early++},
    busy:()=>busy,
    chk(ok,redo){if(busy)return true;if(!st)return false;
      const ms=Date.now()-t0,rash=aud||early>0||ms<cfg.fast;early=0;
      H.push({ok:!!ok,rash});if(H.length>WIN)H.shift();
      if(rash&&H.filter(x=>!x.ok&&x.rash).length>=LIM){
        if(!st.lock&&st.at&&Date.now()-st.at>30*60e3)st.w=0;
        st.w++;st.tot++;st.at=Date.now();if(st.w>=2){st.lock=1;st.need=NEED}save();
        show(!!st.lock,redo);return true}
      if(st.lock&&ok&&!rash){st.need--;if(st.need<=0){st.lock=0;st.need=0;st.w=0;play('g3');toast('🎁 הפרסים חזרו!')}save()}
      t0=Date.now();return false},
    reward:()=>!(st&&st.lock),
    stat:()=>st?{gs:st.tot,gl:st.lock?1:0,need:st.need}:null
  };
  window.StudyGuess=S;
})();
