// SQTripIcons (Oren 22.11.2026, SQ 25.46): one calm line-icon set for what a trip is (couple, family, concert, work...),
// plus a quiet generic flight graphic. Used by the trip cards in Travel → בחו״ל (index.html) and by abroad.html.
// Line icons in currentColor (Lucide style, ISC), no photos and no loud colours, so every card looks the same.
(function () {
  var A = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var P = {
    couple: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    family: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    ext: '<path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-6h6v6"/>',
    friends: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14s1.3 2 3.5 2 3.5-2 3.5-2"/><path d="M9 9.5h.01M15 9.5h.01"/>',
    concert: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    work: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    army: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/>',
    trip: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z"/>'
  };
  var L = { couple: "זוגי", family: "משפחה", ext: "משפחה מורחבת", friends: "חברים", concert: "הופעה", work: "עבודה", army: "צבא", trip: "טיול" };
  // the trip types as Oren names them in his Excel
  var XL = { "ליאורי": "couple", "המשפחה שלי": "family", "משפחה": "ext", "חברים": "friends", "עבודה": "work", "צבא": "army" };
  function key(t) {
    t = t || {};
    var k = t.trip_type || XL[t.type] || "";
    if (P[k]) return k;
    var w = String(t.who || ""), s = String(t.title || "") + " " + String(t.tagline || "");
    if (/הופע|concert|ENHYPEN|קונצרט/i.test(s)) return "concert";
    if (/עבודה|work/i.test(s)) return "work";
    if (/^אורן וליאור$/.test(w.trim()) || /זוג|רומנט/.test(s)) return "couple";
    if (/משפחה|ילדים|\(\d\)/.test(w)) return "family";
    return "trip";
  }
  function svg(k) { return "<svg " + A + ">" + (P[k] || P.trip) + "</svg>"; }
  // a quiet dashed flight path with a small plane, for the corner of a card (currentColor, the card sets the opacity)
  var FLIGHT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 64" fill="none" aria-hidden="true"><path d="M6 56C40 18 92 6 140 18" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 5" stroke-linecap="round"/><circle cx="6" cy="56" r="3" fill="currentColor"/><g transform="translate(140 18) rotate(16) scale(.62) translate(-12 -12)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z" fill="currentColor" fill-opacity=".15"/></g></svg>';
  // countdown: days only; under 24 hours, hours (Oren 22.11.2026). at = ms of take-off (or of the first day 00:00)
  function left(at, now) {
    now = now || Date.now(); var ms = at - now;
    if (!isFinite(ms)) return null;
    if (ms <= 0) return null;
    if (ms < 864e5) { var h = Math.max(1, Math.ceil(ms / 36e5)); return { v: h, u: h === 1 ? "שעה" : "שעות", soon: true }; }
    var d = Math.ceil(ms / 864e5); return { v: d, u: d === 1 ? "יום" : "ימים", soon: false };
  }
  window.SQTripIcons = { key: key, svg: svg, label: function (k) { return L[k] || L.trip; }, keys: Object.keys(P), FLIGHT: FLIGHT, left: left };
})();
