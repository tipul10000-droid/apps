/* Face ID (passkey) helper, shared by index.html (settings: turn on / off) and dash-lock.js (locked dashboards).
   24.8 (Oren 19.11.2026): Face ID is no longer at app entry, only on the locked dashboards, with the 4-digit code always there.
   sq_fid = this device's credential id, sq_fid_on = "1" when on. The server (edge function sq-passkey) checks every signature;
   offline, iOS still checks the face and we accept it locally. */
(function(){
if(window.SQFid)return;
function ls(k){try{return localStorage.getItem(k);}catch(e){return null;}}
var FN="https://emgtyfksnofzzlutngbf.supabase.co/functions/v1/sq-passkey";
function b2u(b){b=new Uint8Array(b);var s="";for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function u2b(u){u=u.replace(/-/g,"+").replace(/_/g,"/");while(u.length%4)u+="=";var s=atob(u),b=new Uint8Array(s.length);for(var i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b.buffer;}
function call(body){var ac=new AbortController(),tm=setTimeout(function(){ac.abort();},8000);
  return fetch(FN,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:ac.signal})
    .then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok){var e=new Error(j.err||("HTTP "+r.status));e.status=r.status;throw e;}return j;});},
      function(){var e=new Error("offline");e.net=true;throw e;}).finally(function(){clearTimeout(tm);});}
var pre=null,preVal=null;
function prep(){var id=ls("sq_fid");preVal=null;pre=call({a:"auth-options",id:id}).then(function(j){j.at=Date.now();return j;},function(e){return {local:true,at:Date.now(),err:e};});
  var mine=pre;pre.then(function(j){if(pre===mine)preVal=j;});return pre;}
function cred(){var id=ls("sq_fid");return id?[{type:"public-key",id:u2b(id),transports:["internal"]}]:[];}
function getA(j){var ch=j.local?crypto.getRandomValues(new Uint8Array(32)).buffer:u2b(j.opts.challenge);
  return navigator.credentials.get({publicKey:{challenge:ch,rpId:location.hostname,allowCredentials:cred(),userVerification:"required",hints:["client-device"],timeout:60000}});}
window.SQFid={
  ok:function(){return !!(window.PublicKeyCredential&&navigator.credentials&&window.isSecureContext);},
  on:function(){return this.ok()&&ls("sq_fid_on")==="1"&&!!ls("sq_fid")&&!!ls("sq_pin");},
  prep:prep,
  auth:function(){var t0=performance.now(),v=preVal,p=pre;pre=preVal=null;
    function run(j){
      return getA(j).then(function(a){if(!a)throw new Error("none");
        if(j.local)return true;
        var r=a.response,resp={id:a.id,rawId:b2u(a.rawId),type:a.type,clientExtensionResults:{},authenticatorAttachment:a.authenticatorAttachment||undefined,
          response:{clientDataJSON:b2u(r.clientDataJSON),authenticatorData:b2u(r.authenticatorData),signature:b2u(r.signature),userHandle:r.userHandle?b2u(r.userHandle):undefined}};
        return call({a:"auth-verify",cid:j.cid,resp:resp}).then(function(){return true;},function(e){if(e.net||(e.status>=500))return true;throw e;});
      },function(e){prep();if(e&&e.name==="NotAllowedError"&&performance.now()-t0<900){var g=new Error("gesture");g.gesture=true;throw g;}throw e;});}
    if(v&&Date.now()-v.at<240000)return run(v);
    return (p||prep()).then(function(j){pre=preVal=null;if(Date.now()-j.at>240000)return prep().then(function(k){pre=preVal=null;return run(k);});return run(j);});},
  register:function(regPre){var pin=ls("sq_pin")||"";
    var go=function(j){return navigator.credentials.create({publicKey:{rp:{id:location.hostname,name:j.opts.rp.name},user:{id:u2b(j.opts.user.id),name:j.opts.user.name,displayName:j.opts.user.displayName},
      challenge:u2b(j.opts.challenge),pubKeyCredParams:j.opts.pubKeyCredParams,timeout:60000,attestation:"none",hints:["client-device"],
      authenticatorSelection:j.opts.authenticatorSelection,excludeCredentials:(j.opts.excludeCredentials||[]).map(function(c){return {type:"public-key",id:u2b(c.id)};})}})
      .then(function(c){var r=c.response,resp={id:c.id,rawId:b2u(c.rawId),type:c.type,clientExtensionResults:{},authenticatorAttachment:c.authenticatorAttachment||undefined,
          response:{clientDataJSON:b2u(r.clientDataJSON),attestationObject:b2u(r.attestationObject),transports:r.getTransports?r.getTransports():["internal"]}};
        return call({a:"reg-verify",pin:pin,cid:j.cid,resp:resp,device:/iPhone/.test(navigator.userAgent)?"iPhone":/iPad/.test(navigator.userAgent)?"iPad":"device"});})
      .then(function(r){try{localStorage.setItem("sq_fid",r.id);localStorage.setItem("sq_fid_on","1");}catch(e){}return r;});};
    return regPre?go(regPre):call({a:"reg-options",pin:pin}).then(go);},
  regOpts:function(){return call({a:"reg-options",pin:ls("sq_pin")||""}).then(function(j){j.at=Date.now();return j;});}
};
})();
