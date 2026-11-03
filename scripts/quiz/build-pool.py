"""Merge deck photos and Wikimedia Commons photos into the quiz pool.

Usage: python3 -I scripts/quiz/build-pool.py <raw-dir> <wiki-out.json> <repo-root>
- A deck person whose Wikipedia photo is free (CC / public domain, >= 260px short
  side) gets that photo with credit; otherwise the deck photo stays.
- Characters (Yoda, Elsa…) always keep the deck image.
- New people from new-people.csv are added when they have a usable photo and are
  not already in the deck.
Writes public/quiz/<id>.jpg (640px long side, q82), src/lib/people.json,
public/quiz/CREDITS.md.
"""
import io, json, os, re, sys, time, urllib.request, urllib.error
from PIL import Image
raw, wiki_p, repo = sys.argv[1], sys.argv[2], sys.argv[3]
UA = {'User-Agent': 'bready-quiz/0.1 (https://github.com/bready723/bready; personal non-commercial quiz)'}
FIX = {'Zandaya': 'Zendaya', 'Timothee Chamalet': 'Timothée Chalamet', 'Emenem': 'Eminem', 'Steven Cobert': 'Stephen Colbert',
       'Jimmy Fellon': 'Jimmy Fallon', 'Mark Walberg': 'Mark Wahlberg', 'Rory Mcllroy': 'Rory McIlroy', 'Nicholas Cage': 'Nicolas Cage',
       'Lil Naz X': 'Lil Nas X', 'The Weekend': 'The Weeknd', 'Golum': 'Gollum', 'Jodi Foster': 'Jodie Foster',
       'Leonardo Dicaprio': 'Leonardo DiCaprio', 'Beyonce': 'Beyoncé', 'Anya Taylor - Joy': 'Anya Taylor-Joy',
       'Conan O’Brien': "Conan O'Brien", 'Lebron James': 'LeBron James', 'Spiderman': 'Spider-Man', 'Chloe Moretz': 'Chloë Grace Moretz',
       'Jay Z': 'Jay-Z', 'Dr. Strange': 'Doctor Strange', 'Kamala Harris': 'Kamala Harris'}
# Hand review of the contact sheet (2026-11-03): Commons photo is the wrong person
# (안재홍 → a historical namesake) or the face is too small / hidden / dark to guess.
KEEP_DECK = {'안재홍', '조여정', 'Vin Diesel', '박세리', '최우식', '싸이', '적재', '성시경', 'Rory Mcllroy',
             'Post Malone', '김건모', '전도연', '이적', '조인성', 'Paul McCartney', '하하'}
WRONG_MATCH = {'안재홍', '다나카'}  # Wikidata resolved to a different person: ignore it entirely
DROP_NEW = {'Travis Kelce', 'Jannik Sinner', 'Caitlin Clark', 'Victor Wembanyama'}
NEW_NAME = {'Lee Jae-myung': ('이재명', 'Lee Jae-myung'), 'Pope Leo XIV': ('Pope Leo XIV', None)}
KOREAN_NEW = {'kpop', 'kdrama'}
KOREAN_EN = {'Lee Kang-in', 'An Se-young', 'Lee Jae-myung'}
qdir = os.path.join(repo, 'public', 'quiz'); os.makedirs(qdir, exist_ok=True)
hangul = lambda s: bool(re.search('[가-힣]', s or ''))

def save(img_bytes, path):
    im = Image.open(io.BytesIO(img_bytes))
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA'); bg = Image.new('RGB', im.size, (255, 255, 255)); bg.paste(im, mask=im.split()[-1]); im = bg
    else:
        im = im.convert('RGB')
    im.thumbnail((640, 640), Image.LANCZOS)
    im.save(path, 'JPEG', quality=82, optimize=True, progressive=True)

STEPS = (960, 500, 330, 250)  # Wikimedia's standard thumbnail widths (https://w.wiki/GHai)
def std_thumb(w):
    # Off-list sizes and unscaled originals are rate-limited; build a standard-step
    # thumbnail URL from the file name (Commons stores files under md5 hash dirs).
    import hashlib, urllib.parse
    name = (w.get('image') or '').replace(' ', '_')
    width = w.get('w') or 0
    step = next((s for s in STEPS if width >= s), None)
    if not name or not step: return w['thumb']
    h = hashlib.md5(name.encode('utf-8')).hexdigest()
    q = urllib.parse.quote(name)
    ext = '.png' if re.search(r'\.(svg|tiff?)$', name, re.I) else ''
    return f'https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/{step}px-{q}{ext}'

def fetch(url):
    for i in range(8):
        try:
            d = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read(); time.sleep(1.0); return d
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            time.sleep(min(30 * (i + 1), 180))
        except Exception:
            time.sleep(5 * (i + 1))
    return None

deck = json.load(open(os.path.join(raw, 'deck.json')))
prev_p = os.path.join(repo, 'src', 'lib', 'people.json')
prev = {p['id']: p for p in (json.load(open(prev_p)) if os.path.exists(prev_p) else [])}
def have(pid, page):
    p = prev.get(pid)
    if p and p.get('url') == page and os.path.exists(os.path.join(qdir, pid + '.jpg')):
        open(os.path.join(qdir, pid + '.jpg.src'), 'w').write(page); return True
    return False
