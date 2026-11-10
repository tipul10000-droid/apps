# ניסוי הטעמה (10.11.2026): לכל מילה ב-shilo/letters/audio/try/try.json מייצר כמה גרסאות כתיב
# בקול he-IL-HilaNeural, כדי שאורן יבחר באוזן את הגרסה שנשמעת נכון (מלעיל/מלרע). הקבצים: try/<id>_<n>.mp3.
# הרצה במחשב (השירות חסום בענן):  python study/tools/shilo_try.py
import asyncio, json, os, sys, time
import edge_tts
HERE = os.path.dirname(os.path.abspath(__file__))
T = os.path.join(HERE, '..', 'shilo', 'letters', 'audio', 'try')
VOICE = os.environ.get('SHILO_VOICE', 'he-IL-HilaNeural')
async def one(text, path):
    for i in range(4):
        try:
            await edge_tts.Communicate(text, VOICE, rate='-12%').save(path)
            if os.path.getsize(path) > 500: return True
        except Exception as e:
            print('retry', text, e, file=sys.stderr); time.sleep(2 + i * 2)
    return False
async def main():
    items = json.load(open(os.path.join(T, 'try.json'), encoding='utf-8'))
    n = 0
    for it in items:
        for j, text in enumerate(it['v']):
            p = os.path.join(T, '%s_%d.mp3' % (it['id'], j))
            if (os.path.exists(p) and os.path.getsize(p) > 500) or await one(text, p): n += 1
            else: print('FAILED', it['id'], j, text, file=sys.stderr)
    print('done', n)
asyncio.run(main())
