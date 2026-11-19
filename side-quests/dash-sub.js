/* 12.8 (Oren 7.11.2026): one dynamic back in every dashboard. Inside the Side Quests app (frame) the app bar's back is the
   only back: on a sub view (a product, a recipe, a hub) it shows the page's own sub back (e.g. "🛍️ כל הקניות") and goes one
   step back inside the page; on the dashboard's home it says Side Quests and closes the dashboard.
   Generic: watches the page for a `.hero .sqsub` button and tells the app (postMessage sq-sub); the app asks back with sq-back,
   and this clicks that button. Standalone (outside the app) nothing changes: the page's own buttons stay. */
(function(){if(window.self===window.top)return;
  var last=null;
  function sub(){return document.querySelector(".hero .sqsub");}
  function send(){var b=sub(),m;
    if(b){var sp=b.querySelectorAll("span"),em=b.querySelector(".em");m={label:(sp.length?sp[sp.length-1].textContent:b.textContent).trim(),icon:em?em.textContent.trim():""};
      /* 16.11: a sub view may name itself and its own chat (data-title / data-chat on the back button), shown in the app bar */
      if(b.dataset.title)m.title=b.dataset.title;if(b.dataset.chat)m.chat=b.dataset.chat;}
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
    ".sqnws li.go{cursor:pointer;-webkit-tap-highlight-color:transparent}.sqnws li.go:active{background:rgba(47,123,234,.1)}.sqnws li.go .t::after{content:\" ‹\";color:#2F7BEA;font-weight:800}"+
    "@media (prefers-reduced-motion:reduce){.sqnws{animation:none}}";
    document.head.appendChild(st);}
  function build(){box=el("section","sqnws");box.setAttribute("role","status");var h=el("div","h");h.appendChild(el("b",null,"🆕 מה חדש"));
    var n=data.items.length+(data.more||0);h.appendChild(el("small",null,(n===1?"עדכון אחד":n+" עדכונים")+" מאז הפעם הקודמת"));
    var x=el("button",null,"✓ הבנתי");x.type="button";x.onclick=function(){data=null;if(box)box.remove();box=null;};h.appendChild(x);box.appendChild(h);
    var ul=el("ul");data.items.forEach(function(it){var li=el("li");
      /* 20.3: an item about a task = tap opens that task in the app (sq-task) */
      if(it.tid){li.className="go";li.setAttribute("role","button");li.tabIndex=0;li.onclick=function(){try{parent.postMessage({type:"sq-task",id:it.tid},"*");}catch(e){}};}
      if(it.title)li.appendChild(el("span","t",it.title));if(it.what)li.appendChild(el("span",it.title?"w":"t",it.what));
      if(it.ago)li.appendChild(el("span","a",it.ago));ul.appendChild(li);});box.appendChild(ul);
    if(data.more)box.appendChild(el("div","m","ועוד "+data.more));}
  function place(){if(!data||!document.body)return;var hero=document.querySelector(".sqtsk")||document.querySelector("header.hero")||document.querySelector(".hero");
    if(!box){css();build();}
    if(hero&&hero.parentNode){if(hero.nextSibling!==box)hero.parentNode.insertBefore(box,hero.nextSibling);}
    else if(box.parentNode!==document.body||document.body.firstChild!==box)document.body.insertBefore(box,document.body.firstChild);}
  addEventListener("message",function(e){if(e.source!==parent||!e.data||e.data.type!=="sq-news"||!Array.isArray(e.data.items))return;
    if(data)return;data={items:e.data.items.slice(0,10).map(function(i){return{title:String(i.title||"").slice(0,140),what:String(i.what||"").slice(0,240),ago:String(i.ago||"").slice(0,30),tid:String(i.tid||"").slice(0,120)};}),more:+e.data.more||0};
    place();new MutationObserver(function(){if(data&&box&&!box.isConnected||data&&box&&box.previousElementSibling&&!box.previousElementSibling.classList.contains("hero")&&!box.previousElementSibling.classList.contains("sqtsk"))place();}).observe(document.body,{childList:true});});
})();
/* 📦 archive folds (details.sqarch[data-k]): remember open/closed per page, restore after every re-render */
(function(){var P="sq_arch:"+location.pathname.split("/").pop()+":";
  function g(k){try{return localStorage.getItem(P+k)==="1";}catch(e){return false;}}
  function s(k,v){try{v?localStorage.setItem(P+k,"1"):localStorage.removeItem(P+k);}catch(e){}}
  document.addEventListener("toggle",function(e){var d=e.target;if(d&&d.matches&&d.matches("details.sqarch[data-k]"))s(d.dataset.k,d.open);},true);
  function fix(root){(root.querySelectorAll?root:document).querySelectorAll("details.sqarch[data-k]").forEach(function(d){if(d.dataset.r)return;d.dataset.r="1";if(g(d.dataset.k))d.open=true;});}
  function go(){fix(document);new MutationObserver(function(){fix(document);}).observe(document.body,{childList:true,subtree:true});}
  if(document.body)go();else document.addEventListener("DOMContentLoaded",go);
})();

