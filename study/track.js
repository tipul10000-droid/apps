// מעקב התקדמות ל-study: זמן פעילות + דיווח לאזור ההורים (Supabase, פונקציה study_report).
// שימוש: StudyTrack.init('dani','spelling'); StudyTrack.report({...נתוני האפליקציה});
// מפתחות מקומיים: study_dev (זהות המכשיר), study_t_<kid>_<app> (זמן), study_r_<kid>_<app> (הדיווח האחרון).
(function(){
  var SB_URL='https://emgtyfksnofzzlutngbf.supabase.co',SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZ3R5Zmtzbm9menpsdXRuZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDI0MTMsImV4cCI6MjEwNjgxODQxM30.b7XE-gbCUlXMqpza1Bn9GvMKQsmu3jKP2eqZ0r4-k2k';
  function get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}
  function set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function rid(){var a=new Uint8Array(16);crypto.getRandomValues(a);return Array.from(a,function(b){return('0'+b.toString(16)).slice(-2)}).join('')}
  function uuid(){if(crypto.randomUUID)return crypto.randomUUID();var h=rid();return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20)}
  function today(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
  var kid,app,T,data={},lastAct=Date.now(),dirty=false,timer=null;
  function dev(){var d=get('study_dev');if(!d||!d.id||!d.token){d={id:uuid(),token:rid()+rid()};set('study_dev',d)}return d}
  function payload(){var days={},ks=Object.keys(T.days).sort().slice(-60);ks.forEach(function(k){days[k]=T.days[k]});
    var o={};for(var k in data)o[k]=data[k];o.first=T.first;o.sec=T.sec;o.last=T.last;o.days=days;o.v=1;return o}
  function send(keep){var d=dev(),p=payload();set('study_r_'+kid+'_'+app,{at:new Date().toISOString(),data:p});dirty=false;
    try{fetch(SB_URL+'/rest/v1/rpc/study_report',{method:'POST',keepalive:!!keep,headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},
      body:JSON.stringify({p_device:d.id,p_token:d.token,p_kid:kid,p_app:app,p_data:p})}).catch(function(){})}catch(e){}}
  function later(){dirty=true;clearTimeout(timer);timer=setTimeout(function(){send(false)},4000)}
  function act(){lastAct=Date.now()}
  window.StudyTrack={
    init:function(k,a){kid=k;app=a;var key='study_t_'+k+'_'+a;T=get(key)||{first:new Date().toISOString(),sec:0,days:{}};T.days=T.days||{};
      ['pointerdown','keydown','touchstart'].forEach(function(e){addEventListener(e,act,{passive:true})});
      setInterval(function(){if(document.visibilityState!=='visible'||Date.now()-lastAct>60000)return;T.sec+=5;var t=today();T.days[t]=(T.days[t]||0)+5;T.last=new Date().toISOString();set(key,T);dirty=true},5000);
      setInterval(function(){if(dirty)send(false)},60000);
      addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&dirty)send(true)});
      addEventListener('pagehide',function(){if(dirty)send(true)});
      T.last=new Date().toISOString();set(key,T)},
    report:function(o){data=o||{};later()},
    test:function(cb){try{fetch(SB_URL+'/rest/v1/rpc/study_test_get',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify({p_kid:kid,p_app:app})}).then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&j.d)cb(j)}).catch(function(){})}catch(e){}}
  };
})();
