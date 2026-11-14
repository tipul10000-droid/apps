// הדמויות: איורים שקופים (WebP) בתיקיית characters/.
// full = גוף מלא, face = חיתוך פנים עגול.
// משפחות: a = המשפחה הראשונה (ברירת מחדל), b = המשפחה השנייה. מזהי הדמויות ייחודיים בין המשפחות.
window.FAMILIES = {
  a: {label: "משפחה 1", kids: ["lia", "daniela", "evyatar"], mom: "mom"},
  b: {label: "משפחה 2", kids: ["ron", "omer", "uri"], mom: "mom_b"}
};
window.CHARACTERS = {
  lia:     {g: "f", name: "ליקי",   color: "#8fe04a", color2: "#ffd43b"},
  daniela: {g: "f", name: "דנדי",   color: "#ff6fb5", color2: "#b57bff"},
  evyatar: {g: "m", name: "אביה",    color: "#4d9bff", color2: "#ff5a5a"},
  mom:     {name: "אמא ליאורי", color: "#ffa04d", color2: "#ff5f6d"},
  ron:     {g: "m", name: "רון",    color: "#ff4d57", color2: "#ffffff"},
  omer:    {g: "m", name: "עומר",   color: "#ffd34d", color2: "#3fbf5a"},
  uri:     {g: "f", name: "אורי",   color: "#ff6fb5", color2: "#2fc4d8"},
  // אין עדיין איור של אמא במשפחה 2: דמות מצוירת זמנית
  mom_b:   {name: "אמא", color: "#b57bff", color2: "#ff6fb5", svg: true},
  admin:   {name: "מנהל", color: "#ffd34d", color2: "#ff9f1c"}
};
// איור זמני לאמא (SVG): ראש וכתפיים. full = עם גוף, face = ראש בעיגול.
function momSvg(kind) {
  var body = '<path d="M17 62Q15 10 50 8Q85 10 83 62Q83 100 72 116H28Q17 100 17 62z" fill="#6b3f2a"/>' +
    '<path d="M20 160Q20 118 50 112Q80 118 80 160z" fill="#b57bff" stroke="#6c3fb8" stroke-width="2"/>' +
    '<path d="M40 112Q50 126 60 112" fill="none" stroke="#6c3fb8" stroke-width="2"/>' +
    '<rect x="43" y="92" width="14" height="22" rx="6" fill="#efbf96"/>' +
    '<ellipse cx="50" cy="60" rx="25" ry="29" fill="#f6cfa8" stroke="#c1906a" stroke-width="1.6"/>' +
    '<path d="M24 60Q22 22 50 22Q78 22 76 60Q68 40 50 40Q32 40 24 60z" fill="#6b3f2a"/>' +
    '<circle cx="41" cy="62" r="2.8" fill="#2a1d17"/><circle cx="59" cy="62" r="2.8" fill="#2a1d17"/>' +
    '<circle cx="42" cy="61" r=".9" fill="#fff"/><circle cx="60" cy="61" r=".9" fill="#fff"/>' +
    '<path d="M42 74Q50 81 58 74" fill="none" stroke="#a24a3a" stroke-width="2.2" stroke-linecap="round"/>' +
    '<circle cx="35" cy="70" r="4" fill="#ff9aa8" opacity=".45"/><circle cx="65" cy="70" r="4" fill="#ff9aa8" opacity=".45"/>';
  if (kind === "face") return '<svg class="ch face" viewBox="8 6 84 84" role="img" aria-label="אמא" draggable="false"><rect x="8" y="6" width="84" height="84" fill="#3a2a78"/>' + body + '</svg>';
  return '<svg class="ch ' + (kind || "full") + '" viewBox="0 0 100 160" role="img" aria-label="אמא" draggable="false">' + body + '</svg>';
}
window.drawCharacter = function (id, kind) {
  var c = window.CHARACTERS[id];
  if (c.svg) return momSvg(kind);
  var src = "characters/" + id + (kind === "face" ? "-face" : kind === "big" ? "-big" : "") + ".webp";
  return '<img class="ch ' + (kind || "full") + '" src="' + src + '" alt="' + c.name + '" draggable="false">';
};
