"""Score how well-known each face is, from Wikipedia page views (last 60 days).

Usage: python3 -I scripts/quiz/fame.py <work-dir>
Reads src/lib/people.json, looks each person up on English Wikipedia (English name)
and Korean Wikipedia (Hangul name), and writes <work-dir>/fame.json: {id: views}.
Views = English + Korean daily views summed over 60 days. Answers are cached.
"""
import json, os, re, sys, time, urllib.parse, urllib.request
UA = {'User-Agent': 'quiz-fame-lookup/0.1 (personal non-commercial script)'}
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
work = sys.argv[1]; os.makedirs(work, exist_ok=True)
cache_p = os.path.join(work, 'fame-cache.json')
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
HANGUL = re.compile('[가-힣]')

def fetch(url):
    for i in range(8):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60))
        except Exception as e:
            w = 15 * (i + 1); print(f'  {e}, waiting {w}s', file=sys.stderr); time.sleep(w)
    raise SystemExit('gave up: ' + url)

def views(lang, titles):
    todo = [t for t in titles if f'{lang}:{t}' not in cache]
    for i in range(0, len(todo), 20):
        chunk = todo[i:i + 20]
        params = {'action': 'query', 'format': 'json', 'redirects': 1, 'prop': 'pageviews', 'pvipdays': 60, 'titles': '|'.join(chunk)}
        got, cont = {}, {}
        while True:
            url = f'https://{lang}.wikipedia.org/w/api.php?' + urllib.parse.urlencode({**params, **cont})
            d = fetch(url)
            q = d.get('query', {})
            back = {}
            for r in q.get('normalized', []) + q.get('redirects', []):
                back[r['to']] = back.get(r['from'], r['from'])
            for pg in q.get('pages', {}).values():
                pv = pg.get('pageviews')
                if pv is None and 'missing' not in pg: continue
                n = sum(v or 0 for v in (pv or {}).values())
                t = pg['title']
                src = t
                while src in back: src = back[src]
                got[src] = max(got.get(src, 0), n)
            if 'continue' not in d: break
            cont = d['continue']; time.sleep(0.3)
        for t in chunk: cache[f'{lang}:{t}'] = got.get(t, 0)
        json.dump(cache, open(cache_p, 'w')); time.sleep(1.5)
    return {t: cache[f'{lang}:{t}'] for t in titles}

people = json.load(open(os.path.join(REPO, 'src/lib/people.json')))
en_t = {x['id']: (x.get('alt') or x['name']) for x in people}
ko_t = {x['id']: x['name'] for x in people if HANGUL.search(x['name'])}
en = views('en', sorted(set(en_t.values())))
ko = views('ko', sorted(set(ko_t.values())))
fame = {i: en.get(en_t[i], 0) + (ko.get(ko_t[i], 0) if i in ko_t else 0) for i in en_t}
json.dump(fame, open(os.path.join(work, 'fame.json'), 'w'))
print('scored', len(fame), 'zero', sum(1 for v in fame.values() if v == 0))
