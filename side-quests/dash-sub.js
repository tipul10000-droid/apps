/* 12.8 (Oren 7.11.2026): one dynamic back in every dashboard. Inside the Side Quests app (frame) the app bar's back is the
   only back: on a sub view (a product, a recipe, a hub) it shows the page's own sub back (e.g. "🛍️ כל הקניות") and goes one
   step back inside the page; on the dashboard's home it says Side Quests and closes the dashboard.
   Generic: watches the page for a `.hero .sqsub` button and tells the app (postMessage sq-sub); the app asks back with sq-back,
   and this clicks that button. Standalone (outside the app) nothing changes: the page's own buttons stay. */
(function(){if(window.self===window.top)return;
  var last=null;
  function sub(){return document.querySelector(".hero .sqsub");}
  function send(){var b=sub(),m;
    if(b){var sp=b.querySelectorAll("span"),em=b.querySelector(".em");m={label:(sp.length?sp[sp.length-1].textContent:b.textContent).trim(),icon:em?em.textContent.trim():""};}
    var k=JSON.stringify(m||null);if(k===last)return;last=k;
    try{parent.postMessage({type:"sq-sub",sub:m||null},"*");}catch(e){}}
  addEventListener("message",function(e){if(e.source!==parent||!e.data||e.data.type!=="sq-back")return;var b=sub();if(b)b.click();else send();});
  function start(){send();new MutationObserver(send).observe(document.body,{childList:true,subtree:true});}
  if(document.body)start();else addEventListener("DOMContentLoaded",start);
  addEventListener("hashchange",function(){setTimeout(send,0);});
})();
