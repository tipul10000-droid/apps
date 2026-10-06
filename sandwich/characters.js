// הדמויות: איורים שקופים (WebP) בתיקיית characters/.
// full = גוף מלא, face = חיתוך פנים עגול.
window.CHARACTERS = {
  lia:     {name: "ליקי",   color: "#8fe04a", color2: "#ffd43b"},
  daniela: {name: "דנדי",   color: "#ff6fb5", color2: "#b57bff"},
  evyatar: {name: "אביה",    color: "#4d9bff", color2: "#ff5a5a"},
  mom:     {name: "אמא ליאורי", color: "#ffa04d", color2: "#ff5f6d"}
};
window.drawCharacter = function (id, kind) {
  var c = window.CHARACTERS[id];
  var src = "characters/" + id + (kind === "face" ? "-face" : kind === "big" ? "-big" : "") + ".webp";
  return '<img class="ch ' + (kind || "full") + '" src="' + src + '" alt="' + c.name + '" draggable="false">';
};
