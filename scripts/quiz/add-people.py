"""Add reviewed Commons people to the existing quiz pool, without rebuilding it.

Usage: python3 scripts/quiz/add-people.py <wiki-out.json> <picks.csv> <repo-root> [photo-cache-dir]
- wiki-out.json: output of commons.py for the candidates (rows carry `category`).
- picks.csv: `title,wiki,category[,name]` — the candidates kept after the contact-sheet review.
- photo-cache-dir: optional folder of already resized <id>.jpg files (from the review step).
Existing people are never touched; a pick already in the pool (same id or name) is skipped.
Appends to src/lib/people.json, writes public/quiz/<id>.jpg, rewrites the credits pages.
Photo helpers and the credits writer are taken from build-pool.py so both stay identical.
"""
import csv, html, io, json, os, re, shutil, sys, time, urllib.request, urllib.error
from PIL import Image
wiki_p, picks_p, repo = sys.argv[1], sys.argv[2], sys.argv[3]
cache = sys.argv[4] if len(sys.argv) > 4 else None
UA = {'User-Agent': 'quiz-photo-lookup/0.1 (personal non-commercial script)'}
KOREAN = {'kpop', 'kdrama', 'kent', 'ksports', 'kother'}
qdir = os.path.join(repo, 'public', 'quiz')
strip = lambda s: re.sub(r'\s*\(.*\)$', '', s or '')

src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build-pool.py')).read()
helpers = src[src.index('def save('):src.index('deck = json.load')]
credits = src[src.index("json.dump(people, open(os.path.join(repo, 'src'"):src.index('print(json.dumps({k:')]
exec(helpers)  # save, STEPS, std_thumb, fetch

people_p = os.path.join(repo, 'src', 'lib', 'people.json')
people = json.load(open(people_p))
ids = {p['id'] for p in people}
names = {p['name'] for p in people} | {p['alt'] for p in people if p.get('alt')}
wiki = {(r['title'], r['wiki']): r for r in json.load(open(wiki_p))}
added, skipped = 0, []
for row in csv.DictReader(open(picks_p, encoding='utf-8-sig')):
    w = wiki.get((row['title'], row['wiki']))
    # commons.py does not list the UK Open Government Licence (free, attribution) — accept it here.
    ogl = w and w.get('license') == 'OGL 3' and w.get('thumb') and min(w.get('w') or 0, w.get('h') or 0) >= 260
    if not w or not (w.get('ok') or ogl) or not w.get('qid'):
        skipped.append(row['title'] + ' (no usable photo)'); continue
    pid = 'n' + w['qid'].lower()
    en, ko = strip(w.get('en') or w['title']), strip(w.get('ko'))
    name, alt = (ko, en) if row['category'] in KOREAN and ko else (en, None)
    if row.get('name'):  # optional 4th column: display name when the Wikidata label is not the familiar one
        name, alt = row['name'], (en if row['category'] in KOREAN else None)
    if pid in ids or name in names:
        skipped.append(row['title'] + ' (already in pool)'); continue
    path = os.path.join(qdir, pid + '.jpg')
    cached = cache and os.path.join(cache, pid + '.jpg')
    if cached and os.path.exists(cached):
        shutil.copyfile(cached, path)
    else:
        b = fetch(std_thumb(w))
        if not b:
            skipped.append(row['title'] + ' (download failed)'); continue
        save(b, path)
    e = {'id': pid, 'name': name, 'file': pid + '.jpg', 'source': 'commons', 'credit': html.unescape(w['credit']) if w.get('credit') else None, 'license': w['license'], 'url': w['page']}
    if alt and alt != name: e['alt'] = alt
    people.append(e); ids.add(pid); names.add(name); added += 1

exec(credits)  # people.json + CREDITS.md + credits.html
print('added', added, '| total', len(people))
print('skipped:', ', '.join(skipped))
