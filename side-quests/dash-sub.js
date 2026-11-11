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

/* 15.3 (Oren 11.11.2026): "🆕 מה חדש" inside the dashboard body, right under the title (header.hero), one clear summary box.
   The app sends the items (sq-news) when it opens the dashboard; standalone nothing shows. Kept in place if the page re-renders. */
(function(){if(window.self===window.top)return;
  var data=null,box=null;
  function el(t,c,txt){var e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e;}
  function css(){if(document.getElementById("sqnws-css"))return;var st=el("style");st.id="sqnws-css";st.textContent=
    ".sqnws{--nb:#2F7BEA;box-sizing:border-box;width:calc(100% - 28px);max-width:860px;margin:14px auto 4px;background:#EEF4FE;color:#14213A;border:1.5px solid #9DBDF3;border-radius:16px;padding:12px 14px 10px;box-shadow:0 2px 10px rgba(47,123,234,.14);font-family:inherit;direction:rtl;text-align:right;animation:sqnwsIn .25s ease-out;position:relative;z-index:2}"+
    "@keyframes sqnwsIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}"+
    ".sqnws .h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}.sqnws .h b{font-size:17px;font-weight:800}.sqnws .h small{font-size:13px;color:#4D5B75}"+
    ".sqnws .h button{margin-inline-start:auto;border:1.5px solid #9DBDF3;background:transparent;color:inherit;border-radius:999px;font:inherit;font-size:13px;font-weight:700;padding:2px 12px;min-height:30px;cursor:pointer}"+
    ".sqnws ul{list-style:none;margin:0;padding:0}.sqnws li{display:grid;grid-template-columns:1fr auto;column-gap:10px;padding:7px 0;border-top:1px solid #CFDDF7;font-size:14.5px;line-height:1.4}"+
    ".sqnws li .t{grid-column:1;font-weight:800}.sqnws li .w{grid-column:1}.sqnws li .a{grid-column:2;grid-row:1;font-size:12px;color:#4D5B75;white-space:nowrap}.sqnws .m{font-size:13px;color:#4D5B75;padding-top:4px}"+
    "@media (prefers-color-scheme:dark){.sqnws{background:#16233A;color:#E6EDF9;border-color:#3A5C94;box-shadow:none}.sqnws .h small,.sqnws li .a,.sqnws .m{color:#A3B3CF}.sqnws li{border-top-color:#2B4269}.sqnws .h button{border-color:#3A5C94}}"+
    "@media (prefers-reduced-motion:reduce){.sqnws{animation:none}}";
    document.head.appendChild(st);}
  function build(){box=el("section","sqnws");box.setAttribute("role","status");var h=el("div","h");h.appendChild(el("b",null,"🆕 מה חדש"));
    var n=data.items.length+(data.more||0);h.appendChild(el("small",null,(n===1?"עדכון אחד":n+" עדכונים")+" מאז הפעם הקודמת"));
    var x=el("button",null,"✓ הבנתי");x.type="button";x.onclick=function(){data=null;if(box)box.remove();box=null;};h.appendChild(x);box.appendChild(h);
    var ul=el("ul");data.items.forEach(function(it){var li=el("li");
      if(it.title)li.appendChild(el("span","t",it.title));if(it.what)li.appendChild(el("span",it.title?"w":"t",it.what));
      if(it.ago)li.appendChild(el("span","a",it.ago));ul.appendChild(li);});box.appendChild(ul);
    if(data.more)box.appendChild(el("div","m","ועוד "+data.more));}
  function place(){if(!data||!document.body)return;var hero=document.querySelector("header.hero")||document.querySelector(".hero");
    if(!box){css();build();}
    if(hero&&hero.parentNode){if(hero.nextSibling!==box)hero.parentNode.insertBefore(box,hero.nextSibling);}
    else if(box.parentNode!==document.body||document.body.firstChild!==box)document.body.insertBefore(box,document.body.firstChild);}
  addEventListener("message",function(e){if(e.source!==parent||!e.data||e.data.type!=="sq-news"||!Array.isArray(e.data.items))return;
    if(data)return;data={items:e.data.items.slice(0,10).map(function(i){return{title:String(i.title||"").slice(0,140),what:String(i.what||"").slice(0,240),ago:String(i.ago||"").slice(0,30)};}),more:+e.data.more||0};
    place();new MutationObserver(function(){if(data&&box&&!box.isConnected||data&&box&&box.previousElementSibling&&!box.previousElementSibling.classList.contains("hero"))place();}).observe(document.body,{childList:true});});
})();
