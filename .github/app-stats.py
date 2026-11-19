#!/usr/bin/env python3
"""נתוני פיתוח לכל אפליקציה במאגר (אורן 18.11.2026): מתי נוצרה, כמה גרסאות שוחררו, הגרסה האחרונה.
גרסה = עדכון שנכנס ל-main (PR שמוזג או קומיט ישיר) ונגע בתיקייה (כל מיזוג = פריסה ב-GitHub Pages).
כותב app-stats.json בשורש המאגר. Side Quests קורא אותו בדשבורד הסטטיסטיקה של כל פרויקט ב-AI Projects.
רץ ב-GitHub Actions אחרי כל מיזוג (.github/workflows/app-stats.yml), וגם ידנית: python3 .github/app-stats.py"""
import json, re, subprocess, collections, datetime, os

APPS = ["side-quests", "study", "sandwich", "netflix-il", "frida", "movies", "trips"]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def git(*a):
    return subprocess.run(["git", "-C", ROOT, *a], capture_output=True, text=True, check=True).stdout


def read(p):
    try:
        return open(os.path.join(ROOT, p), encoding="utf-8").read()
    except OSError:
        return ""


def cur_version(app):
    if app == "side-quests":
        m = re.search(r'SQ_BUILD="([^"]+)"', read("side-quests/index.html"))
        return m and m.group(1)
    if app == "sandwich":
        m = re.search(r'RELEASES\s*=\s*\[\s*\{v:\s*"([^"]+)"', read("sandwich/app.js"))
        return m and m.group(1)
    if app == "trips":
        m = re.search(r'trip-view\.js\?v=([\w.]+)', read("trips/index.html"))
        return m and ("v" + m.group(1))
    m = re.search(r'app\.js\?v=([\w.]+)', read(app + "/index.html"))
    return m and ("v" + m.group(1))


def size(app):
    files, lines = 0, 0
    for d, _, fs in os.walk(os.path.join(ROOT, app)):
        for f in fs:
            if f.endswith((".html", ".js", ".css", ".py", ".sql", ".ts")):
                files += 1
                try:
                    lines += sum(1 for _ in open(os.path.join(d, f), encoding="utf-8", errors="ignore"))
                except OSError:
                    pass
    return files, lines


def main():
    out = {"generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "apps": {}}
    for app in APPS:
        log = git("log", "--format=%H\t%aI\t%s", "--", app).strip().splitlines()
        if not log:
            continue
        rows = [l.split("\t", 2) for l in log]  # newest first
        # כל קומיט ב-first-parent של main = פריסה אחת (squash של PR או קומיט ישיר)
        fp = set(git("log", "--first-parent", "--format=%H", "--", app).split())
        rel = [r for r in rows if r[0] in fp] or rows
        weeks = collections.Counter()
        days = set()
        for _, at, _ in rel:
            d = datetime.date.fromisoformat(at[:10])
            days.add(at[:10])
            weeks[(d - datetime.timedelta(days=(d.weekday() + 1) % 7)).isoformat()] += 1
        files, lines = size(app)
        last = rel[0]
        out["apps"][app] = {
            "created": rows[-1][1],
            "commits": len(rows),
            "releases": len(rel),
            "release_days": len(days),
            "last_release": {"at": last[1], "title": re.sub(r"\s*\(#\d+\)\s*$", "", last[2])[:140],
                             "pr": (re.search(r"\(#(\d+)\)\s*$", last[2]) or [None, None])[1]},
            "recent": [{"at": r[1], "title": re.sub(r"\s*\(#\d+\)\s*$", "", r[2])[:100]} for r in rel[:6]],
            "weeks": sorted(weeks.items())[-12:],
            "version": cur_version(app),
            "files": files, "lines": lines,
        }
    with open(os.path.join(ROOT, "app-stats.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