/* 17.6 (Oren 16.11.2026): "📌 משימות פתוחות" first thing in the dashboard body, highlighted. The app sends the same tasks the
   dashboard tile counts (sq-tasks). Tap a task = it opens in the app over the dashboard (sq-task); the circle = done: green ✓
   for 5 s with "בטל", then sq-done. Nothing open = nothing shown (Oren 19.11.2026). The news box (above) sits right under this one. */
(function(){if(window.self===window.top)return;
  var data=null,box=null,pend={};
  function el(t,c,txt){var e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e;}
  function css(){if(document.getElementById("sqtsk-css"))return;var st=el("style");st.id="sqtsk-css";st.textContent=
    ".sqtsk{box-sizing:border-box;width:calc(100% - 28px);max-width:860px;margin:14px auto 4px;background:#FFF6E8;color:#2A1A05;border:2px solid #F0A43A;border-radius:16px;padding:12px 12px 6px;box-shadow:0 3px 14px rgba(240,140,30,.18);font-family:inherit;direction:rtl;text-align:right;position:relative;z-index:2;animation:sqtskIn .25s ease-out}"+
    ".sqtsk.urg{border-color:#E5484D;background:#FFF0F0;box-shadow:0 3px 14px rgba(229,72,77,.2)}"+
    ".sqtsk.none{border:1.5px solid #9FD8B8;background:#EEFAF3;color:#14462C;box-shadow:none;padding:9px 14px}"+
    "@keyframes sqtskIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}"+
    ".sqtsk .h{display:flex;align-items:center;gap:8px;margin-bottom:4px}.sqtsk .h b{font-size:17px;font-weight:800}.sqtsk .h .n{min-width:22px;height:22px;border-radius:11px;background:#F0A43A;color:#fff;font-size:13px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;padding:0 6px}.sqtsk.urg .h .n{background:#E5484D}"+
    ".sqtsk .ok{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:#22A06B;color:#fff;font-size:11px;font-weight:900;flex:none}"+
    ".sqtsk ul{list-style:none;margin:0;padding:0}.sqtsk li{display:flex;align-items:center;gap:10px;border-top:1px solid rgba(0,0,0,.09);min-height:48px}"+
    ".sqtsk .ck{flex:none;width:28px;height:28px;border-radius:50%;border:2px solid #22A06B;background:transparent;color:#fff;font:inherit;font-size:15px;font-weight:900;padding:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}"+
    ".sqtsk .ck.on{background:#22A06B}.sqtsk .ck.ph{visibility:hidden}"+
    ".sqtsk .tx{flex:1;min-width:0;border:0;background:transparent;color:inherit;font:inherit;text-align:right;padding:8px 0;cursor:pointer;display:flex;flex-direction:column;gap:2px}"+
    ".sqtsk .tx b{font-size:15.5px;font-weight:800;line-height:1.3}.sqtsk .tx small{font-size:13px;opacity:.78;line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}"+
    ".sqtsk li.done .tx b{text-decoration:line-through;opacity:.6}"+
    ".sqtsk .cp{flex:none;font-size:12px;font-weight:800;border-radius:999px;padding:2px 9px;background:rgba(0,0,0,.07);white-space:nowrap}.sqtsk .cp.u{background:#E5484D;color:#fff}"+
    ".sqtsk .un{flex:none;width:44px;border:0;background:transparent;color:#1B6B45;font:inherit;font-size:13px;font-weight:800;cursor:pointer;visibility:hidden}.sqtsk li.done .un{visibility:visible}.sqtsk li.done .cp{display:none}"+
    ".sqtsk .go{flex:none;opacity:.45;font-size:18px}.sqtsk li.done .go{display:none}"+
    ".sqtsk details{border-top:1px solid rgba(0,0,0,.09);padding:6px 0 2px}.sqtsk summary{cursor:pointer;font-size:14px;font-weight:700;opacity:.8;min-height:32px;display:flex;align-items:center}"+
    "@media (prefers-color-scheme:dark){.sqtsk{background:#2A2012;color:#F5E9D8;border-color:#B5772A;box-shadow:none}.sqtsk.urg{background:#2E1517;border-color:#B23A3E}.sqtsk.none{background:#12291D;color:#BFE8CF;border-color:#2D6B48}.sqtsk li,.sqtsk details{border-top-color:rgba(255,255,255,.1)}.sqtsk .cp{background:rgba(255,255,255,.1)}.sqtsk .un{color:#7FD3A4}}"+
    "@media (prefers-reduced-motion:reduce){.sqtsk{animation:none}}";
    document.head.appendChild(st);}
  function send(type,id){try{parent.postMessage({type:type,id:id},"*");}catch(e){}}
  function item(t,can){var li=el("li");if(pend[t.id])li.className="done";
    var ck=el("button","ck"+(can?"":" ph")+(pend[t.id]?" on":""),pend[t.id]?"✓":"");ck.type="button";ck.setAttribute("aria-label","סמן כבוצע: "+t.title);
    ck.onclick=function(){if(pend[t.id]){clearTimeout(pend[t.id]);delete pend[t.id];build();return;}
      pend[t.id]=setTimeout(function(){delete pend[t.id];send("sq-done",t.id);if(data){data.me=data.me.filter(function(x){return x.id!==t.id;});build();}},5000);build();};
    li.appendChild(ck);
    var tx=el("button","tx");tx.type="button";tx.appendChild(el("b",null,t.title));if(t.line)tx.appendChild(el("small",null,t.line));tx.onclick=function(){send("sq-task",t.id);};
    li.appendChild(tx);if(t.chip)li.appendChild(el("span","cp"+(t.urg?" u":""),t.chip));
    var un=el("button","un","בטל");un.type="button";un.onclick=function(){if(pend[t.id]){clearTimeout(pend[t.id]);delete pend[t.id];build();}};li.appendChild(un);
    li.appendChild(el("span","go","‹"));return li;}
  function build(){if(!data)return;css();var me=data.me||[],oth=data.oth||[];
    /* 23.x (Oren 19.11.2026): nothing open = show nothing at all (no "all closed" line) */
    if(!me.length&&!oth.length){if(box)box.remove();box=null;return;}
    var nb=el("section","sqtsk"+(!me.length&&!oth.length?" none":me.some(function(t){return t.urg;})?" urg":""));nb.setAttribute("aria-label","משימות פתוחות");
    var h=el("div","h");
    {h.appendChild(el("b",null,me.length?"📌 משימות פתוחות":"⏳ ממתין לאחרים"));h.appendChild(el("span","n",String(me.length||oth.length)));nb.appendChild(h);
      if(me.length){var ul=el("ul");me.forEach(function(t){ul.appendChild(item(t,true));});nb.appendChild(ul);
        if(oth.length){var d=el("details");d.appendChild(el("summary",null,"⏳ ממתין לאחרים ("+oth.length+")"));var u2=el("ul");oth.forEach(function(t){u2.appendChild(item(t,false));});d.appendChild(u2);nb.appendChild(d);}}
      else{var u3=el("ul");oth.forEach(function(t){u3.appendChild(item(t,false));});nb.appendChild(u3);}}
    var d0=box&&box.querySelector("details");if(d0&&d0.open){var d1=nb.querySelector("details");if(d1)d1.open=true;}
    if(box&&box.parentNode)box.parentNode.replaceChild(nb,box);box=nb;place();}
  function place(){if(!box||!document.body)return;var hero=document.querySelector("header.hero")||document.querySelector(".hero");
    if(hero&&hero.parentNode){if(hero.nextSibling!==box)hero.parentNode.insertBefore(box,hero.nextSibling);}
    else if(document.body.firstChild!==box)document.body.insertBefore(box,document.body.firstChild);
    var nw=document.querySelector(".sqnws");if(nw&&box.nextSibling!==nw&&box.parentNode)box.parentNode.insertBefore(nw,box.nextSibling);}
  var obs=null;
  addEventListener("message",function(e){if(e.source!==parent||!e.data||e.data.type!=="sq-tasks")return;
    if(e.data.skip){data=null;if(box)box.remove();box=null;return;}
    var cl=function(L){return (Array.isArray(L)?L:[]).slice(0,30).map(function(t){return{id:String(t.id||""),title:String(t.title||"").slice(0,140),line:String(t.line||"").slice(0,160),chip:String(t.chip||"").slice(0,24),urg:!!t.urg};});};
    var nd={me:cl(e.data.me),oth:cl(e.data.oth)};
    /* a task marked done here stays (green, undo) until its 5 s pass, then the app's update drops it */
    Object.keys(pend).forEach(function(id){if(!nd.me.some(function(t){return t.id===id;})){var old=data&&data.me.find(function(t){return t.id===id;});if(old)nd.me.push(old);}});
    var k=JSON.stringify(nd);if(data&&JSON.stringify(data)===k&&(box?box.isConnected:!nd.me.length&&!nd.oth.length))return;data=nd;build();
    if(!obs){obs=new MutationObserver(function(){if(box&&(!box.isConnected||box.previousElementSibling&&!box.previousElementSibling.classList.contains("hero")&&box.previousElementSibling.tagName!=="HEADER"))place();});obs.observe(document.body,{childList:true});}});
})();

