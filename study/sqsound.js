// צליל מצחיק ושונה לכל סקווישי (אורן 6.11.2026): כל מזהה = צליל אחר לגמרי, בלי חזרות. WebAudio בלבד, בלי קבצים.
// דני: peach cat avo(הפלוץ היחיד) panda donut mochi + s_kimbap s_tteok s_bingsu s_dalgona s_melona s_choco
// ליה: rocket pizza ufo moon toast comet + s_sun s_saturn s_alien s_taco s_galaxy s_sushi
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
  s_sushi:function(){[[523,.0],[784,.15],[659,.3],[1047,.45]].forEach(function(p){beep(p[1],p[0],.11,.14,'square')});osc('square',.62,.3,[[0,200],[1,1600]],.09,2000)}// ביפ בופ של לווין
  };
  window.SqSound={has:function(id){return !!S[id]},ids:Object.keys(S),play:function(id,muted){if(muted||!ac()||!S[id])return false;try{S[id]()}catch(e){}return true}};
})();
