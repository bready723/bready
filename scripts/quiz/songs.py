"""Build the Guess the Song pool (src/lib/songs.json) from Apple's free catalogue data.

Usage: python3 -I scripts/quiz/songs.py <work-dir> [playlist.html ...]
- Recent charts: Apple Music "most played" top 100 for the US and Korea (public RSS feed).
- All-time favourites: scripts/quiz/songs-classics.csv (store,artist,title), found with the
  iTunes Search API (about 20 calls a minute, so this part is slow; answers are cached).
- Playlists: a saved music.apple.com playlist page (shared link). The playlist link itself
  is never written to the repo.
Every song is looked up in the US and Korean stores for names, the 30-second preview and the
cover. Explicit tracks and songs without a preview are left out (family game).
The app streams previews and covers from Apple at play time; nothing is copied into the repo.
Each song is tagged kr (Korean) or not, so a game can be half Korean, half global.
"""
import csv, json, os, re, sys, time, urllib.parse, urllib.request, urllib.error
UA = {'User-Agent': 'quiz-song-lookup/0.1 (personal non-commercial script)'}
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
work = sys.argv[1]; os.makedirs(work, exist_ok=True)
cache_p = os.path.join(work, 'songs-cache.json')
cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
HANGUL = re.compile('[가-힣]')

def get(url, pause):
    if url in cache: return cache[url]
    for i in range(8):
        try:
            d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60))
            cache[url] = d; json.dump(cache, open(cache_p, 'w')); time.sleep(pause); return d
        except urllib.error.HTTPError as e:
            w = 20 * (i + 1); print(f'  {e.code}, waiting {w}s', file=sys.stderr); time.sleep(w)
        except Exception as e:
            print('  retry', e, file=sys.stderr); time.sleep(5 * (i + 1))
    raise SystemExit('gave up: ' + url)

norm = lambda s: re.sub(r'[^0-9a-z가-힣]', '', (s or '').lower())
def same(a, b):
    a, b = norm(a), norm(b)
    if min(len(a), len(b)) <= 2: return a == b  # '비' must not match '바비킴'
    return bool(a and b) and (a in b or b in a)

ids = {}  # trackId -> store it came from ('us' / 'kr')
krset = set()  # ids known to be Korean songs (Korean favourites)
# The Korea chart also lists global hits (Bieber, Ariana Grande), so a chart song counts as
# Korean only when its name or genre says so (checked below), never just for charting there.
# 1. (2026-11-22) the weekly "most played" store charts are no longer used: Sara found too many
# unfamiliar songs. Songs now come from year-end hit charts, favourites and playlists only.
hit_year = {}  # trackId -> the year the song was a hit (chart year), used for the period filter
# 2. all-time favourites
BAD = re.compile(r're-?recorded|junior-m\b|karaoke|revisited|instrumental|inst\.|\(inst\)|piano by|live|remix|cover|tribute|sped up|slowed|acoustic|unplugged|dub\)|club\)|main pass|junior.s|jump cut|louder|keep me|holy priest|(chinese|japanese|actors?|extended|edm|orchestra) ver|edition', re.I)
ODD = re.compile(r'version|ver\.|mix|edit\b|remaster|bonus', re.I)  # allowed, but the plain original comes first
# The Korean store's search answers nothing, so Korean favourites are searched in the US
# store (which understands Korean words but answers in English) and the candidates are
# checked against their Korean-store names in one batched lookup.
missing, kr_wait = [], []
# songs-charts.csv: Billboard year-end top 12 (1980-2025; top 30 for 2000-2009) and Korea's Circle/Gaon chart
# number ones (2010-2025), both from Wikipedia; songs-korean-oldies.csv: Korean hits before 2010
# (no official chart then). Both carry the hit year.
def rows():
    for f in ('songs-classics.csv', 'songs-charts.csv', 'songs-korean-oldies.csv'):
        yield from csv.DictReader(open(os.path.join(HERE, f), encoding='utf-8'))
def found(sid, row):
    if row.get('year'):
        hit_year[sid] = min(hit_year.get(sid, 9999), int(row['year']))
