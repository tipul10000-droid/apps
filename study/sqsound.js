// צליל מצחיק ושונה לכל סקווישי (אורן 6.11.2026): כל מזהה = צליל אחר לגמרי, בלי חזרות (WebAudio), ובערבוב גם צלילים מוקלטים (sqfx, למטה).
// דני: peach cat avo(הפלוץ היחיד) panda donut mochi + s_kimbap s_tteok s_bingsu s_dalgona s_melona s_choco
// ליה: rocket pizza ufo moon toast comet + s_sun s_saturn s_alien s_taco s_galaxy s_sushi
// לביא ושילה (9.11.2026; שילה = כלי עבודה מ-10.11): lv_* ו-sh_* (18 לכל אחד, כולל האולטרה). האולטרה שלהם תמיד מנגנים את הצליל שלהם, בלי ערבוב הקלטות.
// שימוש: <script src="../../sqsound.js"></script>  SqSound.play(id, muted)
(function(){
  var AC=null;
  function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
  // מתנד עם מסלול תדר, מעטפת, פילטר וויברטו
  function osc(type,t0,d,pts,vol,lp,lfo,q){var a=AC,T=a.currentTime+t0,o=a.createOscillator(),g=a.createGain();o.type=type;
    o.frequency.setValueAtTime(pts[0][1],T);for(var i=1;i<pts.length;i++)o.frequency.linearRampToValueAtTime(pts[i][1],T+pts[i][0]*d);
    if(lfo){var l=a.createOscillator(),lg=a.createGain();l.type=lfo[2]||'sine';l.frequency.value=lfo[0];lg.gain.value=lfo[1];l.connect(lg);lg.connect(o.frequency);l.start(T);l.stop(T+d+.05)}
    g.gain.setValueAtTime(0,T);g.gain.linearRampToValueAtTime(vol,T+.012);g.gain.setValueAtTime(vol,T+d*.75);g.gain.linearRampToValueAtTime(0,T+d);
    var n=o;if(lp){var f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;if(q)f.Q.value=q;o.connect(f);n=f}n.connect(g);g.connect(a.destination);o.start(T);o.stop(T+d+.03)}
  // רעש (פלוץ, קראנץ׳, ששש) עם פילטר שזז
  function noise(t0,d,vol,type,f0,f1,q,am){var a=AC,T=a.currentTime+t0,b=a.createBuffer(1,Math.ceil(a.sampleRate*d),a.sampleRate),x=b.getChannelData(0);for(var i=0;i<x.length;i++)x[i]=Math.random()*2-1;
    var s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=b;f.type=type||'lowpass';f.frequency.setValueAtTime(f0,T);f.frequency.linearRampToValueAtTime(f1||f0,T+d);if(q)f.Q.value=q;
    g.gain.setValueAtTime(vol,T);g.gain.setValueAtTime(vol,T+d*.7);g.gain.linearRampToValueAtTime(0,T+d);
    if(am){var l=a.createOscillator(),lg=a.createGain();l.type='square';l.frequency.value=am;lg.gain.value=vol*.9;l.connect(lg);lg.connect(g.gain);l.start(T);l.stop(T+d)}
    s.connect(f);f.connect(g);g.connect(a.destination);s.start(T)}
  function beep(t,f,d,v,type){osc(type||'sine',t,d,[[0,f],[1,f]],v||.15)}
  var S={
  // ---- דני: להקת המאכלים ----
  peach:function(){osc('sine',0,.5,[[0,160],[.25,700],[.55,230],[1,460]],.32,0,[16,70])},// בוינג של קפיץ
  cat:function(){osc('sawtooth',0,.6,[[0,480],[.3,900],[.65,780],[1,420]],.16,1800,[5,12],6)},// מיאו
  avo:function(){osc('sawtooth',0,.85,[[0,92],[.3,110],[.6,78],[1,58]],.32,320,[26,30,'square'],4);noise(0,.85,.22,'bandpass',260,140,2.5,26)},// פלוץ רטוב וארוך
  panda:function(){osc('sawtooth',0,.55,[[0,135],[.35,110],[1,68]],.34,650,[11,18],3);noise(0,.4,.08,'lowpass',500)},// גרפס של דוב
  donut:function(){for(var i=0;i<6;i++)osc('triangle',i*.1,.09,[[0,820+i*70],[.5,1150+i*70],[1,900+i*70]],.16)},// צחקוק קטן
  mochi:function(){osc('sawtooth',0,.7,[[0,85],[.3,150],[.7,120],[1,70]],.3,500,[34,28,'square'],5)},// נהמת מפלצת
  // ---- דני: סופר סקווישים ----
  s_kimbap:function(){osc('sine',0,.9,[[0,350],[.45,1500],[1,300]],.24)},// שריקת מגלשה למעלה ולמטה
  s_tteok:function(){beep(0,1250,.07,.16,'square');beep(.1,1500,.07,.16,'square');osc('square',.22,.18,[[0,1600],[1,900]],.14,2600)},// ברווזון גומי: קוואק קוואק
  s_bingsu:function(){osc('sine',0,.9,[[0,220],[1,200]],.22,0,[22,40]);noise(0,.9,.08,'highpass',3000,3000,0,22)},// ררררר קר! רעד
  s_dalgona:function(){noise(0,.06,.35,'highpass',2500);noise(.08,.05,.3,'highpass',3000);[523,659,784,1047].forEach(function(f,i){beep(.2+i*.09,f,.12,.13,'triangle')})},// קראק ואז טה-דה
  s_melona:function(){osc('sawtooth',0,.35,[[0,392],[1,370]],.16,1400,[6,8]);osc('sawtooth',.38,.35,[[0,370],[1,349]],.16,1400,[6,8]);osc('sawtooth',.76,.8,[[0,349],[1,262]],.16,1200,[7,14])},// קזו: וואה וואה וואאאה
  s_choco:function(){[0,.17,.34].forEach(function(t,i){osc('sine',t,.13,[[0,330-i*20],[.5,190],[1,240]],.3,900)});osc('triangle',.55,.8,[[0,210],[.5,250],[1,300]],.24,1500,[5,10])},// נום נום נום... ממממ! (אוכלת עוגייה)
  // ---- ליה: אוכל וחלל ----
  rocket:function(){[0,.25,.5].forEach(function(t,i){beep(t,880-i*110,.12,.12)});noise(.75,1,.3,'lowpass',300,4000);osc('sawtooth',.75,1,[[0,60],[1,600]],.12,900)},// 3, 2, 1 המראה!
  pizza:function(){osc('sine',0,.45,[[0,600],[.5,300],[1,620]],.22,0,[8,60]);osc('sine',.48,.5,[[0,620],[1,250]],.22,0,[8,60])},// מאמא מיה! וואו-וואו
  ufo:function(){osc('sine',0,1.2,[[0,700],[.3,1100],[.6,500],[1,900]],.2,0,[7,120])},// עב״ם: אוווווו־איייי
  moon:function(){osc('triangle',0,1.1,[[0,520],[.3,620],[1,180]],.22,1200)},// פיהוק מנומנם
  toast:function(){noise(0,.12,.3,'bandpass',900,600,3);osc('sine',.2,.9,[[0,1568],[1,1568]],.18);osc('sine',.2,.9,[[0,2093],[1,2093]],.06)},// טוסטר: קפיצה ודינג
  comet:function(){for(var i=0;i<10;i++)beep(i*.06,2400-i*150,.08,.09,'triangle');noise(0,.7,.06,'highpass',6000,2000)},// נצנוצים שנופלים
  // ---- ליה: סופר סקווישים ----
  s_sun:function(){noise(0,1,.16,'highpass',4000,2500);osc('sine',.1,.8,[[0,300],[1,900]],.12,0,[3,30])},// ששששש של אבטיח רותח
  s_saturn:function(){osc('triangle',0,1.1,[[0,250],[.25,500],[.5,250],[.75,500],[1,250]],.22,0,[14,25])},// סחרחורת של טבעות
  s_alien:function(){[1200,700,1500,900,1800,600,1300].forEach(function(f,i){beep(i*.07,f,.06,.13,'square')})},// דיבור חייזרי מהיר
  s_taco:function(){for(var i=0;i<5;i++)noise(i*.09,.07,.3,'bandpass',1800-i*150,1200,1.5)},// קראנץ׳ קראנץ׳
  s_galaxy:function(){for(var i=0;i<7;i++){var t=i*.11+Math.random()*.05;noise(t,.04,.35,'bandpass',1400+Math.random()*900,900,4);beep(t,300+Math.random()*200,.05,.1)}},// פופקורן מתפוצץ
  s_sushi:function(){[[523,.0],[784,.15],[659,.3],[1047,.45]].forEach(function(p){beep(p[1],p[0],.11,.14,'square')});osc('square',.62,.3,[[0,200],[1,1600]],.09,2000)},// ביפ בופ של לווין
  // ---- לביא: לגו + ישראל + תאילנד (9.11.2026) ----
  lv_dreidel:function(){osc('square',0,1.1,[[0,520],[.5,420],[1,160]],.1,1400,[18,90]);osc('sine',0,1.1,[[0,1040],[1,320]],.06,0,[18,140])},// סביבון מסתובב ומאט
  lv_falafel:function(){noise(0,.9,.12,'highpass',3500,5000,0,0);for(var i=0;i<9;i++)noise(Math.random()*.8,.02,.3,'bandpass',2500+Math.random()*2500,2000,6);osc('sine',.85,.12,[[0,300],[1,900]],.22)},// טיגון שששש ופופ
  lv_tuktuk:function(){osc('square',0,.7,[[0,70],[1,74]],.16,500,[22,0],2);noise(0,.7,.12,'lowpass',400,300,1,22);beep(.75,660,.1,.14,'square');beep(.9,660,.12,.14,'square')},// מנוע טוק טוק וצופר
  lv_sufgania:function(){noise(0,.18,.35,'lowpass',1800,250,2);osc('sine',0,.35,[[0,500],[1,90]],.25);noise(.25,.25,.15,'bandpass',600,300,3,14)},// ספלאט של ריבה
  lv_elephant:function(){osc('sawtooth',0,.9,[[0,300],[.2,620],[.6,700],[1,520]],.2,2200,[7,30],4);osc('square',0,.9,[[0,600],[.2,1240],[1,1040]],.05,3000)},// תרועת פיל
  lv_sabra:function(){[0,.09,.18].forEach(function(t,i){osc('square',t,.07,[[0,1800+i*300],[1,2600+i*300]],.1)});osc('triangle',.32,.4,[[0,900],[.3,1300],[1,500]],.2)},// אאוץ׳! עקיצות
  lv_s_shofar:function(){osc('sawtooth',0,1.4,[[0,233],[.08,233],[.85,240],[1,350]],.18,1600,[5,4],3);osc('sawtooth',0,1.4,[[0,466],[.85,480],[1,700]],.05,2400)},// תקיעה של שופר
  lv_s_menorah:function(){[523,587,659,698,784,880,988,1047,1175].forEach(function(f,i){beep(i*.08,f,.25,.09,'triangle')})},// 9 נרות נדלקים
  lv_s_padthai:function(){for(var i=0;i<3;i++)noise(i*.28,.24,.22,'bandpass',500,3000,4);osc('sine',.9,.15,[[0,800],[1,300]],.2)},// סְלֶרְרְפּ של אטריות
  lv_s_star:function(){for(var i=0;i<8;i++)beep(i*.07+Math.random()*.03,1800+Math.random()*1600,.1,.07,'sine');osc('sine',.6,.6,[[0,2093],[1,2093]],.08,0,[6,30])},// ניצוצות של כוכב
  lv_s_hummus:function(){[0,.15,.27,.45,.56].forEach(function(t,i){osc('sine',t,.12,[[0,380-i*30],[1,140]],.24)})},// בלוב בלוב של חומוס סמיך
  lv_s_mango:function(){noise(0,.15,.25,'lowpass',900,300,2);osc('sine',.18,.9,[[0,180],[.5,230],[1,170]],.24,0,[5,10])},// סקוויש ו-מממממ
  lv_u_lion:function(){noise(0,1.2,.3,'lowpass',300,1400,3,30);osc('sawtooth',0,1.2,[[0,90],[.3,140],[1,70]],.28,700,[30,20,'square'],3)},// שאגת אריה
  lv_u_bamba:function(){for(var i=0;i<6;i++)noise(i*.12,.07,.32,'highpass',2000+i*200,1500);for(var j=0;j<5;j++)osc('triangle',.8+j*.09,.08,[[0,900+j*90],[.5,1250+j*90],[1,950+j*90]],.14)},// קראנץ׳ קראנץ׳ וצחקוק
  lv_u_plane:function(){beep(0,784,.35,.14,'sine');beep(.35,622,.5,.14,'sine');noise(.9,1.2,.25,'bandpass',400,2400,1.5);osc('sawtooth',.9,1.2,[[0,180],[.5,260],[1,120]],.08,900)},// דינג-דונג וטיסה
  lv_u_boat:function(){osc('square',0,1,[[0,55],[1,60]],.14,380,[16,0],2);noise(0,1,.1,'lowpass',500,300,1,16);noise(1,.5,.22,'highpass',1200,600)},// מנוע של סירה ושפריץ
  lv_u_matkot:function(){[0,.42,.74,.98,1.16,1.3,1.4].forEach(function(t){noise(t,.03,.4,'bandpass',1500,1500,3);beep(t,1100,.04,.12,'triangle')})},// טוק טוק טוק מאיץ
  lv_u_camel:function(){osc('sawtooth',0,1,[[0,140],[.2,90],[.5,160],[.8,80],[1,60]],.26,600,[9,25],4);noise(.2,.5,.12,'lowpass',400,200,2,40)},// נחרת גמל
  // ---- שילה: לגו + ישראל + תאילנד (9.11.2026) ----
  sh_hammer:function(){[0,.22,.44].forEach(function(t){noise(t,.04,.5,'bandpass',900,900,3);osc('sine',t,.12,[[0,320],[1,140]],.3)})},// טוק טוק טוק של פטיש
  sh_screw:function(){osc('sawtooth',0,.7,[[0,500],[1,1500]],.12,2600,[22,80]);noise(0,.7,.08,'highpass',3000,5000,2)},// זִזִזִיק בורג מסתובב
  sh_wrench:function(){[[0,1250],[0,1890],[.18,980],[.18,1470]].forEach(function(p){osc('triangle',p[0],.5,[[0,p[1]],[1,p[1]*.98]],.12)});noise(0,.03,.4,'highpass',2500)},// קלנג! מתכת
  sh_tape:function(){noise(0,.45,.25,'bandpass',2200,600,2,40);osc('square',.45,.05,[[0,400],[1,300]],.2,1500)},// זיפ וקליק
  sh_roller:function(){[0,.3].forEach(function(t){noise(t,.2,.35,'lowpass',700,250,1);osc('sine',t,.18,[[0,200],[1,90]],.2)})},// פלופ פלופ
  sh_pliers:function(){noise(0,.03,.45,'highpass',3500);noise(.15,.03,.45,'highpass',2600);osc('triangle',.3,.25,[[0,900],[.5,1300],[1,1000]],.15)},// קליק-קלק וצחקוק
  sh_s_saw:function(){for(var i=0;i<4;i++)noise(i*.22,.2,.28,'bandpass',i%2?1800:2600,i%2?2600:1800,4,30)},// זזז-זזז הלוך ושוב
  sh_s_drill:function(){osc('sawtooth',0,.9,[[0,180],[.2,620],[.8,640],[1,200]],.16,1800,[45,30]);noise(0,.9,.06,'bandpass',1500,2500,2)},// ורררם
  sh_s_level:function(){osc('sine',0,.18,[[0,300],[1,900]],.28);osc('sine',.25,.12,[[0,500],[1,1300]],.2)},// בלוב! בועה
  sh_s_helmet:function(){[0,.18].forEach(function(t){noise(t,.04,.45,'bandpass',600,600,2);osc('sine',t,.2,[[0,700],[1,520]],.18)});osc('triangle',.45,.3,[[0,600],[1,900]],.12)},// נוק נוק ומי שם?
  sh_s_box:function(){for(var i=0;i<12;i++){var t=i*.06+Math.random()*.02;noise(t,.03,.25,'bandpass',1500+Math.random()*3000,2000,6);if(i%3==0)beep(t,2000+Math.random()*1500,.05,.06,'triangle')}},// טרח-טרח כלים בארגז
  sh_s_ladder:function(){[523,587,659,698,784,880].forEach(function(f,i){beep(i*.1,f,.09,.14,'triangle');noise(i*.1,.02,.2,'bandpass',800,800,3)})},// טי-טה עולים בסולם
  sh_u_digger:function(){osc('sawtooth',0,.7,[[0,60],[1,70]],.16,400,[14,8]);[.8,1.15,1.5].forEach(function(t){beep(t,1050,.18,.16,'square')})},// מנוע וביפ ביפ ביפ
  sh_u_crane:function(){osc('sawtooth',0,.9,[[0,300],[.5,420],[1,330]],.08,1200,[7,40]);noise(1,.06,.5,'lowpass',500,200,2);osc('sine',1,.4,[[0,110],[1,60]],.3)},// חריק וטרח
  sh_u_mixer:function(){for(var i=0;i<5;i++)osc('sine',i*.22,.2,[[0,180],[.5,260],[1,160]],.22,0,[12,30]);noise(0,1.1,.12,'lowpass',400,300,1,5)},// גלו-גלו מערבל
  sh_u_jack:function(){for(var i=0;i<14;i++){noise(i*.07,.03,.4,'bandpass',800,800,2);osc('square',i*.07,.03,[[0,90],[1,70]],.12,800)}},// טה-טה-טה פטיש אוויר
  sh_u_robot:function(){[880,440,1320,660,990,330,1760].forEach(function(f,i){beep(i*.09,f,.07,.12,'square')});osc('sine',.7,.4,[[0,200],[1,1200]],.12)},// ביפ-בופ-ביפ
  sh_u_tractor:function(){osc('sawtooth',0,.6,[[0,50],[1,56]],.18,350,[10,6]);osc('square',.7,.25,[[0,392],[1,392]],.14,1800);osc('square',1,.45,[[0,392],[1,392]],.14,1800)},// מנוע וטוט-טוט
  };
  // צלילים מוקלטים מהאינטרנט (אורן 6.11.2026): 15 צלילים מצחיקים ב-CC0 מ-Freesound (study/sqfx, קרדיטים ב-sqfx/CREDITS.txt).
  // לכל אולטרה סקווישי צליל מוקלט משלו (ULT). לסקווישים הישנים: לפעמים הצליל שלהם, ולפעמים צליל מוקלט אקראי (ערבוב).
  var BASE=((document.currentScript&&document.currentScript.src)||'').replace(/sqsound\.js.*$/,'')+'sqfx/';
  var POOL=['f_wet','f_tiny','f_three','b_burp','b_loud','v_omg','v_omg2','v_wow','v_yay','c_boing','c_squeak','c_fall','c_dizzy','c_kiss','c_blbl','v_faaa','v_faaa','v_aaah','v_woui','v_scream'];
  var ULT={u_ramyeon:'v_omg',u_hotteok:'c_boing',u_bungeo:'c_kiss',u_corndog:'b_burp',u_mandu:'f_wet',u_banana:'v_wow',
    u_hole:'c_fall',u_astro:'v_yay',u_donut:'c_squeak',u_meteor:'b_loud',u_robot:'c_dizzy',u_starfruit:'f_three'};
  // בלי דיליי (אורן 7.11.2026): כל ההקלטות נטענות מראש לזיכרון (WebAudio) במגע הראשון בדף, ומתנגנות מיד ובלי השקט שבתחילת הקובץ.
  // עד שהן נטענות (או אם אין WebAudio) מנגנים כמו קודם עם Audio.
  var CUR=null,SRC=null,LAST=null,BUF={},PRE=false;
  function names(){var o={};POOL.forEach(function(n){o[n]=1});for(var k in ULT)o[ULT[k]]=1;return Object.keys(o)}
  function lead(b){var x=b.getChannelData(0),r=b.sampleRate,i=0;while(i<x.length&&Math.abs(x[i])<.02)i++;return Math.max(0,i/r-.01)}
  function preload(){if(PRE||!ac()||!window.fetch)return;PRE=true;
    names().forEach(function(n){fetch(BASE+n+'.mp3').then(function(r){return r.arrayBuffer()}).then(function(ab){
      AC.decodeAudioData(ab,function(b){BUF[n]={b:b,o:lead(b)}},function(){})}).catch(function(){})})}
  function unlock(){try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}ac();preload()}
  ['touchend','pointerdown','click','keydown'].forEach(function(ev){document.addEventListener(ev,unlock,{capture:true,passive:true})});
  function stop(){try{if(CUR)CUR.pause()}catch(e){}try{if(SRC)SRC.stop()}catch(e){}CUR=SRC=null}
  function file(n){stop();var B=BUF[n];
    if(B&&ac()){try{var s=AC.createBufferSource(),g=AC.createGain();g.gain.value=.9;s.buffer=B.b;s.connect(g);g.connect(AC.destination);s.start(0,B.o);SRC=s;return}catch(e){}}
    preload();try{CUR=new Audio(BASE+n+'.mp3');CUR.volume=.9;var p=CUR.play();if(p&&p.catch)p.catch(function(){})}catch(e){}}
  function mix(){var n;do{n=POOL[Math.floor(Math.random()*POOL.length)]}while(n===LAST&&POOL.length>1);LAST=n;return n}
  window.SqSound={has:function(id){return !!(S[id]||ULT[id])},ids:Object.keys(S).concat(Object.keys(ULT)),
    play:function(id,muted){if(muted)return false;if(ULT[id]){file(ULT[id]);return true}if(!S[id]||!ac())return false;
      if(!/^(lv|sh)_u_/.test(id)&&Math.random()<.45){file(mix());return true}try{S[id]()}catch(e){}return true}};
})();
