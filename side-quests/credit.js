// Credit cards dashboard (credit.html). Data: sq_docs collection "credit": one doc per card (kind:"card") + _meta.
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safe=u=>/^https:\/\//.test(u||"")?u:"";
const CHAT_FALLBACK="https://claude.ai/code/project/chan_01BSiCy73LfhTPuMwCS8XKQD?thread=cmsg_01BSiCy73LfhTPuMwCS8XKQDX3veq2jQKRpts5F4go29AT";
const ISS={cal:"כאל",isracard:"ישראכרט",max:"מקס",leumi:"לאומי",other:"אחר"};
const INS=[["travel","✈️","ביטוח נסיעות לחו״ל"],["accident","🩹","תאונות אישיות"],["car","🚗","רכב שכור בחו״ל"],["purchase","🛍️","הגנת רכישות"]];
const ST={yes:["כלול","yes"],no:["אין","no"],partial:["חלקי","unk"],unknown:["לא ידוע","unk"]};
const WHO={oren:"עליך",claude:"Claude",both:"שנינו"};
let items={},meta={},db=null;
const UI_KEY="sq_cr_ui";let ui={tab:"cards"};
try{Object.assign(ui,JSON.parse(localStorage.getItem(UI_KEY)||"{}"));}catch(e){}
function saveUi(){try{localStorage.setItem(UI_KEY,JSON.stringify(ui));}catch(e){}}
const EMB=window.self!==window.top;function goHash(x){if(EMB)location.replace(location.pathname+location.search+"#"+x);else location.hash=x;}
function route(){const m=location.hash.match(/^#c=(.+)$/);return m?decodeURIComponent(m[1]):null;}
const cards=()=>Object.entries(items).map(([id,v])=>({id,...v})).filter(x=>!x._deleted&&x.name&&(x.kind||"card")==="card").sort((a,b)=>(a.status==="closed")-(b.status==="closed")||(a.order||99)-(b.order||99));
const live=()=>cards().filter(c=>c.status!=="closed");
const ils=v=>"₪"+(Math.round(v*100)/100).toLocaleString("he-IL");
const feeOf=c=>c.fee&&c.fee.net!=null?+c.fee.net:(c.fee&&c.fee.m!=null?+c.fee.m:null);
function fxTxt(c){const f=c.fx||{};if(f.pct!=null)return (f.est?"~":"")+f.pct+"%";return f.txt||"?";}
function digits(c){return c.last4?"·"+c.last4:"";}
const OWN={lior:"ליאור",oren:"אורן"};
function expInfo(c){const m=String(c.exp||"").match(/^(\d{1,2})[.\/](\d{4})$/);if(!m)return null;const end=new Date(+m[2],+m[1],1),now=new Date(),d=(end-now)/864e5;return {txt:+m[1]+"."+m[2],gone:d<=0,soon:d>0&&d<=62};}
function tags(c){let t="";if(c.owner&&c.owner!=="oren")t+=`<span class="pill p-hi">${esc(OWN[c.owner]||c.owner)}</span>`;const e=c.status!=="closed"&&expInfo(c);if(e&&e.gone)t+='<span class="pill p-bad">פג תוקף</span>';else if(e&&e.soon)t+=`<span class="pill p-warn">פג ב-${esc(e.txt)}</span>`;return t;}
function chip(c){return `<span class="ic ${esc(ISS[c.issuer]?c.issuer:"other")}">${esc((ISS[c.issuer]||"").slice(0,4)||"💳")}</span>`;}

// ---------- hero ----------
function heroHome(){const L=live(),fees=L.map(feeOf).filter(v=>v!=null).reduce((s,v)=>s+v,0);
  const best=L.find(c=>c.fx&&c.fx.best)||L.filter(c=>c.fx&&c.fx.pct!=null).sort((a,b)=>a.fx.pct-b.fx.pct)[0];
  return `<div class="top"><a class="sqhome" href="./"><span class="ar">→</span><img src="icon-192.png?v=2" alt=""><span>Side Quests</span></a><span class="back">${meta.updated?"עודכן "+esc(meta.updated):""}</span></div>
  <h1>💳 כרטיסי אשראי</h1>
  <a class="chatbtn" href="${esc(safe(meta.chat_url)||CHAT_FALLBACK)}" target="_blank" rel="noopener"><span>💬</span><span>צ׳אט</span></a>
  ${safe(meta.collect_url)?`<a class="docsbtn" href="${esc(meta.collect_url)}" target="_blank" rel="noopener">📥 שליפת מסמכים</a>`:""}
  <div class="kpis"><div class="kpi"><b>${L.length}</b><span>כרטיסים פעילים</span></div><div class="kpi"><b>${ils(fees)}</b><span>דמי כרטיס בחודש</span></div><div class="kpi"><b>${best?esc(best.last4||best.short||best.name):"—"}</b><span>הכי זול בחו״ל</span></div></div>`;}
function heroCard(c){return `<div class="top"><button class="sqhome sqsub" type="button" data-home><span class="ar">→</span><span class="em">💳</span><span>כל הכרטיסים</span></button><span class="back">${esc(ISS[c.issuer]||"")}</span></div>
  <h1>${esc(c.name)} ${esc(c.last4?"· "+c.last4:"")}</h1>${c.role?`<p class="sub">${esc(c.role)}</p>`:""}`;}

// ---------- home tabs ----------
function bar(){return `<div class="seg">${[["cards","💳 כרטיסים"],["ins","🛡️ ביטוחים"],["docs","📂 איסוף"]].map(([k,l])=>`<button data-tab="${k}" class="${ui.tab===k?"on":""}">${l}</button>`).join("")}</div>`;}
function openQs(){return cards().filter(c=>c.q&&c.q.q&&!c.q.answer);}
function openTodos(){return [...cards().filter(c=>c.todo&&c.todo.text&&c.todo.status!=="done").map(c=>({c,t:c.todo})),...(Array.isArray(meta.todos)?meta.todos:[]).filter(t=>t&&t.text&&t.status!=="done").map(t=>({c:null,t}))];}
function qBlock(c){return `<div class="card q"><h3>${esc([c.short||c.name,c.last4].filter(Boolean).join(" "))}: ${esc(c.q.q)}</h3><div class="opts">${(c.q.options||[]).map((o,i)=>`<button data-ans="${esc(c.id)}" data-i="${i}">${esc(typeof o==="string"?o:o.label)}</button>`).join("")}</div></div>`;}
function tabCards(){const C=cards();let o="";
  const T=openTodos();
  if(T.length)o+=`<section><div class="sh"><h2>▶️ פעולות פתוחות</h2><small>${T.length}</small></div><div class="card">${T.map(({c,t})=>`<div class="todo"><span class="w">${esc(WHO[t.who]||"")}</span><span>${c?`<b>${esc(c.short||c.name)} ${esc(digits(c))}:</b> `:""}${esc(t.text)}</span></div>`).join("")}</div></section>`;
  const Q=openQs();
  if(Q.length)o+=`<section><div class="sh"><h2>❓ שאלות אליך</h2><small>${Q.length}</small></div><div style="display:grid;gap:10px">${Q.map(qBlock).join("")}</div></section>`;
  o+=`<section><div class="sh"><h2>💳 הכרטיסים</h2><small>${live().length} פעילים</small></div><div class="list">${C.map(c=>{const f=feeOf(c);
    return `<button class="row${c.status==="closed"?" off":""}" data-goc="${esc(c.id)}">${chip(c)}<span class="b"><span class="t">${esc(c.name)} ${esc(c.last4||"")}${c.status==="closed"?'<span class="pill p-bad">נסגר</span>':c.status==="check"?'<span class="pill p-warn">לברר</span>':""}</span><span class="s">${tags(c)}${esc(c.role||"")}</span></span><span class="v">${f==null?"?":f?ils(f):"₪0"}<small>חו״ל ${esc(fxTxt(c))}</small></span></button>`;}).join("")}</div></section>`;
  const L=live();
  o+=`<section><div class="sh"><h2>⚖️ השוואה</h2></div><table class="cmp"><tr><th>כרטיס</th><th>דמי כרטיס</th><th>עמלת מט״ח</th><th>ביטוח נסיעות</th></tr>${L.map(c=>{const f=feeOf(c),tr=(c.ins||{}).travel||{},s=ST[tr.s||"unknown"];
    return `<tr><td><b>${esc(c.short||c.name)}</b> ${esc(c.last4||"")}</td><td>${f==null?'<span class="unk">?</span>':f?ils(f):"₪0"}</td><td>${esc(fxTxt(c))}</td><td class="${s[1]}">${s[0]}</td></tr>`;}).join("")}</table>
    ${meta.cmp_note?`<p class="note fold">${esc(meta.cmp_note)}</p>`:""}</section>`;
  return o;}
function tabIns(){const L=live();let o="";
  if(meta.ins_summary)o+=`<section><div class="card"><p class="note fold" style="margin:0;color:var(--ink);font-size:15px">${esc(meta.ins_summary)}</p></div></section>`;
  INS.forEach(([k,ic,l])=>{o+=`<section><div class="sh"><h2>${ic} ${l}</h2></div><div class="card"><ul class="ins">${L.map(c=>{const x=(c.ins||{})[k]||{},s=ST[x.s||"unknown"];
    return `<li><b>${esc(c.short||c.name)} ${esc(c.last4||"")}</b> <span class="${s[1]}">${s[0]}</span>${x.note?`<div class="note">${esc(x.note)}</div>`:""}</li>`;}).join("")}</ul></div></section>`;});
  return o;}
function tabDocs(){let o="";const G=Array.isArray(meta.gather)?meta.gather:[];
  G.forEach(g=>{o+=`<section><div class="sh"><h2>${esc(g.icon||"📂")} ${esc(g.h)}</h2><small>${(g.items||[]).filter(i=>i.s==="done").length}/${(g.items||[]).length}</small></div><div class="list">${(g.items||[]).map(i=>{const u=safe(i.url);const inner=`<span class="b"><span class="t">${i.s==="done"?"✓ ":""}${esc(i.t)}</span>${i.sub?`<span class="s">${esc(i.sub)}</span>`:""}</span><span class="v">${u?"↗":""}</span>`;
    return u?`<a class="row${i.s==="done"?" off":""}" href="${esc(u)}" target="_blank" rel="noopener" style="color:inherit;font-weight:inherit">${inner}</a>`:`<div class="row${i.s==="done"?" off":""}" style="cursor:default">${inner}</div>`;}).join("")}</div></section>`;});
  const R=meta.request;
  if(R&&R.body)o+=`<section><div class="sh"><h2>✉️ ${esc(R.title||"בקשת תנאי כרטיס")}</h2></div><div class="card"><pre class="req">${esc(R.body)}</pre>${R.where?`<p class="note">${esc(R.where)}</p>`:""}<div class="btns"><button data-copy>📋 העתקה</button></div></div></section>`;
  return o||`<div class="card empty">עוד אין</div>`;}
function renderHome(){$("hero").innerHTML=heroHome();$("bar").innerHTML=bar();
  $("app").innerHTML=ui.tab==="ins"?tabIns():ui.tab==="docs"?tabDocs():tabCards();}

// ---------- secure card details (full number + CVV, encrypted on the device with the app PIN; expiry plain) ----------
const enc=new TextEncoder(),dec=new TextDecoder();
const b64=a=>btoa(String.fromCharCode(...new Uint8Array(a))),unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function pinKey(){try{return localStorage.getItem("sq_pin")||sessionStorage.getItem("sq_pin")||"";}catch(e){return "";}}
async function aesKey(salt){const base=await crypto.subtle.importKey("raw",enc.encode("sq-credit|"+pinKey()),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:310000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);}
async function seal(obj){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},await aesKey(salt),enc.encode(JSON.stringify(obj)));return {v:1,salt:b64(salt),iv:b64(iv),ct:b64(ct)};}
async function unseal(s){const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(s.iv)},await aesKey(unb64(s.salt)),unb64(s.ct));return JSON.parse(dec.decode(pt));}
const plain={},shown={},editing={};let hideT={};
async function openSec(c){if(plain[c.id]!==undefined)return plain[c.id];if(!c.sec||!c.sec.ct){plain[c.id]={};return plain[c.id];}
  try{plain[c.id]=await unseal(c.sec);}catch(e){plain[c.id]=null;}return plain[c.id];}
