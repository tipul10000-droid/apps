// גרסה חדשה נטענת לבד (אורן 19.11.2026: "ביקשתי שינויים ואני לא רואה אותם").
// GitHub Pages שומר דפים במטמון עד 10 דקות, והאפליקציה במסך הבית נשארת פתוחה ברקע שעות.
// בכל טעינה ובכל חזרה לאפליקציה (אחרי 30 שניות ברקע) בודקים בשרת אם הדף התעדכן (Last-Modified מול document.lastModified).
// אם כן: מושכים את הגרסה החדשה למטמון (cache:'reload') וטוענים מחדש. לכל היותר פעם בדקה לכל דף, כדי שלא תהיה לולאה.
(function(){
  if(window.StudyFresh)return;window.StudyFresh=1;
  var mine=Date.parse(document.lastModified)||0,hid=0,busy=0,K='study_fresh_'+location.pathname;
  function check(){
    if(busy||!mine||!window.fetch)return;busy=1;
    var u=location.pathname+location.search;
    fetch(u,{cache:'no-store',method:'HEAD'}).then(function(r){
      var lm=Date.parse(r.headers.get('last-modified')||'')||0;
      if(!(r.ok&&lm>mine+2000)){busy=0;return}
      var last=0;try{last=+sessionStorage.getItem(K)||0}catch(e){}
      if(Date.now()-last<60000){busy=0;return}
      try{sessionStorage.setItem(K,String(Date.now()))}catch(e){}
      return fetch(u,{cache:'reload'}).then(function(){location.reload()})
    }).catch(function(){busy=0})}
  if(document.readyState==='complete')setTimeout(check,400);else addEventListener('load',function(){setTimeout(check,400)});
  document.addEventListener('visibilitychange',function(){if(document.hidden){hid=Date.now();return}if(hid&&Date.now()-hid>30000)check()});
  addEventListener('pageshow',function(e){if(e.persisted)check()});
})();
