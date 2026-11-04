"""Resolve Wikipedia titles -> Wikidata photo (P18) -> Commons licence + 800px thumb.

Usage: python3 -I scripts/quiz/commons.py <in.json> <out.json>
in.json = [{key, title, wiki: 'en'|'ko'}]; out.json adds qid, en, ko, image, license,
credit, page, thumb, w, h, ok (free licence and short side >= MIN_SHORT).
Polite: one request at a time, backs off on 429, caches every answer.
"""
import json, os, re, sys, time, urllib.request, urllib.parse, urllib.error
UA = {'User-Agent': 'bready-quiz/0.1 (personal non-commercial project; github.com/bready723)'}
MIN_SHORT = 260
inp, outp = sys.argv[1], sys.argv[2]
cache_p = os.path.join(os.path.dirname(outp) or '.', 'api-cache.json')
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
def get(url, data):
    key = url + '?' + urllib.parse.urlencode(sorted(data.items()))
    if key in cache: return cache[key]
    for i in range(10):
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode(), headers=UA)
            d = json.load(urllib.request.urlopen(req, timeout=60))
            cache[key] = d; json.dump(cache, open(cache_p, 'w')); time.sleep(1.2); return d
        except urllib.error.HTTPError as e:
            ra = e.headers.get('Retry-After'); w = float(ra) if ra and ra.isdigit() else 8 * (i + 1)
            print(f'  {e.code}, waiting {min(w, 120):.0f}s', file=sys.stderr); time.sleep(min(w, 120))
        except Exception as e:
            print('  retry', e, file=sys.stderr); time.sleep(5 * (i + 1))
    raise SystemExit('gave up')
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
        e = ents.get(r['qid'], {}); c = e.get('claims', {})
        p18 = c.get('P18', []); r['image'] = p18[0]['mainsnak'].get('datavalue', {}).get('value') if p18 else None
        r['en'] = e.get('labels', {}).get('en', {}).get('value'); r['ko'] = e.get('labels', {}).get('ko', {}).get('value')
wi = [r for r in fd if r.get('image')]
for i in range(0, len(wi), 40):
    ch = wi[i:i + 40]
    q = get('https://commons.wikimedia.org/w/api.php', {'action': 'query', 'format': 'json', 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': 800, 'iiextmetadatafilter': 'LicenseShortName|Artist', 'titles': '|'.join('File:' + r['image'] for r in ch)})['query']
    nm = {x['from']: x['to'] for x in q.get('normalized', [])}; pages = {p['title']: p for p in q.get('pages', {}).values()}
    for r in ch:
        t = 'File:' + r['image']; ii = (pages.get(nm.get(t, t), {}).get('imageinfo') or [{}])[0]; md = ii.get('extmetadata', {})
        r['license'] = md.get('LicenseShortName', {}).get('value')
        r['credit'] = re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', md.get('Artist', {}).get('value', ''))).strip()[:80] or None
        r['page'] = ii.get('descriptionurl'); r['thumb'] = ii.get('thumburl') or ii.get('url'); r['w'] = ii.get('width'); r['h'] = ii.get('height')
for r in rows:
    lic = r.get('license') or ''
    r['ok'] = bool(r.get('thumb') and re.match(r'(CC|Public domain|PD|GODL|KOGL|Attribution)', lic, re.I) and 'NC' not in lic and 'ND' not in lic and min(r.get('w') or 0, r.get('h') or 0) >= MIN_SHORT)
json.dump(rows, open(outp, 'w'), ensure_ascii=False, indent=1)
print(f"{sum(r['ok'] for r in rows)} of {len(rows)} usable")
for r in rows:
    if not r['ok']: print('  skip:', r['key'], '|', r.get('qid'), r.get('license'), r.get('w'), r.get('h'), file=sys.stderr)
