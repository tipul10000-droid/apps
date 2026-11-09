// פרופילים משפחתיים של study (אורן 9.11.2026): אותו לינק לכולם, וכל מכשיר בוחר משפחה בהגדרות (⚙️ במסך הראשי).
// משפחה = קבוצת ילדים. המסך הראשי ואזור ההורים מציגים רק את ילדי המשפחה הנוכחית; הלוח המשפחתי מציג את המשפחה או את כולם.
// להוסיף משפחה: שורה ב-FAMS + הילדים ב-KIDS (+ בשרת: study_kids, ולקוד הורים study_secrets 'parents_<fam>').
// המפתח study_profile משותף לרגיל ולאורח (guest.js). קישור ישיר: study/?p=b קובע את המשפחה במכשיר.
// ילד בלי img מוצג עם אימוג׳י (emo) עד שיגיע איור.
(function(){
  var FAMS=[
    {id:'a',n:'אביתר, דני וליה',emo:'🦁💜🪐',kids:['evyatar','dani','lia']},
    {id:'b',n:'לביא ושילו',emo:'🧱✡️',kids:['levi','shilo']}
  ];
  var KIDS={
    evyatar:{n:'אביתר',boy:1,fam:'a',img:'kids/evyatar.webp',sq:null},
    dani:{n:'דני',boy:0,fam:'a',img:'kids/dani.webp',sq:'DaniSquishies',sqf:'dani/squishies.js',sqk:'dani_sp_sq'},
    lia:{n:'ליה',boy:0,fam:'a',img:'kids/lia.webp',sq:'LiaSquishies',sqf:'lia/squishies.js',sqk:'lia_ph_sq'},
    levi:{n:'לביא',boy:1,fam:'b',emo:'👦',bg:'#e0ecff',sq:'LeviSquishies',sqf:'levi/squishies.js',sqk:'levi_ph_sq'},
    shilo:{n:'שילו',boy:1,fam:'b',emo:'🧒',bg:'#fff1d6',sq:'ShiloSquishies',sqf:'shilo/squishies.js',sqk:'shilo_sq'}
  };
  var K='study_profile';
  function get(){var v=null;try{v=localStorage.getItem(K)}catch(e){}return FAMS.some(function(f){return f.id===v})?v:'a'}
  function set(id){try{localStorage.setItem(K,id)}catch(e){}document.documentElement.setAttribute('data-fam',id)}
  try{var m=/[?&]p=([a-z])\b/.exec(location.search);if(m&&FAMS.some(function(f){return f.id===m[1]}))localStorage.setItem(K,m[1])}catch(e){}
  document.documentElement.setAttribute('data-fam',get());
  var ROOT=location.pathname.replace(/(\/study\/).*$/,'$1');
  window.StudyProfiles={
    fams:FAMS,kids:KIDS,root:ROOT,
    cur:get,set:set,
    fam:function(id){return FAMS.filter(function(f){return f.id===(id||get())})[0]},
    kidsOf:function(id){return (this.fam(id)||FAMS[0]).kids},
    all:function(){return FAMS.reduce(function(a,f){return a.concat(f.kids)},[])},
    // תמונה של ילד: <img> אם יש איור, אחרת עיגול עם אימוג׳י (cls לעיצוב)
    pic:function(id,cls){var k=KIDS[id];if(!k)return'';if(k.img)return '<img class="'+(cls||'')+'" src="'+ROOT+k.img+'" alt="">';
      return '<span class="kemo '+(cls||'')+'" style="background:'+(k.bg||'#eef2f7')+'" aria-hidden="true">'+k.emo+'</span>'}
  };
})();
