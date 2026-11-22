/* 25.0 (Oren 20.11.2026, standing rule for every dashboard and mini dashboard): minimal first glance.
   "Titles, categories and closed lists. If I want, I open it. Something new stays closed with a dot that tells me to tap."
   Based on progressive disclosure (Apple HIG layout: order by importance, use disclosure instead of showing everything;
   NN/g: show the few most important things first, keep the rest one tap away, and make the trigger clearly a control).

   What this file does on every page that loads it (generic, also for data written later and re-renders):
   1. Every <section> whose first child is a section title (.sh with an <h2>) becomes a drawer: only the title row shows,
      with a ‹ chevron. A tap opens it below the title (the title never moves) and a second tap closes it.
      Sections whose title is about something to do now (open tasks, urgent, to do now, waiting for a decision) stay open.
   2. Something new inside a closed drawer (dash-sub.js marks it .sqnew) = blue dot on the drawer title, drawer stays closed.
   3. The hero numbers (KPIs, stages, notes, the description) fold behind one small "נתונים" pill under the title.
   4. "🆕 מה חדש" shows as one line with its count; a tap opens the list.
   Open/closed is kept in memory for this visit only, so every visit starts closed. Nothing is removed, only hidden.
   A page can opt a section out with class "calm-off" (always open) or force-close with "calm-closed". */
