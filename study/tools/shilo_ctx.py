# ניסוי הטעמה בהקשר (10.11.2026): מייצר משפטים שלמים מ-shilo/letters/audio/try/ctx.json
# בקול he-IL-HilaNeural, כדי לגזור מהם את "לָמֶד" ו"דָּלֶת" במלעיל (כמו "אָלֶף"). הקבצים: try/raw/<id>.mp3.
# הרצה במחשב (השירות חסום בענן):  python study/tools/shilo_ctx.py
import asyncio, json, os, sys, time
import edge_tts
HERE = os.path.dirname(os.path.abspath(__file__))
T = os.path.join(HERE, '..', 'shilo', 'letters', 'audio', 'try')
VOICE = os.environ.get('SHILO_VOICE', 'he-IL-HilaNeural')
async def one(text, path, rate):
    for i in range(4):
        try:
            await edge_tts.Communicate(text, VOICE, rate=rate).save(path)
            if os.path.getsize(path) > 500: return True
        except Exception as e:
            print('retry', text, e, file=sys.stderr); time.sleep(2 + i * 2)
    return False
async def main():
    os.makedirs(os.path.join(T, 'raw'), exist_ok=True)
    n = 0
    for it in json.load(open(os.path.join(T, 'ctx.json'), encoding='utf-8')):
        for suf, rate in (('', '-12%'), ('s', '-30%')):
            p = os.path.join(T, 'raw', it['id'] + suf + '.mp3')
            if (os.path.exists(p) and os.path.getsize(p) > 500) or await one(it['t'], p, rate): n += 1
            else: print('FAILED', it['id'], suf, file=sys.stderr)
    print('done', n)
asyncio.run(main())
