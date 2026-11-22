"""Tag the Who Is This? faces: Korean or not, K-pop group, and which are too little known.

Usage: python3 -I scripts/quiz/tag-people.py
- scripts/quiz/fame.json: {id: Wikipedia page views over 60 days} (made by fame.py, 2026-11-22).
- scripts/quiz/kpop-groups.json: group -> member names as they appear in people.json.
Sara (2026-11-22) chose "Medium with more Koreans": the 600 best-known non-Korean faces and
the 400 best-known Korean faces are played; the rest get `rare` and are never drawn (kept in
the file). Always played: her original deck (characters), famous one-name stars whose
Wikipedia lookup fails, K-pop groups and their members, and faces added after the scoring.
"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
NOT_KOREAN_TOP, KOREAN_TOP = 600, 400
HANGUL = re.compile('[가-힣]')
KR_EN = {'RM', 'CL', 'Key', 'T.O.P', 'Mark Tuan'}  # Korean stars stored under an English name
MONO = {'Drake', 'Usher', 'Sting', 'Seal', 'Pink', 'Fergie', 'Halsey', 'Sade', 'Ronaldo', 'Akon', 'Kesha', 'Lizzo', 'Pitbull',
        'Ne-Yo', 'Ludacris', 'Timbaland', 'Moby', 'Enya', 'Björk', 'Aaliyah', 'Avicii', 'Macklemore', 'Pelé', 'Ciara', 'Nelly',
        'SZA', 'Lorde', 'will.i.am', 'RuPaul', 'Hozier', 'Oprah Winfrey'}
p_path = os.path.join(REPO, 'src', 'lib', 'people.json')
people = json.load(open(p_path))
fame = json.load(open(os.path.join(HERE, 'fame.json')))
groups = json.load(open(os.path.join(HERE, 'kpop-groups.json')))
member_of = {m: g for g, ms in groups.items() for m in ms}
group_names = set(groups) | {'IVE', 'aespa', 'EXO', 'SHINee', 'ITZY', 'NCT 127', 'TXT', 'ENHYPEN', 'RIIZE', 'ILLIT', 'DAY6', 'ATEEZ',
                             'MONSTA X', 'ZEROBASEONE', 'KISS OF LIFE', 'Sechs Kies', 'S.E.S.', 'Davichi', 'SG Wannabe', 'Highlight',
                             'INFINITE', 'iKON', 'fromis_9', 'VIVIZ', 'Hearts2Hearts', 'MEOVV', 'ALLDAY PROJECT'}

for x in people:
    x.pop('kr', None); x.pop('rare', None); x.pop('group', None)
    if x['name'] in member_of: x['group'] = member_of[x['name']]
    if HANGUL.search(x['name']) or x['name'] in KR_EN or x['name'] in group_names or 'group' in x: x['kr'] = True
always = lambda x: x.get('source') == 'deck' or x['name'] in MONO or x.get('group') or x['name'] in group_names or x['id'] not in fame
for kr, top in ((True, KOREAN_TOP), (False, NOT_KOREAN_TOP)):
    ranked = sorted((x for x in people if bool(x.get('kr')) == kr and x['id'] in fame), key=lambda x: -fame[x['id']])
    for x in ranked[top:]:
        if not always(x): x['rare'] = True
json.dump(people, open(p_path, 'w'), ensure_ascii=False, indent=0)
play = [x for x in people if not x.get('rare')]
k = sum(1 for x in play if x.get('kr'))
print(f'faces {len(people)} | played {len(play)} (Korean {k}, not Korean {len(play) - k}) | with group {sum(1 for x in people if x.get("group"))}')