const grp=n=>String(n||"").replace(/\D/g,"").replace(/(.{4})(?=.)/g,"$1 ");
function expFmt(c){const m=String(c.exp||"").match(/^(\d{1,2})[.\/](\d{4})$/);return m?String(m[1]).padStart(2,"0")+"/"+m[2].slice(2):(c.exp||"");}
function secBlock(c){const p=plain[c.id],on=shown[c.id]&&p,has=c.sec&&c.sec.ct;
  if(editing[c.id]){const v=p||{};return `<section id="secb"><div class="sh"><h2>🔐 פרטי הכרטיס</h2></div><div class="card sec">
    <label>מספר מלא<input id="sec-num" inputmode="numeric" autocomplete="off" dir="ltr" value="${esc(grp(v.num))}" placeholder="0000 0000 0000 ${esc(c.last4||"0000")}"></label>
    <div class="two"><label>תוקף (חודש/שנה)<input id="sec-exp" inputmode="numeric" autocomplete="off" dir="ltr" value="${esc(expFmt(c))}" placeholder="MM/YY"></label>
    <label>CVV (3 ספרות בגב)<input id="sec-cvv" inputmode="numeric" autocomplete="off" dir="ltr" maxlength="4" value="${esc(v.cvv||"")}" placeholder="•••"></label></div>
    <p class="note">המספר וה-CVV נשמרים מוצפנים עם קוד הכניסה לאפליקציה. רק במכשיר שלך רואים אותם.</p>
    <div class="btns"><button data-secsave="${esc(c.id)}">💾 שמירה</button><button data-seccancel="${esc(c.id)}">ביטול</button></div></div></section>`;}
  const mask=on?(p.num?grp(p.num):"—"):(c.last4?"•••• •••• •••• "+c.last4:"—");
  const cvv=on?(p.cvv||"—"):(has?"•••":"—");
  const row=(k,v,copyv,cls)=>`<div class="k">${k}</div><div class="sv"><span class="${cls||""}" dir="ltr">${esc(v)}</span>${copyv?`<button class="cp" data-cpy="${esc(copyv)}" aria-label="העתקה">📋</button>`:""}</div>`;
  return `<section id="secb"><div class="sh"><h2>🔐 פרטי הכרטיס</h2>${has?"":'<small>חסר מספר ו-CVV</small>'}</div><div class="card sec"><div class="kv">
    ${row("מספר",mask,on&&p.num?p.num:"","mono")}${row("תוקף",expFmt(c)||"—",c.exp?expFmt(c):"","mono")}${row("CVV",cvv,on&&p.cvv?p.cvv:"","mono")}</div>
    ${p===null?'<p class="note" style="color:var(--bad)">לא הצלחתי לפענח. אולי קוד הכניסה הוחלף. אפשר להזין מחדש בעריכה.</p>':""}
    <div class="btns">${has?`<button data-secshow="${esc(c.id)}">${on?"🙈 הסתרה":"👁 הצגה"}</button>`:""}<button data-secedit="${esc(c.id)}">✏️ ${has?"עריכה":"הוספת מספר, תוקף ו-CVV"}</button></div></div></section>`;}
