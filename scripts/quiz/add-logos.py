"""Write the Logo Quiz pool from reviewed picks.

Usage: python3 scripts/quiz/add-logos.py <logo-out.json> <logo-picks.csv> <repo-root> <png-dir> [crop-dir]
- logo-out.json: output of logo-commons.py.
- logo-picks.csv: `key,name,crop` — key from the candidates (category:title), the display
  name, and crop=1 to use the symbol cut away from the wordmark (from crop-dir).
- png-dir: trimmed full logos (<id>.png) from the review step.
Rewrites src/lib/logos.json and public/logos/, then the shared credits pages
(the credits writer is taken from build-pool.py so photo and logo credits stay in one place).
"""
import csv, html, json, os, shutil, sys
from PIL import Image
out_p, picks_p, repo, pngs = sys.argv[1:5]
crops = sys.argv[5] if len(sys.argv) > 5 else None
ldir = os.path.join(repo, 'public', 'logos')
qdir = os.path.join(repo, 'public', 'quiz')
rows = {r['key']: r for r in json.load(open(out_p))}
shutil.rmtree(ldir, ignore_errors=True); os.makedirs(ldir)
logos, seen, skipped = [], set(), []
for p in csv.DictReader(open(picks_p, encoding='utf-8-sig')):
    r = rows.get(p['key'])
    if not r or not r.get('ok'):
        skipped.append(p['key']); continue
    lid = 'l' + r['qid'].lower()
    if lid in seen or p['name'] in {x['name'] for x in logos}:
        skipped.append(p['key'] + ' (dup)'); continue
    src = os.path.join(crops, lid + '.png') if p.get('crop') == '1' and crops else os.path.join(pngs, lid + '.png')
    im = Image.open(src).convert('RGBA')
    im.thumbnail((480, 480), Image.LANCZOS)
    im.save(os.path.join(ldir, lid + '.png'), 'PNG', optimize=True)
    e = {'id': lid, 'name': p['name'], 'file': lid + '.png', 'source': 'commons', 'credit': html.unescape(r['credit']) if r.get('credit') else None, 'license': r['license'], 'url': r['page']}
    en = (r.get('en') or '').strip()
    if en and en != p['name']: e['alt'] = en
    logos.append(e); seen.add(lid)
json.dump(logos, open(os.path.join(repo, 'src', 'lib', 'logos.json'), 'w'), ensure_ascii=False, indent=0)

# credits: re-run the shared writer with the current people pool
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build-pool.py')).read()
people = json.load(open(os.path.join(repo, 'src', 'lib', 'people.json')))
exec(src[src.index("json.dump(people, open(os.path.join(repo, 'src'"):src.index('print(json.dumps({k:')])
print('logos', len(logos), '| skipped:', ', '.join(skipped) or 'none')
