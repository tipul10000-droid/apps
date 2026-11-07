/* 12.4 (Oren 7.11.2026): long text in the dashboards folds to 2 lines. A tap on the text opens it downward (its top stays put)
   and a second tap closes it. Covers notes and hero summaries, including data written later. */
(function(){
  var SEL=".note,.hero .sub,.fold";
  function check(el){
    if(el.dataset.fz)return;
    var lh=parseFloat(getComputedStyle(el).lineHeight)||18;
    if(el.scrollHeight>lh*2.7){el.dataset.fz="1";el.classList.add("fz");}
  }
  function scan(root){(root.querySelectorAll?root.querySelectorAll(SEL):[]).forEach(check);}
  var t=null;function later(){clearTimeout(t);t=setTimeout(function(){scan(document);},60);}
  document.addEventListener("click",function(e){
    if(e.target.closest("a,button,input,select,summary,label"))return;
    var el=e.target.closest(".fz");if(el)el.classList.toggle("fzo");
  });
  function start(){scan(document);new MutationObserver(later).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