async function secSave(id){const c=items[id];if(!c)return;
  const num=($("sec-num").value||"").replace(/\D/g,""),cvv=($("sec-cvv").value||"").replace(/\D/g,""),ex=($("sec-exp").value||"").trim();
  if(num&&(num.length<13||num.length>19)){toast("מספר כרטיס צריך 13 עד 19 ספרות");return;}
  if(num&&c.last4&&!num.endsWith(c.last4)){toast("המספר לא נגמר ב-"+c.last4+". בדוק שזה הכרטיס הנכון");return;}
  if(cvv&&(cvv.length<3||cvv.length>4)){toast("CVV הוא 3 ספרות (באמקס 4)");return;}
  let exp=c.exp||"";if(ex){const m=ex.match(/^(\d{1,2})\s*[\/.\-]\s*(\d{2}|\d{4})$/);if(!m||+m[1]<1||+m[1]>12){toast("תוקף בפורמט MM/YY");return;}exp=+m[1]+"."+(m[2].length===2?"20"+m[2]:m[2]);}
  if(!pinKey()){toast("צריך קוד כניסה כדי להצפין");return;}
  const now=new Date().toISOString(),patch={exp,updated_at:now,log:[...(c.log||[]),{at:now,text:"עודכנו פרטי כרטיס (מספר/תוקף/CVV)"}]};
  if(num||cvv){patch.sec=await seal({num,cvv});plain[id]={num,cvv};}else{patch.sec=null;plain[id]={};}
  editing[id]=false;shown[id]=true;clearTimeout(hideT[id]);hideT[id]=setTimeout(()=>{shown[id]=false;render();},30000);upd(id,patch,"נשמר מוצפן");}

