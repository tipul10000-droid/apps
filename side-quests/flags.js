/* flags.js (Side Quests 25.7, Oren 21.11.2026): every country mentioned in the app gets its flag (color emoji).
   SQFlags.of("איטליה") -> "🇮🇹"; SQFlags.all("איטליה, שוויץ") -> ["🇮🇹","🇨🇭"]; SQFlags.tag(text) -> text with the flags before it.
   Hebrew and English names. A new country = one line in F. sq-icons.js keeps flags as emoji. */
(function(){
  if(window.SQFlags)return;
  var F={
    "איטליה":"🇮🇹","italy":"🇮🇹","ותיקן":"🇻🇦","vatican":"🇻🇦","אוסטריה":"🇦🇹","austria":"🇦🇹","גרמניה":"🇩🇪","germany":"🇩🇪",
    "ארה\"ב":"🇺🇸","ארה״ב":"🇺🇸","ארצות הברית":"🇺🇸","usa":"🇺🇸","שוויץ":"🇨🇭","switzerland":"🇨🇭","הולנד":"🇳🇱","netherlands":"🇳🇱",
    "טורקיה":"🇹🇷","turkey":"🇹🇷","תאילנד":"🇹🇭","thailand":"🇹🇭","בולגריה":"🇧🇬","bulgaria":"🇧🇬","צרפת":"🇫🇷","france":"🇫🇷",
    "קפריסין":"🇨🇾","cyprus":"🇨🇾","יון":"🇬🇷","יוון":"🇬🇷","greece":"🇬🇷","ספרד":"🇪🇸","spain":"🇪🇸","אנגליה":"🇬🇧","בריטניה":"🇬🇧",
    "סקוטלנד":"🇬🇧","uk":"🇬🇧","england":"🇬🇧","פולין":"🇵🇱","poland":"🇵🇱","הונגריה":"🇭🇺","hungary":"🇭🇺","אוסטרליה":"🇦🇺","australia":"🇦🇺",
    "בלגיה":"🇧🇪","belgium":"🇧🇪","סינגפור":"🇸🇬","singapore":"🇸🇬","סלובקיה":"🇸🇰","slovakia":"🇸🇰","רומניה":"🇷🇴","romania":"🇷🇴",
    "אתיופיה":"🇪🇹","ethiopia":"🇪🇹","ברזיל":"🇧🇷","brazil":"🇧🇷","דנמרק":"🇩🇰","denmark":"🇩🇰","לאוס":"🇱🇦","laos":"🇱🇦",
    "סלובניה":"🇸🇮","slovenia":"🇸🇮","צ'כיה":"🇨🇿","צ׳כיה":"🇨🇿","czechia":"🇨🇿","קולומביה":"🇨🇴","colombia":"🇨🇴","קזחסטן":"🇰🇿",
    "kazakhstan":"🇰🇿","קרואטיה":"🇭🇷","croatia":"🇭🇷","רוסיה":"🇷🇺","russia":"🇷🇺","שבדיה":"🇸🇪","sweden":"🇸🇪","דרום אפריקה":"🇿🇦",
    "south africa":"🇿🇦","סווזילנד":"🇸🇿","סוויזילנד":"🇸🇿","קניה":"🇰🇪","איסלנד":"🇮🇸","iceland":"🇮🇸","ישראל":"🇮🇱","israel":"🇮🇱",
    "ירדן":"🇯🇴","פורטוגל":"🇵🇹","portugal":"🇵🇹","נורווגיה":"🇳🇴","norway":"🇳🇴","פינלנד":"🇫🇮","אירלנד":"🇮🇪","יפן":"🇯🇵","japan":"🇯🇵",
    "מונטנגרו":"🇲🇪","גאורגיה":"🇬🇪","מצרים":"🇪🇬","הונג קונג":"🇭🇰","קנדה":"🇨🇦","מקסיקו":"🇲🇽","איחוד האמירויות":"🇦🇪","דובאי":"🇦🇪"
  };
  function norm(s){return String(s||"").replace(/\(.*?\)/g,"").replace(/[׳`]/g,"'").trim().toLowerCase();}
  function of(name){var k=norm(name);if(F[k])return F[k];for(var x in F){if(x.length>2&&k.indexOf(x)===0)return F[x];}return "";}
  function all(list){var out=[];String(list||"").split(/[,،\/\n+]|\s-\s/).forEach(function(c){var f=of(c);if(f&&out.indexOf(f)<0)out.push(f);});return out;}
  function tag(text){var f=all(text);return f.length?f.join("")+" "+text:text;}
  window.SQFlags={of:of,all:all,tag:tag,map:F};
})();
