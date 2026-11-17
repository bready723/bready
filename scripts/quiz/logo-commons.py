"""Resolve brand Wikipedia titles -> Wikidata logo (P154) -> Commons licence + 512px thumb.

Usage: python3 -I scripts/quiz/logo-commons.py <in.json> <out.json>
in.json = [{key, title, wiki: 'en'|'ko', category}]; out.json adds qid, en, ko, image, license,
credit, page, thumb, w, h, ok (free licence; SVGs at any size, bitmaps short side >= MIN_SHORT).
Same flow as commons.py (people photos) but reads the logo property and keeps every
logo version, preferring the one Wikidata ranks "preferred", else the newest listed.
Polite: one request at a time, backs off on 429, caches every answer.
"""
import json, os, re, sys, time, urllib.request, urllib.parse, urllib.error
UA = {'User-Agent': 'quiz-logo-lookup/0.1 (personal non-commercial script)'}
MIN_SHORT = 200
inp, outp = sys.argv[1], sys.argv[2]
cache_p = os.path.join(os.path.dirname(outp) or '.', 'logo-api-cache.json')
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
def get(url, data):
    key = url + '?' + urllib.parse.urlencode(sorted(data.items()))
    if key in cache: return cache[key]
    for i in range(10):
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode(), headers=UA)
            d = json.load(urllib.request.urlopen(req, timeout=60))
            cache[key] = d; json.dump(cache, open(cache_p, 'w')); time.sleep(1.0); return d
        except urllib.error.HTTPError as e:
            ra = e.headers.get('Retry-After'); w = float(ra) if ra and ra.isdigit() else 8 * (i + 1)
            print(f'  {e.code}, waiting {min(w, 120):.0f}s', file=sys.stderr); time.sleep(min(w, 120))
        except Exception as e:
            print('  retry', e, file=sys.stderr); time.sleep(5 * (i + 1))
    raise SystemExit('gave up')

def pick_logo(claims):
    vals = [c for c in claims.get('P154', []) if c['mainsnak'].get('datavalue')]
    if not vals: return None
    pref = [c for c in vals if c.get('rank') == 'preferred']
    return (pref or vals)[-1 if not pref else 0]['mainsnak']['datavalue']['value']

rows = json.load(open(inp))
for wiki in ('en', 'ko'):
    rs = [r for r in rows if r['wiki'] == wiki]
    for i in range(0, len(rs), 50):
        ch = rs[i:i + 50]
        q = get(f'https://{wiki}.wikipedia.org/w/api.php', {'action': 'query', 'format': 'json', 'redirects': 1, 'prop': 'pageprops', 'ppprop': 'wikibase_item|disambiguation', 'titles': '|'.join(r['title'] for r in ch)})['query']
        nm = {x['from']: x['to'] for x in q.get('normalized', [])}; red = {x['from']: x['to'] for x in q.get('redirects', [])}
        pages = {p['title']: p for p in q.get('pages', {}).values()}
        for r in ch:
            t = nm.get(r['title'], r['title']); t = red.get(t, t); pp = pages.get(t, {}).get('pageprops', {})
            r['qid'] = None if 'disambiguation' in pp else pp.get('wikibase_item')
fd = [r for r in rows if r.get('qid')]
for i in range(0, len(fd), 50):
    ch = fd[i:i + 50]
    ents = get('https://www.wikidata.org/w/api.php', {'action': 'wbgetentities', 'format': 'json', 'props': 'claims|labels', 'languages': 'en|ko', 'ids': '|'.join(r['qid'] for r in ch)})['entities']
    for r in ch:
        e = ents.get(r['qid'], {})
        r['image'] = pick_logo(e.get('claims', {}))
        r['en'] = e.get('labels', {}).get('en', {}).get('value'); r['ko'] = e.get('labels', {}).get('ko', {}).get('value')
wi = [r for r in fd if r.get('image')]
for i in range(0, len(wi), 40):
    ch = wi[i:i + 40]
    q = get('https://commons.wikimedia.org/w/api.php', {'action': 'query', 'format': 'json', 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': 500, 'iiextmetadatafilter': 'LicenseShortName|Artist', 'titles': '|'.join('File:' + r['image'] for r in ch)})['query']
    nm = {x['from']: x['to'] for x in q.get('normalized', [])}; pages = {p['title']: p for p in q.get('pages', {}).values()}
    for r in ch:
        t = 'File:' + r['image']; ii = (pages.get(nm.get(t, t), {}).get('imageinfo') or [{}])[0]; md = ii.get('extmetadata', {})
        r['license'] = md.get('LicenseShortName', {}).get('value')
        r['credit'] = re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', md.get('Artist', {}).get('value', ''))).strip()[:80] or None
        r['page'] = ii.get('descriptionurl'); r['thumb'] = ii.get('thumburl') or ii.get('url'); r['w'] = ii.get('width'); r['h'] = ii.get('height')
for r in rows:
    lic = r.get('license') or ''
    svg = (r.get('image') or '').lower().endswith('.svg')
    big = svg or min(r.get('w') or 0, r.get('h') or 0) >= MIN_SHORT
    r['ok'] = bool(r.get('thumb') and re.match(r'(CC|Public domain|PD|GODL|KOGL|Attribution)', lic, re.I) and 'NC' not in lic and 'ND' not in lic and big)
json.dump(rows, open(outp, 'w'), ensure_ascii=False, indent=1)
print(f"{sum(r['ok'] for r in rows)} of {len(rows)} usable")
for r in rows:
    if not r['ok']: print('  skip:', r['key'], '|', r.get('qid'), r.get('image'), r.get('license'), file=sys.stderr)