wiki = {r['key']: r for r in json.load(open(wiki_p))}
people, seen_names, seen_qids, log = [], set(), set(), {'commons': 0, 'deck': 0, 'new': 0, 'new_skipped': [], 'fallback': []}
for it in deck:
    name = it['name']
    if name in seen_names: continue  # the deck has 비 twice
    seen_names.add(name)
    pid = f"d{it['slide']:03d}"; path = os.path.join(qdir, pid + '.jpg')
    w = None if name in WRONG_MATCH else wiki.get(name)
    display = FIX.get(name, name)
    entry = {'id': pid, 'name': display, 'file': pid + '.jpg'}
    if w and w.get('qid'):
        seen_qids.add(w['qid'])
        alt = w.get('en') if hangul(display) else (w.get('ko') if w.get('ko') and hangul(w.get('ko')) else None)
        if alt and alt != display: entry['alt'] = re.sub(r'\s*\(.*\)$', '', alt)
    if w and w.get('ok') and name not in KEEP_DECK:
        if not os.path.exists(path + '.src') and not have(pid, w['page']):
            b = fetch(std_thumb(w))
            if b: save(b, path); open(path + '.src', 'w').write(w['thumb'])
        if os.path.exists(path + '.src'):
            entry.update({'source': 'commons', 'credit': w.get('credit'), 'license': w['license'], 'url': w['page']})
            log['commons'] += 1; people.append(entry); continue
        log['fallback'].append(name)
    save(open(it['raw'], 'rb').read(), path)
    if os.path.exists(path + '.src'): os.remove(path + '.src')
    entry['source'] = 'deck'; log['deck'] += 1; people.append(entry)

for key, w in wiki.items():
    if not key.startswith('new:'): continue
    if not w.get('ok') or not w.get('qid') or w['qid'] in seen_qids or w['title'] in DROP_NEW:
        log['new_skipped'].append(w['title']); continue
    seen_qids.add(w['qid'])
    pid = 'n' + w['qid'].lower(); path = os.path.join(qdir, pid + '.jpg')
    if not os.path.exists(path + '.src') and not have(pid, w['page']):
        b = fetch(std_thumb(w))
        if not b: log['new_skipped'].append(w['title']); continue
        save(b, path); open(path + '.src', 'w').write(w['thumb'])
    en = re.sub(r'\s*\(.*\)$', '', w.get('en') or w['title'])
    korean = w.get('category') in KOREAN_NEW or en in KOREAN_EN
    name, alt = ((w['ko'], en) if korean and w.get('ko') else (en, None))
    name, alt = NEW_NAME.get(w['title'], (name, alt))
    e = {'id': pid, 'name': name, 'file': pid + '.jpg', 'source': 'commons', 'credit': w.get('credit'), 'license': w['license'], 'url': w['page']}
    if alt and alt != name: e['alt'] = alt
    people.append(e); log['new'] += 1

keep = {p['file'] for p in people}
for f in os.listdir(qdir):
    if f.endswith('.src') or (f.endswith('.jpg') and f not in keep): os.remove(os.path.join(qdir, f))
json.dump(people, open(os.path.join(repo, 'src', 'lib', 'people.json'), 'w'), ensure_ascii=False, indent=0)
with open(os.path.join(qdir, 'CREDITS.md'), 'w') as f:
    f.write('# Who Is This? — photo credits\n\nPhotos from Wikimedia Commons, used under the licence shown. '
            'Each was resized to 640 px. All other photos come from a personal slide deck.\n\n| Person | Author | Licence | Source |\n|---|---|---|---|\n')
    for p in sorted((p for p in people if p.get('source') == 'commons'), key=lambda p: p['name']):
        f.write(f"| {p['name']} | {(p.get('credit') or 'unknown').replace('|', '/')} | {p['license']} | [file page]({p['url']}) |\n")
import html as H
rows = ''.join(f"<tr><td>{H.escape(p['name'])}</td><td>{H.escape(p.get('credit') or 'unknown')}</td><td>{H.escape(p['license'])}</td>"
               f"<td><a href=\"{H.escape(p['url'])}\">file page</a></td></tr>\n"
               for p in sorted((p for p in people if p.get('source') == 'commons'), key=lambda p: p['name']))
open(os.path.join(qdir, 'credits.html'), 'w').write(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    '<title>Who Is This? — photo credits</title><style>body{font:15px/1.45 -apple-system,system-ui,sans-serif;margin:24px;color:#1b1430}'
    'table{border-collapse:collapse;width:100%}td,th{padding:6px 8px;border-bottom:1px solid #e6e2ef;text-align:left;vertical-align:top}'
    'th{color:#5a5170;font-weight:600}a{color:#5b3fd6}</style><h1>Who Is This? — photo credits</h1>'
    f'<p>{sum(1 for p in people if p.get("source") == "commons")} photos from Wikimedia Commons, used under the licence shown and resized to 640 px. '
    'All other photos come from a personal slide deck.</p><table><tr><th>Person</th><th>Author</th><th>Licence</th><th>Source</th></tr>\n'
    + rows + '</table>\n')
print(json.dumps({k: (v if isinstance(v, int) else len(v)) for k, v in log.items()}))
print('new skipped:', ', '.join(log['new_skipped']))
print('fallback (download failed):', ', '.join(log['fallback']))
print('total', len(people))
