"""Build the Guess the Movie pool (src/lib/movies.json) from TMDB.

Usage: python3 -I scripts/quiz/movies.py <work-dir>
Needs TMDB_KEY in the repo's .env (never committed; never written to the cache or output).
Pool: the best-known movies by number of TMDB votes —
  ~180 English-language, ~60 Korean, ~60 animated, plus ~30 recent hits (2023+).
Picture: a "textless" poster (TMDB marks posters with no language = no title text); when a
movie has none, a still from the film (also textless). Movies with neither are left out.
The app loads the image from TMDB at play time; only the address is stored here.
"This product uses the TMDB API but is not endorsed or certified by TMDB."
"""
import json, os, re, sys, time, urllib.parse, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
work = sys.argv[1]; os.makedirs(work, exist_ok=True)
env = dict(re.findall(r'^\s*([A-Z_]+)\s*=\s*"?([^"\n]+)"?', open(os.path.join(REPO, '.env')).read(), re.M))
KEY = env.get('TMDB_KEY', '').strip()
if not KEY: raise SystemExit('TMDB_KEY missing in .env')
BEARER = KEY.startswith('eyJ')  # v4 read token vs v3 key
cache_p = os.path.join(work, 'tmdb-cache.json')
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}

def get(path, **q):
    url = 'https://api.themoviedb.org/3' + path + '?' + urllib.parse.urlencode(sorted(q.items()))
    if url in cache: return cache[url]
    full = url if BEARER else url + '&api_key=' + KEY
    hdr = {'User-Agent': 'quiz-movie-lookup/0.1 (personal non-commercial script)', 'Accept': 'application/json'}
    if BEARER: hdr['Authorization'] = 'Bearer ' + KEY
    for i in range(6):
        try:
            d = json.load(urllib.request.urlopen(urllib.request.Request(full, headers=hdr), timeout=30))
            cache[url] = d
            if len(cache) % 20 == 0: json.dump(cache, open(cache_p, 'w'))
            time.sleep(0.05); return d
        except urllib.error.HTTPError as e:
            if e.code in (401, 404): raise SystemExit(f'TMDB said {e.code} for {path}')
            time.sleep(3 * (i + 1))
        except Exception:
            time.sleep(3 * (i + 1))
    raise SystemExit('gave up: ' + path)

def top(n, **q):
    out, page = [], 1
    while len(out) < n:
        res = get('/discover/movie', include_adult='false', sort_by='vote_count.desc', page=page, **q)['results']
        if not res: break
        out += res; page += 1
    return out[:n]

# from the poster review (2026-11-18): pictures that still show the title get the next
# textless picture; posters too adult for a family game are left out
NEXT_PICTURE = {157350: 'Divergent', 200085: 'The Flu', 933131: 'Badland Hunters', 507089: "Five Nights at Freddy's"}
LEAVE_OUT = {1280: '3-Iron', 22536: 'Thirst', 933260: 'The Substance'}
groups = [
    ('en', top(200, with_original_language='en', without_genres='16')),
    ('ko', top(60, with_original_language='ko')),
    ('anim', top(60, with_genres='16')),
    ('new', top(30, **{'primary_release_date.gte': '2023-01-01', 'with_original_language': 'en'})),
]
movies, seen, skipped = [], set(), []
for g, rows in groups:
    for m in rows:
        if m['id'] in seen or m['id'] in LEAVE_OUT: continue
        seen.add(m['id'])
        imgs = get(f"/movie/{m['id']}/images", include_image_language='null')
        rank = lambda x: (x.get('vote_count', 0) > 0, x.get('vote_average', 0), x.get('width', 0))
        posters = sorted([p for p in imgs.get('posters', []) if not p.get('iso_639_1')], key=rank, reverse=True)
        stills = sorted([p for p in imgs.get('backdrops', []) if not p.get('iso_639_1')], key=rank, reverse=True)
        if m['id'] in NEXT_PICTURE: posters, stills = posters[1:], stills[1:]
        if posters: art, shape = 'https://image.tmdb.org/t/p/w500' + posters[0]['file_path'], 'poster'
        elif stills: art, shape = 'https://image.tmdb.org/t/p/w780' + stills[0]['file_path'], 'still'
        else: skipped.append(m['title']); continue
        e = {'id': f"m{m['id']}", 'name': m['title'], 'year': (m.get('release_date') or '')[:4], 'art': art, 'shape': shape,
             'source': 'tmdb', 'link': f"https://www.themoviedb.org/movie/{m['id']}"}
        if m.get('original_language') == 'ko' and m.get('original_title') and m['original_title'] != m['title']: e['alt'] = m['original_title']
        movies.append(e)
json.dump(cache, open(cache_p, 'w'))
json.dump(movies, open(os.path.join(REPO, 'src', 'lib', 'movies.json'), 'w'), ensure_ascii=False, indent=0)
print(f"movies {len(movies)} (posters {sum(m['shape'] == 'poster' for m in movies)}, stills {sum(m['shape'] == 'still' for m in movies)}) | no textless picture: {len(skipped)}")
