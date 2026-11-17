"""Find symbol-only logo files for brands (second pass of the Logo Quiz pool).

Usage: python3 -I scripts/quiz/logo-search.py <in.json> <out.json>
in.json = [{key, title, wiki: 'en'|'ko', category}]
For each brand: Wikidata logo (P154), small logo / icon (P8972, P2910), plus a Commons
search for SVG files whose title names the brand. Every file gets its licence and a
300px review thumb; out.json = [{key, category, qid, en, ko, files: [{file, license,
credit, page, thumb, w, h, ok}]}]. ok = free licence (same rule as commons.py).
Polite: one request at a time, backs off on 429, caches every answer.
"""
import json, os, re, sys, time, urllib.request, urllib.parse, urllib.error
UA = {'User-Agent': 'quiz-logo-lookup/0.1 (personal non-commercial script)'}
inp, outp = sys.argv[1], sys.argv[2]
cache_p = os.path.join(os.path.dirname(outp) or '.', 'search-api-cache.json')
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
def get(url, data):
    key = url + '?' + urllib.parse.urlencode(sorted(data.items()))
    if key in cache: return cache[key]
    for i in range(10):
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode(), headers=UA)
            d = json.load(urllib.request.urlopen(req, timeout=60))
            cache[key] = d
            if len(cache) % 25 == 0: json.dump(cache, open(cache_p, 'w'))
            time.sleep(0.8 if 'search' not in data.get('list', '') else 2.5); return d
        except urllib.error.HTTPError as e:
            ra = e.headers.get('Retry-After'); w = float(ra) if ra and ra.isdigit() else 8 * (i + 1)
            print(f'  {e.code}, waiting {min(w, 120):.0f}s', file=sys.stderr); time.sleep(min(w, 120))
        except Exception as e:
            print('  retry', e, file=sys.stderr); time.sleep(5 * (i + 1))
    raise SystemExit('gave up')
FREE = lambda lic: bool(re.match(r'(CC|Public domain|PD|GODL|KOGL|Attribution)', lic or '', re.I)) and 'NC' not in lic and 'ND' not in lic

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
        r['en'] = e.get('labels', {}).get('en', {}).get('value'); r['ko'] = e.get('labels', {}).get('ko', {}).get('value')
        r['names'] = [c2['mainsnak']['datavalue']['value'] for p in ('P8972', 'P2910', 'P154') for c2 in c.get(p, []) if c2['mainsnak'].get('datavalue')]
SEARCH = os.environ.get('LOGO_SEARCH', '1') == '1'  # LOGO_SEARCH=0: Wikidata files only (fast)
for r in (fd if SEARCH else []):
    if r.get('skip_search'): continue
    name = re.sub(r'\s*\(.*\)$', '', r.get('en') or r['title'])
    s = get('https://commons.wikimedia.org/w/api.php', {'action': 'query', 'format': 'json', 'list': 'search', 'srnamespace': 6, 'srlimit': 10, 'srsearch': f'intitle:"{name}" filetype:drawing'})
    found = [x['title'][5:] for x in s.get('query', {}).get('search', [])]
    r['names'] = list(dict.fromkeys(r['names'] + found))[:12]
allf = sorted({f for r in fd for f in r['names']})
info = {}
for i in range(0, len(allf), 40):
    ch = allf[i:i + 40]
    q = get('https://commons.wikimedia.org/w/api.php', {'action': 'query', 'format': 'json', 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': 500, 'iiextmetadatafilter': 'LicenseShortName|Artist', 'titles': '|'.join('File:' + f for f in ch)})['query']
    nm = {x['from']: x['to'] for x in q.get('normalized', [])}; pages = {p['title']: p for p in q.get('pages', {}).values()}
    for f in ch:
        t = 'File:' + f; ii = (pages.get(nm.get(t, t), {}).get('imageinfo') or [{}])[0]; md = ii.get('extmetadata', {})
        lic = md.get('LicenseShortName', {}).get('value')
        info[f] = {'file': f, 'license': lic, 'credit': re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', md.get('Artist', {}).get('value', ''))).strip()[:80] or None,
                   'page': ii.get('descriptionurl'), 'thumb': ii.get('thumburl') or ii.get('url'), 'w': ii.get('width'), 'h': ii.get('height')}
        info[f]['ok'] = bool(info[f]['thumb'] and FREE(lic) and (f.lower().endswith('.svg') or min(ii.get('width') or 0, ii.get('height') or 0) >= 200))
json.dump(cache, open(cache_p, 'w'))
out = [{'key': r['key'], 'category': r['category'], 'qid': r['qid'], 'en': r.get('en'), 'ko': r.get('ko'),
        'files': [info[f] for f in r['names'] if f in info and info[f]['ok']]} for r in fd]
json.dump(out, open(outp, 'w'), ensure_ascii=False, indent=1)
print(f"{len(out)} brands, {sum(len(r['files']) for r in out)} free files")