// ---------- card page ----------
function renderCard(id){const c=cards().find(x=>x.id===id);if(!c){goHash("");return;}
  $("hero").innerHTML=heroCard(c);$("bar").innerHTML="";const f=c.fee||{},fx=c.fx||{},cf=c.cf||{};let o="";
  if(c.q&&c.q.q&&!c.q.answer)o+=`<section>${qBlock(c)}</section>`;
  if(c.todo&&c.todo.text&&c.todo.status!=="done")o+=`<section><div class="card"><div class="todo"><span class="w">${esc(WHO[c.todo.who]||"")}</span><span>${esc(c.todo.text)}</span></div></div></section>`;
  const kv=[["חברה",ISS[c.issuer]||c.issuer],["סוג",c.net],["מועדון",c.club],["דמי כרטיס",f.m!=null?ils(+f.m)+(f.net!=null&&+f.net!==+f.m?" (בפועל "+ils(+f.net)+")":""):"לא ידוע"],["עמלת מט״ח",fxTxt(c)],["חיוב",c.billing],["בעלים",c.owner&&c.owner!=="oren"?(OWN[c.owner]||c.owner):""],["מסגרת",c.limit!=null?ils(+c.limit):""]].filter(r=>r[1]);
  if(c.note_oren)o+=`<section><div class="card"><p class="note">📝 ${esc(c.note_oren)}</p></div></section>`;
  o+=`<section><div class="card"><div class="kv">${kv.map(([k,v])=>`<div class="k">${esc(k)}</div><div>${esc(v)}</div>`).join("")}</div>${f.note?`<p class="note fold">💰 ${esc(f.note)}</p>`:""}${fx.note?`<p class="note fold">🌍 ${esc(fx.note)}</p>`:""}</div></section>`;
  o+=secBlock(c);
  o+=`<section><div class="sh"><h2>🛡️ ביטוחים בכרטיס</h2></div><div class="card"><ul class="ins">${INS.map(([k,ic,l])=>{const x=(c.ins||{})[k]||{},s=ST[x.s||"unknown"];return `<li>${ic} ${l}: <span class="${s[1]}">${s[0]}</span>${x.note?`<div class="note">${esc(x.note)}</div>`:""}</li>`;}).join("")}</ul></div></section>`;
  if((c.perks||[]).length)o+=`<section><div class="sh"><h2>🎁 הטבות</h2></div><div class="card"><ul class="ins">${c.perks.map(p=>`<li>${esc(p)}</li>`).join("")}</ul></div></section>`;
  if(cf.n)o+=`<section><div class="sh"><h2>📊 מהתזרים</h2></div><div class="card"><div class="kv">${[["עסקאות",cf.n+(cf.first?" (מ-"+cf.first+")":"")],["בחו״ל",cf.fx_n!=null?cf.fx_n+" עסקאות"+(cf.fx_spend?", "+ils(cf.fx_spend):""):""],["פעילות אחרונה",cf.last],["לתשלום",cf.due]].filter(r=>r[1]).map(([k,v])=>`<div class="k">${esc(k)}</div><div>${esc(v)}</div>`).join("")}</div></div></section>`;
  const links=(c.links||[]).filter(l=>safe(l.url));
  if(links.length)o+=`<section><div class="list">${links.map(l=>`<a class="row" href="${esc(l.url)}" target="_blank" rel="noopener" style="color:inherit"><span class="b"><span class="t">${esc(l.label)}</span></span><span class="v">↗</span></a>`).join("")}</div></section>`;
  if((c.log||[]).length)o+=`<details class="more"><summary>היסטוריה</summary><div>${[...c.log].reverse().map(l=>`${esc(String(l.at||"").slice(0,10))}: ${esc(l.text)}`).join("<br>")}</div></details>`;
  $("app").innerHTML=o;}