(function(){
  if(window.SQCalm)return;
  var URG=/דחוף|לעשות עכשיו|משימות פתוחות|פעולות פתוחות|מחכה להחלטה|מחכה לך|ממתין להחלטה|לטפל עכשיו|תשומת לב|^[^֐-׿a-zA-Z]*משימות[^֐-׿a-zA-Z]*$/;
  var OPEN={};      // key -> true/false, this visit only
  var kpOpen=false; // hero numbers
  var nwOpen=false; // "מה חדש" list
  var page=(location.pathname.split("/").pop()||"").replace(/\.html$/,"");
  function css(){if(document.getElementById("sqcalm-css"))return;var st=document.createElement("style");st.id="sqcalm-css";st.textContent=
    "section.calm>.sh{cursor:pointer;-webkit-tap-highlight-color:transparent;position:relative;min-height:48px;display:flex;align-items:center;gap:8px;flex-wrap:nowrap;user-select:none}"+
    "section.calm>.sh h2{flex:1;min-width:0;margin:0;font-size:19px;line-height:1.3}"+
    "section.calm>.sh small{display:none}"+"section.calm>.sh .calm-n{flex:none;min-width:26px;height:24px;padding:0 8px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--muted,#888);background:color-mix(in srgb,var(--muted,#888) 14%,transparent);font-variant-numeric:tabular-nums}"+
    "section.calm>.sh .calm-c{flex:none;font-size:20px;line-height:1;color:var(--muted,#888);transition:transform .2s;padding-inline:6px}"+
    "section.calm.calm-open>.sh .calm-c{transform:rotate(-90deg)}"+
    "section.calm.calm-open>.sh small{display:inline}"+
    "section.calm:not(.calm-open)>:not(.sh){display:none!important}"+
    "section.calm.calm-open>:not(.sh){animation:calmIn .22s ease-out}"+
    "section.calm{margin-top:10px!important;border-bottom:1px solid color-mix(in srgb,var(--line,#8884) 70%,transparent);padding-bottom:6px}"+
    "section.calm.calm-open{padding-bottom:14px}"+
    "section.calm .calm-nw{flex:none;width:10px;height:10px;border-radius:50%;background:#2F7BEA;box-shadow:0 0 0 3px rgba(47,123,234,.22);animation:sqbeat 2.4s ease-in-out infinite}"+
    "@keyframes calmIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}"+
    "@keyframes sqbeat{0%,100%{opacity:1}50%{opacity:.5}}"+
    /* hero: numbers behind one pill */
    "html.calm-on:not(.calm-kp) .hero .kpis,html.calm-on:not(.calm-kp) .hero .stages,html.calm-on:not(.calm-kp) .hero .snote,html.calm-on:not(.calm-kp) .hero .sub,html.calm-on:not(.calm-kp) .hero .docsbtn{display:none!important}"+
    ".hero .calm-kpb{display:inline-flex;align-items:center;gap:6px;margin-top:8px;height:30px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.1);color:var(--hero-ink,#fff);font:inherit;font-size:13px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent}"+
    ".hero .calm-kpb .calm-c{transition:transform .2s;font-size:15px}html.calm-kp .hero .calm-kpb .calm-c{transform:rotate(-90deg)}"+
    "html.calm-kp .hero .kpis,html.calm-kp .hero .stages{animation:calmIn .22s ease-out}"+
    /* "מה חדש": one line until tapped */
    ".sqnws.calmn:not(.calm-open) ul,.sqnws.calmn:not(.calm-open) .m{display:none}"+
    ".sqnws.calmn .h{cursor:pointer;margin-bottom:0}.sqnws.calmn.calm-open .h{margin-bottom:6px}"+
    ".sqnws.calmn .h .calm-c{order:9;font-size:18px;transition:transform .2s}.sqnws.calmn.calm-open .h .calm-c{transform:rotate(-90deg)}"+
    /* air and a slightly larger base text */
    "html.calm-on body{line-height:1.5}"+
    "html.calm-on .card,html.calm-on .row,html.calm-on li{font-size:max(1em,15px)}"+
    "@media (prefers-reduced-motion:reduce){section.calm .calm-nw{animation:none}section.calm.calm-open>:not(.sh){animation:none}}";
    (document.head||document.documentElement).appendChild(st);}
  function txt(el){return (el&&el.textContent||"").replace(/\s+/g," ").trim();}
  function keyOf(sec){var h=sec.querySelector(":scope>.sh h2");return page+":"+txt(h).replace(/[0-9]+/g,"#").slice(0,60);}
  function subView(){return !!document.querySelector(".hero .sqsub");}
  function isCalmable(sec){if(sec.classList.contains("calm-off"))return false;if(sec.closest(".hero,.sqtsk,.sqnws,dialog,.sheet,.ov,.modal"))return false;
    var f=sec.firstElementChild;return !!(f&&f.classList&&f.classList.contains("sh")&&f.querySelector("h2"));}
  function defOpen(sec,i,first){if(sec.classList.contains("calm-closed"))return false;
    // 25.58 (Oren 22.11.2026, "beware of over-collapsing"): a section says what it is (data-role). The page's main content and
    // things to do are open; reference and history stay a closed line. No role = the old rule (title words).
    var role=sec.getAttribute("data-role")||"";if(role==="ref"||role==="hist")return false;if(role==="primary"||role==="act"||role==="now")return true;
    var t=txt(sec.querySelector(":scope>.sh h2"));if(URG.test(t))return true;
    if(nCalm===1&&!subView())return true; // the only section of the page is the page: closing it is just one more tap
    if(tiny(sec))return true;              // up to 3 short rows: show them, a drawer would hide less than its own title takes
    if(subView()&&first)return true; // inside one item he tapped into: its first block shows, the rest fold
    return false;}
  function countOf(sec){var c=sec.children[1];if(!c)return 0;if(c.children.length<2&&c.firstElementChild&&c.firstElementChild.children.length>=2)c=c.firstElementChild;
    var k=[].slice.call(c.children).filter(function(x){return x.offsetParent!==null||!sec.classList.contains("calm-open");});if(k.length<2)return 0;
    var sig=function(x){return x.tagName+"."+(x.className||"").toString().split(" ")[0];},s0=sig(k[0]),same=k.filter(function(x){return sig(x)===s0;}).length;
    return same>=k.length-1&&same>=2?same:0;}
  var nCalm=0;
  function tiny(sec){var kids=[].slice.call(sec.children).slice(1);if(!kids.length)return false;var tx=kids.map(function(k){return k.textContent||"";}).join(" ").replace(/\s+/g," ").trim();
    if(!tx||tx.length>220)return false;if(sec.querySelector(":scope>:not(.sh) img,:scope>:not(.sh) canvas,:scope>:not(.sh) svg.chart,:scope>:not(.sh) table"))return false;return countOf(sec)<=3;}
  function setOpen(sec,on){sec.classList.toggle("calm-open",on);var sh=sec.firstElementChild;if(sh)sh.setAttribute("aria-expanded",on?"true":"false");}
  function apply(){
    css();document.documentElement.classList.add("calm-on");
    var secs=[].slice.call(document.querySelectorAll("section")).filter(isCalmable),first=true;nCalm=secs.length;
    secs.forEach(function(sec,i){
      var sh=sec.firstElementChild,k=keyOf(sec);
      if(!sec.classList.contains("calm")){sec.classList.add("calm");sh.setAttribute("role","button");sh.tabIndex=0;
        var c=document.createElement("span");c.className="calm-c";c.setAttribute("aria-hidden","true");c.textContent="‹";sh.appendChild(c);}
      var on=k in OPEN?OPEN[k]:defOpen(sec,i,first);first=false;
      if(sec.contains(document.querySelector(":target")))on=true;
      if(sec.classList.contains("calm-open")!==on)setOpen(sec,on);else sh.setAttribute("aria-expanded",on?"true":"false");
      // a list inside = its size next to the title ("לו״ז קבוע 6"), only when the rows look alike (not a chart or a form)
      var n=countOf(sec),ce=sh.querySelector(".calm-n");
      if(n&&!ce){ce=document.createElement("span");ce.className="calm-n";sh.insertBefore(ce,sh.querySelector(".calm-c"));}
      if(ce){if(n)ce.textContent=String(n);else ce.remove();}
      // new inside a closed drawer = dot on the title (the drawer stays closed)
      var nw=!on&&!sh.querySelector(".sqnew")&&!!sec.querySelector(":scope>:not(.sh) .sqnew,:scope>.sqnew:not(.sh)"),d=sh.querySelector(".calm-nw");
      if(nw&&!d){d=document.createElement("span");d.className="calm-nw";d.setAttribute("aria-label","יש כאן משהו חדש");sh.insertBefore(d,sh.querySelector(".calm-c"));}
      else if(!nw&&d)d.remove();
    });
    // hero numbers behind one pill
    var hero=document.querySelector(".hero");
    if(hero){var hasKp=hero.querySelector(".kpis,.stages,.snote,.sub");var pill=hero.querySelector(".calm-kpb");
      if(hasKp&&!pill){pill=document.createElement("button");pill.type="button";pill.className="calm-kpb";
        pill.innerHTML='<span>נתונים</span><span class="calm-c" aria-hidden="true">‹</span>';
        var h1=hero.querySelector("h1");if(h1&&h1.parentNode)h1.parentNode.insertBefore(pill,h1.nextSibling);else hero.appendChild(pill);}
      else if(!hasKp&&pill)pill.remove();
      if(pill)pill.setAttribute("aria-expanded",kpOpen?"true":"false");}
    document.documentElement.classList.toggle("calm-kp",kpOpen);
    var nb=document.querySelector(".sqnws");
    if(nb){if(!nb.classList.contains("calmn")){nb.classList.add("calmn");var hh=nb.querySelector(".h");if(hh){var c2=document.createElement("span");c2.className="calm-c";c2.setAttribute("aria-hidden","true");c2.textContent="‹";hh.appendChild(c2);hh.setAttribute("role","button");}}
      nb.classList.toggle("calm-open",nwOpen);}
  }
  var t=null,busy=false;function later(){if(busy)return;clearTimeout(t);t=setTimeout(run,30);}
  function run(){busy=true;try{apply();}finally{setTimeout(function(){busy=false;},0);}}
  document.addEventListener("click",function(e){
    var p=e.target.closest&&e.target.closest(".calm-kpb");if(p){kpOpen=!kpOpen;run();return;}
    var nh=e.target.closest&&e.target.closest(".sqnws.calmn .h");if(nh&&!e.target.closest("button")){nwOpen=!nwOpen;run();return;}
    if(e.target.closest&&e.target.closest("a,button,input,select,textarea,label,summary"))return;
    var sh=e.target.closest&&e.target.closest("section.calm>.sh");if(!sh)return;
    var sec=sh.parentNode,on=!sec.classList.contains("calm-open");OPEN[keyOf(sec)]=on;setOpen(sec,on);
    var d=sh.querySelector(".calm-nw");if(on&&d)d.remove();
  });
  document.addEventListener("keydown",function(e){if(e.key!=="Enter"&&e.key!==" ")return;var sh=e.target.closest&&e.target.closest("section.calm>.sh");if(!sh||e.target!==sh)return;e.preventDefault();sh.click();});
  addEventListener("hashchange",later);
  // a jump to something inside a closed drawer (KPI shortcut, "go to" link, a new item) opens that drawer first
  var siv=Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView=function(){try{var s=this.closest&&this.closest("section.calm");if(s&&!s.classList.contains("calm-open")){OPEN[keyOf(s)]=true;setOpen(s,true);}}catch(e){}return siv.apply(this,arguments);};
  window.SQCalm={open:function(el){var s=el&&el.closest&&el.closest("section.calm");if(s){OPEN[keyOf(s)]=true;setOpen(s,true);}},apply:run};
  function start(){run();new MutationObserver(later).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
