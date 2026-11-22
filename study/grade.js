/* study/grade.js: "✅ בדוק שאלות" (אורן 21.11.2026, כלל לכל תוכן עם תשובות פתוחות, לכל הילדים).
 * הילד שולח תשובות פתוחות (study_answer_add), וכשהוא מסיים לוחץ "בדוק שאלות": השרת (study-grade) מעיר פעם אחת את Claude,
 * שבודק את כל התשובות שמחכות ומחזיר ציון והערה (הדף כבר קורא אותם ב-study_answer_get). אין יותר ריצה מתוזמנת כל שעה.
 * רשת ביטחון: תשובה שנשלחה ולא ביקשו לבדוק אותה 3 שעות = הבקשה נשלחת לבד כשהדף פתוח.
 *
 * StudyGrade.mount({kid, app, boy, el, pending, onFired, pop})
 *   el       = <button> קבוע בדף (הטקסט שלו מתחלף, הגודל לא: לתת לו רוחב קבוע ב-CSS)
 *   pending  = () => [{id, at}] התשובות שנשלחו לשרת ועוד בלי ציון (at = ISO של השליחה)
 *   onFired  = () => {} אחרי שהבדיקה הוערה (למשל לבדוק ציונים לעיתים קרובות יותר)
 *   pop      = (html) => {} חלון של הדף (אחרת חלון של המודול)
 * StudyGrade.ask() = כמו לחיצה על הכפתור. StudyGrade.refresh() = לעדכן את מצב הכפתור (אחרי שליחת תשובה / קבלת ציון).
 * StudyGrade.next() = מתי הבדיקה הבאה ("היום ב-18:50"). Claude בודק 3 פעמים ביום בלבד (אורן 22.11.2026), הכפתור רק מכניס לתור.
 * StudyGrade.btn(label) = HTML של כפתור "בדוק שאלות" לחלונות של הדף (onclick קורא ל-ask).
 * מפתח במכשיר: study_grq_<kid>_<app> = זמן הבקשה האחרונה (ms). לא באורח (אין שליחה לשרת).
 */
