#!/usr/bin/env python3
# בונה קבצים שנגזרים מקבצים אחרים ב-study (9.11.2026). מריצים אחרי כל שינוי במקור:  python3 study/tools/build.py
# 1. levi/phonics/index.html  ← lia/phonics/index.html (אותו שיעור אחד לאחד: מפתחות levi_ph, לשון זכר, הסקווישים של לביא, השמע מהתיקייה של ליה)
# 2. dani/squishies.js        ← הסקווישים שבתוך dani/spelling/index.html + dani/math6/squishies.part.js (הלוח האחד של דני: הכתבה, חיזוק מתמטיקה, לוח משפחתי)
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def wr(p, s):
    open(os.path.join(ROOT, p), 'w', encoding='utf-8').write(s); print('wrote', p)

# ---------- 1. Levi phonics ----------
s = rd('lia/phonics/index.html')
REP = [  # (מה, במה) — כל אחד חייב להופיע במקור, כדי ששינוי אצל ליה לא ישבור בשקט
  ("StudyContent.guard('lia/phonics')", "StudyContent.guard('levi/phonics')"),
  ("StudyTrack.init('lia',", "StudyTrack.init('levi',"),
  ("StudyGuess.init('lia',", "StudyGuess.init('levi',"),
  ("'lia_ph", "'levi_ph"),
  ('מפתחות: lia_ph (התקדמות), lia_ph_sq', 'מפתחות: levi_ph (התקדמות), levi_ph_sq'),
  ('lia_ph_mute.', 'levi_ph_mute.'),
  ('<script src="audio/list.js', '<script src="../../lia/phonics/audio/list.js'),
  ("new Audio('audio/'+f", "new Audio('../../lia/phonics/audio/'+f"),
  ('<script src="../squishies.js?v=5"></script>', '<script src="../squishies.js?v=1"></script>'),
  ('LiaSquishies', 'LeviSquishies'),
  ("const EK='lia'", "const EK='levi'"),
  ('היי ליה! 🚀', 'היי לביא! 🚀'),
  ('<li>6 קבוצות.', '<li>7 קבוצות.'),
  ('יאללה, מתחילות!', 'יאללה, מתחילים!'),
  ('לחצי עליו כדי למעוך', 'לחץ עליו כדי למעוך'),
  ('אחר כך, ממשיכות', 'אחר כך, ממשיכים'),
  ("'את תותחית!'", "'אתה תותח!'"),
  ("'אלופה! 🌟'", "'אלוף! 🌟'"),
  ('כמו אמריקאית אמיתית', 'כמו אמריקאי אמיתי'),
  ('בשביל זה מתרגלות', 'בשביל זה מתרגלים'),
  ('עכשיו את כבר יודעת', 'עכשיו אתה כבר יודע'),
  ('עכשיו מחזקות אותם', 'עכשיו מחזקים אותם'),
  ('הבנתי, בואי נתרגל', 'הבנתי, בוא נתרגל'),
  ('הקשיבי', 'הקשב'),
  ('קראי את המילה באנגלית, ובחרי', 'קרא את המילה באנגלית, ובחר'),
  ('לחצי על כל כפתור כדי לשמוע, ובחרי', 'לחץ על כל כפתור כדי לשמוע, ובחר'),
  ('והסתכלי בתמונה', 'והסתכל בתמונה'),
  ('ובני אותה', 'ובנה אותה'),
  ('את בנית:', 'אתה בנית:'),
  ('את יודעת את הצלילים', 'אתה יודע את הצלילים'),
  ('בואי נבדוק', 'בוא נבדוק'),
  ('>ממשיכות ←<', '>ממשיכים ←<'),
  ('50 תשובות נכונות</b>. אלופה!', '50 תשובות נכונות</b>. אלוף!'),
  ('לחצי על סקווישי כדי להכיר אותו', 'לחץ על סקווישי כדי להכיר אותו'),
  ('🪐 צוות החלל', '🧱 חבורת הלגו'),
  ('לצוות החלל', 'לחבורת הלגו'),
  ('כל הצוות אצלך!', 'כל החבורה אצלך!'),
  ('שלב 1: לומדת צלילים', 'שלב 1: לומד צלילים'),
  ('🪐', '🧱'),
]
for a, b in REP:
    if a not in s: sys.exit('build.py: לא נמצא במקור של ליה: ' + a)
    s = s.replace(a, b)
s = s.replace('<!doctype html>', '<!doctype html>\n<!-- נוצר אוטומטית מ-lia/phonics/index.html ע"י study/tools/build.py. לא לערוך כאן: לשנות אצל ליה ולהריץ שוב. -->', 1)
for bad in ['lia_ph', "'lia'", 'LiaSquishies', 'ליה!']:
    if bad in s: sys.exit('build.py: נשאר ' + bad)
wr('levi/phonics/index.html', s)

# ---------- 2. Dani squishies ----------
d = rd('dani/spelling/index.html')
a = d.index('function face(cx,cy,s)', d.index('// ---------- סקווישים ----------'))
b = d.index('const ALLSQ=', a)
body = d[a:b].rstrip()
# + השורה הרביעית "🎤 סיבוב הופעות" של חיזוק המתמטיקה (dani/math6/squishies.part.js, 15.11.2026), ו-owned/sync של הלוח האחד
part = rd('dani/math6/squishies.part.js').rstrip()
js = ('// נוצר אוטומטית מ-dani/spelling/index.html + dani/math6/squishies.part.js ע"י study/tools/build.py (הלוח האחד של דני). לא לערוך כאן.\n'
      '(function(){\n' + body + '\n' + part + '\n'
      'window.DaniSquishies={list:SQS,list2:SQS2,list3:SQS3,list4:SQS4,aura,uaura,orb:stage,owned,sync,keys:KEYS,all:SQS.concat(SQS2,SQS3,SQS4),rows:["💜 הלהקה","⭐ סופר סקווישים","💎 אולטרה סקווישים","🎤 סיבוב הופעות: חיזוק מתמטיקה"]};\n})();\n')
wr('dani/squishies.js', js)