for row in rows():
    # artist / title may list other spellings after '|': 싸이|PSY, 강남스타일|Gangnam Style
    row['artists'], row['titles'] = row['artist'].split('|'), [t.split(' (')[0] for t in row['title'].split('|')]
    row['artist'], row['title'] = row['artists'][0], row['title'].split('|')[0]
    q = urllib.parse.urlencode({'term': f"{row['artist']} {row['title']}", 'country': 'us', 'entity': 'song', 'limit': 15})
    res = get('https://itunes.apple.com/search?' + q, 3.2).get('results', [])
    # chart rows give an English artist and a Korean|English title: try the English title too
    if row['store'] == 'kr' and len(row['titles']) > 1 and not any(same(r.get('artistName'), a) for r in res for a in row['artists']):
        q2 = urllib.parse.urlencode({'term': f"{row['artist']} {row['titles'][-1]}", 'country': 'us', 'entity': 'song', 'limit': 15})
        res = res + get('https://itunes.apple.com/search?' + q2, 3.2).get('results', [])
    res = [r for r in res if not BAD.search(r.get('trackName', '') + ' ' + r.get('collectionName', '') + ' ' + r.get('artistName', ''))]
    res.sort(key=lambda r: (r.get('trackExplicitness') == 'explicit', not r.get('previewUrl'), bool(ODD.search(r.get('trackName', '')))))
    if row['store'] == 'kr':
        kr_wait.append((row, [(str(r['trackId']), r.get('artistName'), r.get('trackName')) for r in res[:6]])); continue
    ok = [r for r in res if same(r.get('artistName'), row['artist']) and same(r.get('trackName'), row['title'].split(' (')[0])]
    if ok: ids.setdefault(str(ok[0]['trackId']), 'us'); found(str(ok[0]['trackId']), row)
    else: missing.append(f"{row['artist']} - {row['title']}")
cand = sorted({c for _, cs in kr_wait for c, _, _ in cs}); krinfo = {}
for i in range(0, len(cand), 150):
    q = urllib.parse.urlencode({'id': ','.join(cand[i:i + 150]), 'country': 'kr', 'entity': 'song'})
    for r in get('https://itunes.apple.com/lookup?' + q, 3.2).get('results', []):
        if r.get('wrapperType') == 'track': krinfo[str(r['trackId'])] = r
for row, cs in kr_wait:
    # the artist must match in either spelling (트와이스 / TWICE) so a knock-off is never picked
    # (names can differ by language too, so any listed spelling of the artist and title counts)
    anyof = lambda x, names: any(same(x, n) for n in names)
    who = lambda c, ua: anyof(ua, row['artists']) or (c in krinfo and anyof(krinfo[c].get('artistName'), row['artists']))
    hit = next((c for c, ua, ut in cs if who(c, ua) and (anyof(ut, row['titles']) or (c in krinfo and anyof(krinfo[c].get('trackName'), row['titles'])))), None)
    if hit: ids.setdefault(hit, 'kr'); krset.add(hit); found(hit, row)
    else: missing.append(f"{row['artist']} - {row['title']}")
# 3. playlists (saved page html)
for path in sys.argv[2:]:
    h = open(path, encoding='utf-8').read()
    for sid in re.findall(r'"kind":"song","identifiers":\{"storeAdamID":"(\d+)"', h):
        ids.setdefault(sid, 'us')

# 4. look every id up in both stores
info = {'us': {}, 'kr': {}}
allid = sorted(ids)
for st in ('us', 'kr'):
    for i in range(0, len(allid), 150):
        q = urllib.parse.urlencode({'id': ','.join(allid[i:i + 150]), 'country': st, 'entity': 'song'})
        for r in get('https://itunes.apple.com/lookup?' + q, 3.2).get('results', []):
            if r.get('wrapperType') == 'track': info[st][str(r['trackId'])] = r

# an artist with any Korean song counts as Korean (K-pop groups also sing in English)
kr_artists = set()
for sid in allid:
    for st in ('us', 'kr'):
        r = info[st].get(sid)
        if r and (sid in krset or 'K-Pop' in r.get('primaryGenreName', '') or HANGUL.search(r.get('artistName', '') + r.get('trackName', ''))):
            kr_artists.add(r.get('artistId'))
# hand fixes after checking the list (2026-11-19): K-pop acts the store files under Pop,
# and a Western singer whose Korean-store name is written in Hangul
KOREAN_ARTISTS = {'ALLDAY PROJECT', 'MEOVV'}
# Western acts the Korean store writes in Hangul (루이 암스트롱, 프랭크 시나트라 …) are not Korean songs
NOT_KOREAN = {'Lady Gaga', 'Leona Lewis', 'Sting', 'Louis Armstrong', 'Barry Manilow', 'Andrea Bocelli', 'Idina Menzel', 'Chuck Mangione',
              'Kenny Loggins', 'Tom Hanks', 'Frank Sinatra', 'back number', 'Robert Palmer', 'Vangelis', 'Eddie Murphy',
              'Jon Bon Jovi', 'Tiffany'}