(function () {
  var FN = 'https://emgtyfksnofzzlutngbf.supabase.co/functions/v1/study-grade',
    KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZ3R5Zmtzbm9menpsdXRuZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDI0MTMsImV4cCI6MjEwNjgxODQxM30.b7XE-gbCUlXMqpza1Bn9GvMKQsmu3jKP2eqZ0r4-k2k',
    AUTO = 3 * 36e5, O = null, busy = false;
  function lsk() { return 'study_grq_' + O.kid + '_' + O.app }
  function lastReq() { try { return +localStorage.getItem(lsk()) || 0 } catch (e) { return 0 } }
  function setReq(t) { try { localStorage.setItem(lsk(), String(t)) } catch (e) {} }
  // Claude בודק 3 פעמים ביום בלבד (אורן 22.11.2026): 15:50, 18:50, 21:50 שעון ישראל
  var SLOTS = [[15, 50], [18, 50], [21, 50]];
  function nextT() {
    var d = new Date(), il;
    try { il = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })) } catch (e) { il = d }
    var m = il.getHours() * 60 + il.getMinutes();
    for (var i = 0; i < SLOTS.length; i++) if (SLOTS[i][0] * 60 + SLOTS[i][1] > m) return 'היום ב-' + SLOTS[i][0] + ':' + SLOTS[i][1];
    return 'מחר ב-' + SLOTS[0][0] + ':' + SLOTS[0][1];
  }
  function g(m, f) { return O.boy ? m : f }
  function list() { try { return (O.pending() || []).filter(function (o) { return o && o.id }) } catch (e) { return [] } }
  function waiting() { var L = lastReq(); return list().filter(function (o) { return !o.at || Date.parse(o.at) > L }) }
  function css() {
    if (document.getElementById('sgrcss')) return;
    var s = document.createElement('style'); s.id = 'sgrcss';
    s.textContent = '.sgr{position:relative;transition:background .2s,color .2s}.sgr.go{background:#2f5d9e!important;color:#fff!important;animation:sgrp 1.6s ease-in-out infinite}' +
      '.sgr.ck{background:#fef3c7!important;color:#92400e!important}.sgr .sgn{display:inline-block;min-width:16px;margin-inline-start:3px;border-radius:9px;background:#fff;color:#2f5d9e;font-size:11px;font-weight:800;line-height:16px;text-align:center}' +
      '@keyframes sgrp{0%,100%{box-shadow:0 0 0 0 rgba(47,93,158,.45)}50%{box-shadow:0 0 0 5px rgba(47,93,158,0)}}@media(prefers-reduced-motion:reduce){.sgr.go{animation:none}}' +
      '#sgrov{position:fixed;inset:0;z-index:60;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center;padding:16px}#sgrov.on{display:flex}' +
      '#sgrov .b{background:#fff;border-radius:18px;padding:16px;max-width:360px;width:100%;text-align:center;font:16px/1.5 system-ui,Arial,sans-serif;color:#0f172a}#sgrov h3{margin:0 0 6px;font-size:19px}#sgrov p{margin:6px 0}' +
      '#sgrov button,.sgrb{display:block;width:100%;height:46px;margin-top:10px;border:0;border-radius:12px;background:#2f5d9e;color:#fff;font:700 16px system-ui,Arial,sans-serif;cursor:pointer}';
    document.head.appendChild(s);
  }
  function myPop(h) {
    var v = document.getElementById('sgrov');
    if (!v) { v = document.createElement('div'); v.id = 'sgrov'; v.innerHTML = '<div class="b"></div>'; document.body.appendChild(v); v.onclick = function (e) { if (e.target === v) v.classList.remove('on') } }
    v.querySelector('.b').innerHTML = h + '<button type="button" onclick="this.closest(\'#sgrov\').classList.remove(\'on\')">' + g('הבנתי, ממשיך', 'הבנתי, ממשיכה') + ' ›</button>';
    v.classList.add('on');
  }
  function show(h) { if (O.pop) O.pop(h + '<button class="sgrb" type="button" onclick="(window.unpop||function(){})()">' + g('הבנתי, ממשיך', 'הבנתי, ממשיכה') + ' ›</button>'); else myPop(h) }
  function refresh() {
    if (!O || !O.el) return;
    var w = waiting().length, all = list().length, el = O.el;
    el.classList.add('sgr'); el.classList.toggle('go', w > 0); el.classList.toggle('ck', !w && all > 0);
    el.innerHTML = w ? '✅ בדוק שאלות<span class="sgn" dir="ltr">' + w + '</span>' : all ? '⏳ בבדיקה' : '✅ בדוק שאלות';
  }
  function call(q) {
    return fetch(FN + '?' + q, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY }, body: '{}' })
      .then(function (r) { return r.json() });
  }
  function ask(silent) {
    if (!O || busy) return;
    if (window.STUDY_GUEST) { if (!silent) show('<h3>מצב אורח</h3><p>במצב אורח התשובות לא נשלחות לבדיקה. ההשוואה לתשובה לדוגמה מופיעה מיד אחרי שכותבים.</p>'); return }
    var w = waiting(), all = list();
    if (!w.length) {
      if (silent) return;
      if (all.length) show('<h3>⏳ Claude ' + 'בודק</h3><p>התשובות שלך כבר נשלחו לבדיקה. הציונים יקפצו כאן אחרי הבדיקה הבאה (' + nextT() + ').</p><p>Claude בודק תשובות 3 פעמים ביום: 15:50, 18:50 ו-21:50.</p>');
      else show('<h3>✅ בדוק שאלות</h3><p>עוד אין תשובות שמחכות לבדיקה. ' + g('כתוב תשובה לשאלה פתוחה ושלח אותה', 'כתבי תשובה לשאלה פתוחה ושלחי אותה') + ', וכש' + g('תסיים', 'תסיימי') + ' ' + g('לחץ', 'לחצי') + ' כאן.</p>');
      return;
    }
    busy = true; var t0 = Date.now();
    if (!silent && O.el) { O.el.classList.remove('go'); O.el.innerHTML = '📨 שולח…' }
    call('action=req&kid=' + encodeURIComponent(O.kid) + '&app=' + encodeURIComponent(O.app)).then(function (j) {
      busy = false;
      if (j && j.ok && (j.fired || j.wait || j.sched || j.n === 0)) {
        setReq(t0); refresh(); if (O.onFired) try { O.onFired() } catch (e) {}
        if (!silent) show(j.n === 0 ? '<h3>✓ הכול נבדק</h3><p>אין תשובות שמחכות. הציונים כבר אצלך.</p>' :
          '<h3>📨 התשובות בתור לבדיקה!</h3><p>' + (j.n || w.length) + ' ' + ((j.n || w.length) === 1 ? 'תשובה מחכה' : 'תשובות מחכות') + ' לבדיקה. Claude בודק 3 פעמים ביום, והבדיקה הבאה ' + nextT() + '. הציון וההערה יקפצו כאן לבד.</p><p>בינתיים אפשר להמשיך ללמוד.</p>');
      } else {
        refresh();
        if (!silent) show('<h3>עוד רגע…</h3><p>הבקשה לא יצאה הפעם. התשובות שמורות, ' + g('נסה', 'נסי') + ' ללחוץ שוב בעוד דקה.</p>');
      }
    }).catch(function () {
      busy = false; refresh();
      if (!silent) show('<h3>אין אינטרנט?</h3><p>הבקשה לא נשלחה. התשובות שמורות, ' + g('נסה', 'נסי') + ' שוב כשיש חיבור.</p>');
    });
  }
  // רשת ביטחון: תשובות שנשלחו לפני 3 שעות ועוד לא ביקשו לבדוק אותן
  function auto() {
    if (!O || window.STUDY_GUEST || document.visibilityState !== 'visible') return;
    var old = waiting().filter(function (o) { return o.at && Date.now() - Date.parse(o.at) > AUTO });
    if (old.length) ask(true);
  }
  window.StudyGrade = {
    mount: function (o) {
      O = o; css();
      if (O.el) O.el.addEventListener('click', function () { ask(false) });
      refresh(); setTimeout(auto, 4000); setInterval(function () { refresh(); auto() }, 5 * 60e3);
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { refresh(); auto() } });
    },
    ask: function () { ask(false) }, refresh: refresh, next: nextT,
    waiting: function () { return O ? waiting().length : 0 },
    btn: function (label) { return '<button class="sgrb" type="button" onclick="StudyGrade.ask()">' + (label || '✅ בדוק שאלות עכשיו') + '</button>' }
  };
})();
