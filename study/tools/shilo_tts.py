# קולות למשחק של שילה (10.11.2026): מייצר mp3 לכל טקסט ב-shilo/letters/audio/clips.json
# בקול העברי של מיקרוסופט (he-IL-HilaNeural, דרך edge-tts, בלי חשבון ובלי תשלום), ואז כותב audio/list.js.
# הרצה (במחשב, לא בענן: השירות חסום שם):  pip install edge-tts  &&  python study/tools/shilo_tts.py
import asyncio, json, os, sys, time
import edge_tts
HERE = os.path.dirname(os.path.abspath(__file__))
AUD = os.path.join(HERE, '..', 'shilo', 'letters', 'audio')
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
    clips = json.load(open(os.path.join(AUD, 'clips.json'), encoding='utf-8'))
    ok = {}
    for text, name in clips.items():
        p = os.path.join(AUD, name + '.mp3')
        if (os.path.exists(p) and os.path.getsize(p) > 500) or await one(text, p): ok[text] = name
        else: print('FAILED', name, text, file=sys.stderr)
    v = int(time.time()) % 100000
    with open(os.path.join(AUD, 'list.js'), 'w', encoding='utf-8') as f:
        f.write('// נוצר ע"י study/tools/shilo_tts.py (%s, %d/%d קבצים). טקסט ← קובץ mp3.\n' % (VOICE, len(ok), len(clips)))
        f.write('window.SHILO_AUD=' + json.dumps(ok, ensure_ascii=False) + ';window.SHILO_AUD_V=%d;\n' % v)
    print('done', len(ok), 'of', len(clips))
asyncio.run(main())
