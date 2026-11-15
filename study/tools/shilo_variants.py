# גרסאות הקלטה לבדיקה של אורן (15.11.2026): לכל פריט ב-shilo/<תיקייה>/audio/check/try.json מייצר כמה גרסאות
# בקול he-IL-HilaNeural (כתיב אחר, בלי ניקוד, ספרות, אותיות לטיניות, או קצב איטי יותר).
# פריט: {"id": "n007", "w": "שֶׁבַע", "v": ["שבע", ["שֶׁבַע", "-28%"], ...]}. קובץ: check/<id>_<j>.mp3 (j מ-1; 0 = ההקלטה הנוכחית).
# הרצה במחשב (השירות חסום בענן):  python study/tools/shilo_variants.py numbers
import asyncio, json, os, sys, time
import edge_tts
HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, '..', 'shilo', sys.argv[1] if len(sys.argv) > 1 else 'numbers', 'audio', 'check')
VOICE = os.environ.get('SHILO_VOICE', 'he-IL-HilaNeural')
async def one(text, rate, path):
    for i in range(4):
        try:
            await edge_tts.Communicate(text, VOICE, rate=rate).save(path)
            if os.path.getsize(path) > 500: return True
        except Exception as e:
            print('retry', text, e, file=sys.stderr); time.sleep(2 + i * 2)
    return False
async def main():
    n = 0
    for it in json.load(open(os.path.join(D, 'try.json'), encoding='utf-8')):
        for j, v in enumerate(it['v'], 1):
            text, rate = (v if isinstance(v, list) else [v, '-12%'])
            p = os.path.join(D, '%s_%d.mp3' % (it['id'], j))
            if (os.path.exists(p) and os.path.getsize(p) > 500) or await one(text, rate, p): n += 1
            else: print('FAILED', it['id'], j, text, file=sys.stderr)
    print('done', n)
asyncio.run(main())