/* 19.5 (Oren 17.11.2026, standing rule for every dashboard): the "new content" path. The app lists, per dashboard, the items
   that are new (dashboards/<id>.news with `item` + optional `path`) in localStorage sq_item_new; opened items are kept in
   sq_item_seen {"<dash>:<item>": at}, shared with the app (same origin, so its quest dot and tile update right away).
   Inside the page: every element with data-sq-item="<id>" that is new gets a blinking "חדש" badge, every element with
   data-sq-path="<key>" on the way to it (a tab, a section title, a filter chip) gets a blinking dot. Tapping the item (or the
   page calling SQNew.seen(id)) clears it. The page knows its dashboard id from window.SQ_DASH (standalone) or from the app
   (sq-items). API for pages: SQNew.isNew(id), SQNew.seen(id), SQNew.last (the item just opened while new), SQNew.apply(). */
(function(){
  var dash=window.SQ_DASH||null,raf=0;
  function rd(k){try{return JSON.parse(localStorage.getItem(k)||"null");}catch(e){return null;}}
  function list(){if(!dash)return [];var m=rd("sq_item_new")||{},s=rd("sq_item_seen")||{},L=Array.isArray(m[dash])?m[dash]:[];
    return L.filter(function(x){return x&&x.id&&(Date.parse(s[dash+":"+x.id]||"")||0)<(Date.parse(x.at||"")||1);});}
  function css(){if(document.getElementById("sqnew-css"))return;var st=document.createElement("style");st.id="sqnew-css";st.textContent=
    "[data-sq-item].sqnew{position:relative;box-shadow:inset 3px 0 0 #2F7BEA}"+
    "[data-sq-item].sqnew::after{content:'חדש';position:absolute;bottom:9px;inset-inline-end:10px;background:#2F7BEA;color:#fff;font:800 11.5px/1 system-ui,sans-serif;padding:4px 8px;border-radius:999px;box-shadow:0 1px 4px rgba(47,123,234,.45);animation:sqbeat 2.4s ease-in-out infinite;pointer-events:none}"+
    "[data-sq-path].sqnew::after{content:'';display:inline-block;width:9px;height:9px;border-radius:50%;background:#2F7BEA;margin-inline-start:6px;vertical-align:middle;box-shadow:0 0 0 2px rgba(255,255,255,.85);animation:sqbeat 2.4s ease-in-out infinite}"+
    "@keyframes sqbeat{0%,100%{opacity:1}50%{opacity:.5}}@media (prefers-reduced-motion:reduce){[data-sq-item].sqnew::after,[data-sq-path].sqnew::after{animation:none}}";
    (document.head||document.documentElement).appendChild(st);}
  function apply(){raf=0;if(!document.body)return;var L=list(),ids={},paths={};
    L.forEach(function(x){ids[x.id]=1;(x.path||[]).forEach(function(p){paths[p]=1;});});
    if(L.length)css();
    document.querySelectorAll("[data-sq-item]").forEach(function(el){var on=!!ids[el.getAttribute("data-sq-item")];if(el.classList.contains("sqnew")!==on)el.classList.toggle("sqnew",on);});
    document.querySelectorAll("[data-sq-path]").forEach(function(el){var on=!!paths[el.getAttribute("data-sq-path")];if(el.classList.contains("sqnew")!==on)el.classList.toggle("sqnew",on);});}
  function soon(){if(!raf)raf=requestAnimationFrame(apply);}
  function isNew(id){return list().some(function(x){return x.id===String(id);});}
  function seen(id){if(!dash||!id)return;id=String(id);var s=rd("sq_item_seen")||{};if(isNew(id))api.last=id;s[dash+":"+id]=new Date().toISOString();
    try{localStorage.setItem("sq_item_seen",JSON.stringify(s));}catch(e){}soon();}
  var api={isNew:isNew,seen:seen,apply:soon,last:null,dash:function(){return dash;}};window.SQNew=api;
  document.addEventListener("click",function(e){var el=e.target&&e.target.closest&&e.target.closest("[data-sq-item]");if(el)seen(el.getAttribute("data-sq-item"));},true);
  addEventListener("message",function(e){if(!e.data||e.data.type!=="sq-items"||e.source!==parent)return;if(e.data.dash)dash=String(e.data.dash);soon();});
  addEventListener("storage",function(e){if(e.key==="sq_item_new"||e.key==="sq_item_seen")soon();});
  function go(){soon();new MutationObserver(soon).observe(document.body,{childList:true,subtree:true});}
  if(document.body)go();else document.addEventListener("DOMContentLoaded",go);
})();

/* 21.0 (Oren 17.11.2026): all indicator lights share one gentle beat (sqbeat, 2.4s), phase-locked to the wall clock,
   so dots in a dashboard pulse together with the app around it. */
(function(){var D=2400;function lk(a){try{if(a.animationName!=="sqbeat")return;var t=document.timeline;if(!t||t.currentTime==null)return;a.startTime=t.currentTime-(Date.now()%D);}catch(e){}}
  document.addEventListener("animationstart",function(e){if(e.animationName!=="sqbeat"||!e.target.getAnimations)return;e.target.getAnimations({subtree:!!e.pseudoElement}).forEach(lk);},true);})();