function render(){const r=route();if(r)renderCard(r);else renderHome();
  $("foot").innerHTML=`${meta.sources?`<details class="more"><summary>מקורות</summary><div>${esc(meta.sources)}</div></details>`:""}אשראי ${esc(window.CR_BUILD)}`;}
let tt;function toast(t){$("toast").textContent=t;$("toast").className="toast on";clearTimeout(tt);tt=setTimeout(()=>$("toast").className="toast",3500);}
async function copy(t){try{await navigator.clipboard.writeText(t);return true;}catch(e){const a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand("copy");}catch(e2){}a.remove();return ok;}}
function keepPut(sel,fn){const b=document.querySelector(sel),top=b?b.getBoundingClientRect().top:0;fn();const nb=document.querySelector(sel);if(b&&nb)scrollBy(0,nb.getBoundingClientRect().top-top);}
async function upd(id,patch,msg){const prev=JSON.parse(JSON.stringify(items[id]||{}));items[id]=Object.assign({},items[id],patch);const y=scrollY;render();scrollTo(0,y);
  if(!db){toast("אין חיבור, לא נשמר");return;}
  try{await db.collection("credit").doc(id).update(patch);toast(msg||"נשמר");}catch(e){items[id]=prev;render();toast("לא נשמר, נסה שוב");}}
