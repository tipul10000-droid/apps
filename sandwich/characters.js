// דמויות זמניות (SVG פשוט). כשיגיעו האיורים: מחליפים ב-PNG בתיקיית characters/ ומעדכנים את img.
window.CHARACTERS = {
  lia:     {name:"ליה",     color:"#f783ac", img:null},
  daniela: {name:"דניאלה",  color:"#9775fa", img:null},
  evyatar: {name:"אביתר",   color:"#4dabf7", img:null},
  mom:     {name:"ליאורי",  color:"#ffa94d", img:null}
};
window.drawCharacter = function (id) {
  const c = window.CHARACTERS[id];
  if (c.img) return '<img src="' + c.img + '" alt="' + c.name + '">';
  return '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="' + c.color + '"/>' +
    '<circle cx="35" cy="42" r="6" fill="#fff"/><circle cx="65" cy="42" r="6" fill="#fff"/>' +
    '<circle cx="35" cy="43" r="3" fill="#222"/><circle cx="65" cy="43" r="3" fill="#222"/>' +
    '<path d="M32 62 Q50 78 68 62" stroke="#222" stroke-width="4" fill="none" stroke-linecap="round"/></svg>';
};
