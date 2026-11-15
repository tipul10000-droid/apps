// הדמויות: איורים שקופים (WebP) בתיקיית characters/.
// full = גוף מלא, face = חיתוך פנים עגול.
// משפחות: a = המשפחה הראשונה (ברירת מחדל), b = המשפחה השנייה. מזהי הדמויות ייחודיים בין המשפחות.
window.FAMILIES = {
  a: {label: "משפחת יצחקי", kids: ["lia", "daniela", "evyatar"], mom: "mom"},
  b: {label: "משפחת חלפון", kids: ["ron", "omer", "uri"], mom: "mom_b", multi: true}
};
window.CHARACTERS = {
  lia:     {g: "f", name: "ליקי",   color: "#8fe04a", color2: "#ffd43b"},
  daniela: {g: "f", name: "דנדי",   color: "#ff6fb5", color2: "#b57bff"},
  evyatar: {g: "m", name: "אביה",    color: "#4d9bff", color2: "#ff5a5a"},
  mom:     {name: "אמא ליאורי", color: "#ffa04d", color2: "#ff5f6d"},
  ron:     {g: "m", name: "רון",    color: "#ff4d57", color2: "#ffffff"},
  omer:    {g: "m", name: "עומר",   color: "#ffd34d", color2: "#3fbf5a"},
  uri:     {g: "f", name: "אורי",   color: "#ff6fb5", color2: "#2fc4d8"},
  mom_b:   {name: "אמא ליאורי", color: "#b57bff", color2: "#ff6fb5"},
  admin:   {name: "מנהל", color: "#ffd34d", color2: "#ff9f1c"}
};
window.drawCharacter = function (id, kind) {
  var c = window.CHARACTERS[id];
  var src = "characters/" + id + (kind === "face" ? "-face" : kind === "big" ? "-big" : "") + ".webp";
  return '<img class="ch ' + (kind || "full") + '" src="' + src + '" alt="' + c.name + '" draggable="false">';
};