window.addEventListener("hashchange",()=>{render();scrollTo(0,0);});
document.addEventListener("click",async e=>{const g=s=>e.target.closest(s);let b;
  if(b=g("[data-tab]")){const k=b.dataset.tab;keepPut(`[data-tab="${k}"]`,()=>{ui.tab=k;saveUi();render();});return;}
  if(b=g("[data-goc]")){goHash("c="+encodeURIComponent(b.dataset.goc));return;}
  if(g("[data-home]")){EMB?goHash(""):history.length>1&&route()?history.back():(location.hash="");return;}
  if(g("[data-copy]")){toast(await copy((meta.request||{}).body||"")?"הועתק":"לא הצלחתי להעתיק");return;}
  if(b=g("[data-secshow]")){const id=b.dataset.secshow;if(shown[id]){shown[id]=false;render();return;}await openSec(items[id]?{id,...items[id]}:{id});shown[id]=true;clearTimeout(hideT[id]);hideT[id]=setTimeout(()=>{shown[id]=false;render();},30000);keepPut("#secb",render);return;}
  if(b=g("[data-secedit]")){const id=b.dataset.secedit;await openSec({id,...items[id]});editing[id]=true;keepPut("#secb",render);return;}
  if(b=g("[data-seccancel]")){editing[b.dataset.seccancel]=false;keepPut("#secb",render);return;}
  if(b=g("[data-secsave]")){secSave(b.dataset.secsave);return;}
  if(b=g("[data-cpy]")){toast(await copy(b.dataset.cpy)?"הועתק":"לא הצלחתי להעתיק");return;}
  if(b=g("[data-ans]")){const id=b.dataset.ans,c=items[id];if(!c||!c.q)return;const o=(c.q.options||[])[+b.dataset.i];if(o==null)return;
    const label=typeof o==="string"?o:o.label,now=new Date().toISOString();b.style.background="var(--hi-soft)";
    // every answer becomes a next step (todo) or closes (rule 7.11)
    const todo=o.todo?{...o.todo,status:"open",at:now}:o.close?null:{who:"claude",text:"להגדיר צעד הבא אחרי התשובה: "+label,status:"open",at:now};
    const patch={q:{...c.q,answer:label,answered_at:now},updated_at:now,log:[...(c.log||[]),{at:now,text:"ענית: "+c.q.q+" → "+label}]};
    if(todo)patch.todo=todo;if(o.set&&typeof o.set==="object")Object.assign(patch,o.set);
    setTimeout(()=>upd(id,patch,"נשמר: "+label),300);return;}
});
render();
window.claude.use("db").then(d=>{db=d;if(!db)return;
  db.collection("credit").onSnapshot(s=>{const n={};s.docs.forEach(x=>{const v=x.data();if(!v||v._deleted)return;if(x.id==="_meta")meta=v;else{if(items[x.id]&&JSON.stringify(items[x.id].sec)!==JSON.stringify(v.sec)&&!editing[x.id])delete plain[x.id];n[x.id]=v;}});items=n;render();},()=>{});
});
})();
