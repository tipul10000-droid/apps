#!/usr/bin/env python3
"""Rewrites the PRE list in side-quests/sw.js: every page, script, style and image of the app,
so all dashboards open offline from the first visit. Run after adding a dashboard/file: python3 side-quests/offline-list.py"""
import os, re
here = os.path.dirname(os.path.abspath(__file__))
ext = ('.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.json')
skip_dirs = {'supabase', 'shortcuts'}
skip = {'sw.js', 'offline-list.py'}
files = []
for root, dirs, fs in os.walk(here):
    dirs[:] = [d for d in dirs if d not in skip_dirs and not d.startswith('.')]
    for f in fs:
        if f.endswith(ext) and f not in skip:
            files.append(os.path.relpath(os.path.join(root, f), here).replace(os.sep, '/'))
# 25.84: the trip dashboard's view + pictures and appstat.js live next to side-quests/ (the service worker saves them too)
par = os.path.dirname(here)
for root, dirs, fs in os.walk(os.path.join(par, 'trips')):
    dirs[:] = [d for d in dirs if d not in {'tools'} and not d.startswith('.')]
    if os.path.abspath(root) != os.path.join(par, 'trips') and os.path.basename(root) != 'img':
        continue
    for f in fs:
        if f.endswith(ext) and f != 'index.html':
            files.append('../' + os.path.relpath(os.path.join(root, f), par).replace(os.sep, '/'))
files.append('../appstat.js')
files.sort(key=lambda p: (p != 'index.html', p))
sw = os.path.join(here, 'sw.js')
s = open(sw, encoding='utf-8').read()
new = 'var PRE = [' + ', '.join('"%s"' % f for f in files) + '];'
s = re.sub(r'var PRE = \[.*?\];', new, s, count=1, flags=re.S)
open(sw, 'w', encoding='utf-8').write(s)
print(len(files), 'files')