# country acts the store files under another genre
COUNTRY_ARTISTS = {'Morgan Wallen', 'Zach Bryan', 'Ella Langley', 'Cody Johnson', 'Kane Brown x blackbear', 'Chris Stapleton', 'Dolly Parton', 'Whiskey Myers'}
POP_OK = {'Taylor Swift'}  # country-pop crossover hits stay
first_artist = lambda r: r.get('artistName', '').split(' & ')[0].split(',')[0]
songs, seen, by_key, dropped = [], set(), {}, {'explicit': 0, 'country': 0, 'no preview': 0, 'not found': 0, 'duplicate': 0}
for sid in allid:
    us, kr = info['us'].get(sid), info['kr'].get(sid)
    base = us or kr
    if not base: dropped['not found'] += 1; continue
    if base.get('trackExplicitness') == 'explicit': dropped['explicit'] += 1; continue
    # Sara 2026-11-21: no country music
    if ('Country' in (us or {}).get('primaryGenreName', '') + (kr or {}).get('primaryGenreName', '') or first_artist(base) in COUNTRY_ARTISTS) and first_artist(base) not in POP_OK:
        dropped['country'] += 1; continue
    pv = (us or {}).get('previewUrl') or (kr or {}).get('previewUrl')
    if not pv: dropped['no preview'] += 1; continue
    korean = (sid in krset or base.get('artistId') in kr_artists or 'K-Pop' in ((us or {}).get('primaryGenreName', ''), (kr or {}).get('primaryGenreName', ''))
              or bool(kr and HANGUL.search(kr.get('artistName', '') + kr.get('trackName', '')))
              or bool(HANGUL.search(base.get('artistName', '') + base.get('trackName', ''))))
    clean = lambda s: re.sub(r'\s*[\(\[][^\)\]]*(feat|with |from |remaster|version|bonus track|ver\.|radio edit|single|official|mix\b)[^\)\]]*[\)\]]|\s*\{[^}]*\}|\s+-\s+(\d{4} )?remaster(ed)?.*$', '', s or '', flags=re.I).strip()
    first = base.get('artistName', '').split(' & ')[0].split(',')[0]
    if first in NOT_KOREAN: korean = False
    if first in KOREAN_ARTISTS: korean = True
    main = kr if korean and kr else base
    other = base if main is kr else kr
    # a trailing [...] note is never part of the title ('[Gabry Ponte Ice Pop Radio]', '[The Official ... Song]')
    tail = lambda t: re.sub(r'(\s*\[[^\]]*\])+\s*$', '', re.sub(r'\s*\{[^}]*\}', '', t or ''))
    name, artist = clean(tail(main['trackName'])), main['artistName']
    key = norm(name) + '|' + norm(re.split(r',|&| featuring | feat\. ', artist)[0])
    if key in seen:
        dropped['duplicate'] += 1
        if sid in hit_year:  # the same song found twice: keep the chart (hit) year
            prev = by_key[key]
            if not prev['hasHit'] or hit_year[sid] < int(prev['e']['year']): prev['e']['year'], prev['hasHit'] = str(hit_year[sid]), True
        continue
    seen.add(key)
    e = {'id': 's' + sid, 'name': name, 'artist': artist,
         'art': re.sub(r'/\d+x\d+bb\.', '/600x600bb.', base['artworkUrl100']),
         'preview': pv, 'link': re.sub(r'[?&]uo=\d+', '', base['trackViewUrl']).split('&')[0], 'year': str(hit_year.get(sid) or (base.get('releaseDate') or '')[:4])}
    if other:
        oname, oartist = clean(tail(other['trackName'])), other['artistName']
        if norm(oname) != norm(name): e['alt'] = oname
        if norm(oartist) != norm(artist): e['altArtist'] = oartist
    if korean: e['kr'] = True
    songs.append(e); by_key[key] = {'e': e, 'hasHit': sid in hit_year}

# classics whose store copy is a later re-release: the year they were a hit
YEAR_FIX = {('Frank Sinatra', 'Fly Me to the Moon'): 1964, ('Village People', 'Y.M.C.A.'): 1978,
            ('Kylie Minogue', "Can't Get You out of My Head"): 2001}
for e in songs:
    if (e['artist'], e['name']) in YEAR_FIX: e['year'] = str(YEAR_FIX[(e['artist'], e['name'])])
old = [f"{e['artist']} - {e['name']} ({e['year']})" for e in songs if not any(e['id'] == 's' + k for k in hit_year) and not e.get('kr') and e['year'] >= '2000']
open(os.path.join(work, 'no-hit-year.txt'), 'w').write('\n'.join(old))
json.dump(songs, open(os.path.join(REPO, 'src', 'lib', 'songs.json'), 'w'), ensure_ascii=False, indent=0)
kr_n = sum(1 for s in songs if s.get('kr'))
print(f'songs {len(songs)} (Korean {kr_n}, global {len(songs) - kr_n}) | dropped {dropped}')
print('classics not found:', '; '.join(missing) or 'none')
