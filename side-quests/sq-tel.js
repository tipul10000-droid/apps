/* Every link and phone number shown is tappable (permanent rule, Oren 18-19.11.2026).
   22.6: phone numbers -> tel: (iPhone dialer). 23.9: URLs (http/https, www., known domains) -> new tab, emails -> mailto:.
   Works on any page that loads it: scans text nodes as they are rendered (MutationObserver), so content added later
   gets it too. Pure DOM (text nodes + createElement), never innerHTML, only http/https/tel/mailto, so data cannot inject markup.
   Skips existing links, buttons, inputs, code, svg and anything marked .notel / .nolink. */
(function(){
  if(window.SQLinkify)return;
  var PH=/(?<![\d.,\/:])(?:(?:\+972[\s-]?|0)(?:5\d|7\d|[23489])[\s-]?\d{3}[\s-]?\d{4}|1[\s-]?(?:700|800|599)[\s-]?\d{2,3}[\s-]?\d{3,4}|\*\d{4}|\+(?!972)[1-9]\d{0,2}[\s-]?\(?\d{1,4}\)?(?:[\s-]?\d{2,5}){1,5})(?![\d\/]|[.,]\d)/g; // + international (Oren 21.11.2026: hotel abroad)
  var TLD="co\\.il|org\\.il|gov\\.il|ac\\.il|net\\.il|muni\\.il|co\\.uk|com|org|net|io|il|app|dev|ai|me|info|eu|it|uk|us|tv|ly|gl|gg";
  var LK=new RegExp(
    "(https?:\\/\\/[^\\s<>\"'\\u0590-\\u05FF]+)"+                                    // 1 full URL
    "|(?<![@\\w.\\/])(www\\.[a-z0-9-]+(?:\\.[a-z0-9-]+)+(?:\\/[^\\s<>\"'\\u0590-\\u05FF]*)?)"+ // 2 www.
    "|(?<![\\w.+-])([a-z0-9][a-z0-9._%+-]*@[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.[a-z]{2,})"+  // 3 email
    "|(?<![@\\w.\\/])((?:[a-z0-9][a-z0-9-]*\\.)+(?:"+TLD+")(?![\\w-])(?:\\/[^\\s<>\"'\\u0590-\\u05FF]*)?)", // 4 bare domain
    "gi");
  var SKIP="a,button,input,textarea,select,option,label,script,style,code,pre,svg,[contenteditable],.notel,.nolink";
  function trim(u){ // drop trailing punctuation that belongs to the sentence, keep balanced brackets
    var t="";while(/[.,;:!?'"״׳)\]}>]$/.test(u)){var c=u.slice(-1);
      if(c===")"&&(u.split("(").length>u.split(")").length-1))break;
      if(c==="]"&&(u.split("[").length>u.split("]").length-1))break;
      t=c+t;u=u.slice(0,-1);}
    return [u,t];}
  function mk(href,txt,cls,blank){var a=document.createElement("a");a.className=cls;a.href=href;a.textContent=txt;a.dir="ltr";
    if(blank){a.target="_blank";a.rel="noopener noreferrer";}
    a.addEventListener("click",function(e){e.stopPropagation();});return a;}
  function phones(f,s){PH.lastIndex=0;var i=0,m;
    while((m=PH.exec(s))){if(m.index>i)f.appendChild(document.createTextNode(s.slice(i,m.index)));
      f.appendChild(mk("tel:"+m[0].replace(/[^\d+*]/g,"").replace("*","%2A"),m[0],"tel",false));i=m.index+m[0].length;}
    if(i<s.length)f.appendChild(document.createTextNode(s.slice(i)));}
  function quick(s){return /\+\d|[\/@]|www\.|\.[a-z]{2}|\d{4}|\*\d/i.test(s);}
  function scanText(n){var p=n.parentElement;if(!p||p.closest(SKIP))return;var s=n.nodeValue;if(!s||s.length<5||!quick(s))return;
    LK.lastIndex=0;PH.lastIndex=0;var hasL=LK.test(s),hasP=PH.test(s);if(!hasL&&!hasP)return;
    var f=document.createDocumentFragment(),i=0,m;LK.lastIndex=0;
    while(hasL&&(m=LK.exec(s))){var raw=m[0],tt=trim(raw),u=tt[0];if(!u||u.length<4){continue;}
      var href=m[3]?"mailto:"+u:(m[1]?u:"https://"+u);
      if(!/^(https?:\/\/[^\/\s]+\.|https?:\/\/localhost|mailto:)/i.test(href))continue;
      if(m.index>i)phones(f,s.slice(i,m.index));
      f.appendChild(mk(href,u,m[3]?"mail":"lnk",!m[3]));
      i=m.index+u.length;LK.lastIndex=i;}
    if(i<s.length)phones(f,s.slice(i));
    n.parentNode.replaceChild(f,n);}
  function scan(root){if(!root)return;if(root.nodeType===3){scanText(root);return;}if(root.nodeType!==1||root.closest&&root.closest(SKIP))return;
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),L=[],n;while((n=w.nextNode()))L.push(n);L.forEach(scanText);}
  var Q=[],busy=false;
  function flush(){busy=false;var a=Q;Q=[];a.forEach(function(r){if(r.isConnected!==false)scan(r);});}
  function start(){scan(document.body);new MutationObserver(function(ms){ms.forEach(function(m){
      if(m.type==="characterData")Q.push(m.target);else m.addedNodes.forEach(function(x){Q.push(x);});});
      if(!busy&&Q.length){busy=true;requestAnimationFrame(flush);}}).observe(document.body,{childList:true,subtree:true,characterData:true});}
  var st=document.createElement("style");st.textContent=
    "a.tel,a.lnk,a.mail{color:inherit;text-decoration:underline;text-decoration-color:color-mix(in srgb,currentColor 45%,transparent);text-underline-offset:2px;unicode-bidi:isolate}"+
    "a.tel,a.lnk,a.mail{border:0!important;background:none!important;padding:0!important;margin:0!important;border-radius:0!important;box-shadow:none!important;display:inline!important;font:inherit!important}"+
    "a.tel{white-space:nowrap}a.lnk,a.mail{overflow-wrap:anywhere;word-break:break-word}";
  document.head.appendChild(st);
  window.SQLinkify={scan:scan};
  if(document.body)start();else document.addEventListener("DOMContentLoaded",start);
})();
