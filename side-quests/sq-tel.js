/* 22.6 (Oren 18.11.2026): every phone number shown in the app is a live tel: link, a tap opens the iPhone dialer.
   Scans text as it is rendered (MutationObserver), skips inputs, links, buttons, code and anything marked .notel. */
(function(){
  var RE=/(?<![\d.,\/:])(?:(?:\+972[\s-]?|0)(?:5\d|7\d|[23489])[\s-]?\d{3}[\s-]?\d{4}|1[\s-]?(?:700|800|599)[\s-]?\d{2,3}[\s-]?\d{3,4}|\*\d{4})(?![\d\/]|[.,]\d)/g;
  var SKIP="a,button,input,textarea,select,script,style,code,pre,svg,[contenteditable],.notel";
  function tel(s){var d=s.replace(/[^\d+*]/g,"");return d.charAt(0)==="*"?d:d;}
  function scanText(n){var p=n.parentElement;if(!p||p.closest(SKIP))return;var s=n.nodeValue;if(!s||s.length<5)return;
    RE.lastIndex=0;if(!RE.test(s))return;RE.lastIndex=0;var f=document.createDocumentFragment(),i=0,m;
    while((m=RE.exec(s))){if(m.index>i)f.appendChild(document.createTextNode(s.slice(i,m.index)));
      var a=document.createElement("a");a.className="tel";a.href="tel:"+tel(m[0]).replace("*","%2A");a.textContent=m[0];a.dir="ltr";
      a.addEventListener("click",function(e){e.stopPropagation();});f.appendChild(a);i=m.index+m[0].length;}
    if(i<s.length)f.appendChild(document.createTextNode(s.slice(i)));n.parentNode.replaceChild(f,n);}
  function scan(root){if(!root)return;if(root.nodeType===3){scanText(root);return;}if(root.nodeType!==1||root.closest&&root.closest(SKIP))return;
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),L=[],n;while((n=w.nextNode()))L.push(n);L.forEach(scanText);}
  var Q=[],busy=false;
  function flush(){busy=false;var a=Q;Q=[];a.forEach(function(r){if(r.isConnected!==false)scan(r);});}
  function start(){scan(document.body);new MutationObserver(function(ms){ms.forEach(function(m){
      if(m.type==="characterData")Q.push(m.target);else m.addedNodes.forEach(function(x){Q.push(x);});});
      if(!busy&&Q.length){busy=true;requestAnimationFrame(flush);}}).observe(document.body,{childList:true,subtree:true,characterData:true});}
  var st=document.createElement("style");st.textContent="a.tel{color:inherit;text-decoration:underline;text-decoration-color:color-mix(in srgb,currentColor 45%,transparent);text-underline-offset:2px;white-space:nowrap;unicode-bidi:isolate}";
  document.head.appendChild(st);
  if(document.body)start();else document.addEventListener("DOMContentLoaded",start);
})();
