// מקלדת פנימית לאפליקציות איות ב-study (אורן 6.11.2026): בלי השלמה אוטומטית ובלי תיקון איות של המקלדת של הטלפון.
// שימוש: StudyKB.attach(inputEl, {onEnter: fn, enterLabel: 'בדיקה', onKey: fn}); StudyKB.hide();
// השדה הופך לקריאה בלבד (inputmode=none), כך שהמקלדת של הטלפון לא נפתחת. מקלדת פיזית (מחשב) עובדת גם.
(function(){
  var css='#skb{position:fixed;left:0;right:0;bottom:0;z-index:35;background:#d4d7dd;padding:6px 3px calc(env(safe-area-inset-bottom,0px) + 6px);direction:ltr;user-select:none;-webkit-user-select:none;touch-action:manipulation;box-shadow:0 -1px 0 #b9bdc5;display:none}'+
    '#skb.on{display:block}#skb .r{display:flex;justify-content:center;gap:5px;margin:0 auto 9px;max-width:520px}#skb .r:last-child{margin-bottom:0}'+
    '#skb button{flex:1 1 0;max-width:46px;height:44px;border:0;border-radius:6px;background:#fff;color:#111;font:400 22px -apple-system,system-ui,Arial,sans-serif;box-shadow:0 1px 0 #898a8d;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}'+
    '#skb button.dn{background:#eef0f3;transform:translateY(1px);box-shadow:none}'+
    '#skb .fn{background:#abb0ba;font-size:17px;max-width:60px;flex-grow:1.4}#skb .sp{max-width:none;flex-grow:5;font-size:16px;color:#333}#skb .go{max-width:none;flex-grow:2.2;background:#7c3aed;color:#fff;font-size:17px;font-weight:600}'+
    '#skb .r2{padding:0 4.5%}#skb .pop{position:absolute;pointer-events:none;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.25);font:500 30px -apple-system,system-ui,Arial,sans-serif;width:52px;height:56px;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-100%)}'+
    'body.skb-on{padding-bottom:var(--skbh,240px)}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  var ROWS=['qwertyuiop','asdfghjkl','zxcvbnm'],kb=null,inp=null,opt={},pop=null,rep=null;
  function build(){if(kb)return;kb=document.createElement('div');kb.id='skb';kb.setAttribute('aria-label','מקלדת');
    var h='<div class="r">'+key(ROWS[0])+'</div><div class="r r2">'+key(ROWS[1])+'</div><div class="r">'+key(ROWS[2])+'<button class="fn" data-k="del" aria-label="מחיקה">⌫</button></div>'+
      '<div class="r"><button class="fn" data-k="\'">\'</button><button class="fn" data-k="-">-</button><button class="sp" data-k=" ">space</button><button class="go" data-k="enter"></button></div>';
    kb.innerHTML=h;document.body.appendChild(kb);pop=document.createElement('div');pop.className='pop';pop.style.display='none';kb.appendChild(pop);
    kb.addEventListener('click',function(ev){var b=ev.target.closest('button');if(b&&b.dataset.k==='enter')press('enter')});// אישור ב-click, כדי שהלחיצה לא תיפול על כפתור שמתחת למקלדת אחרי שהיא נסגרת
    kb.addEventListener('pointerdown',function(ev){var b=ev.target.closest('button');ev.preventDefault();if(!b)return;b.classList.add('dn');if(b.dataset.k!=='enter')press(b.dataset.k,b);
      if(b.dataset.k==='del'){clearInterval(rep);var t0=setTimeout(function(){rep=setInterval(function(){press('del')},90)},420);rep=t0}});
    var up=function(){clearTimeout(rep);clearInterval(rep);pop.style.display='none';kb.querySelectorAll('.dn').forEach(function(b){b.classList.remove('dn')})};
    kb.addEventListener('pointerup',up);kb.addEventListener('pointercancel',up);kb.addEventListener('pointerleave',up);
    document.addEventListener('keydown',function(ev){if(!kb.classList.contains('on')||ev.metaKey||ev.ctrlKey||ev.altKey)return;
      if(ev.key==='Enter'){ev.preventDefault();ev.stopPropagation();press('enter')}else if(ev.key==='Backspace'){ev.preventDefault();press('del')}
      else if(/^[a-zA-Z' -]$/.test(ev.key)){ev.preventDefault();press(ev.key.toLowerCase())}},true)}
  function key(s){return s.split('').map(function(c){return '<button data-k="'+c+'">'+c+'</button>'}).join('')}
  function press(k,b){if(!inp)return;
    if(k==='enter'){if(opt.onEnter)opt.onEnter(inp.value);return}
    if(k==='del')inp.value=inp.value.slice(0,-1);else if(inp.value.length<40)inp.value+=k;
    if(b&&k.length===1&&k!==' '){var r=b.getBoundingClientRect(),kr=kb.getBoundingClientRect();pop.textContent=k;pop.style.left=(r.left+r.width/2-kr.left)+'px';pop.style.top=(r.top-kr.top+6)+'px';pop.style.display='flex'}
    inp.dispatchEvent(new Event('input',{bubbles:true}));if(opt.onKey)opt.onKey(k)}
  window.StudyKB={
    attach:function(el,o){build();inp=el;opt=o||{};el.readOnly=true;el.setAttribute('inputmode','none');el.setAttribute('tabindex','-1');
      kb.querySelector('.go').textContent=opt.enterLabel||'בדיקה';kb.classList.add('on');document.body.classList.add('skb-on');
      document.body.style.setProperty('--skbh',(kb.offsetHeight+16)+'px')},
    hide:function(){if(!kb)return;kb.classList.remove('on');document.body.classList.remove('skb-on');inp=null}
  };
})();
