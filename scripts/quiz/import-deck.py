"""Download the deck's photos (Slides API JSON in, deck/NNN.jpg out).

Usage: python3 -I scripts/quiz/import-deck.py <slides.json> <raw-dir>
The Slides API image links expire after ~30 minutes: read the deck, then run this.
Writes <raw-dir>/deck.json  = [{slide, name, raw}] in slide order.
"""
import json, os, sys, urllib.request, concurrent.futures as cf
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
slides = json.load(open(src))['content']['slides'][1:]   # slide 1 is the title
items = []
for i, s in enumerate(slides, start=2):
    els = s.get('pageElements', [])
    img = next((e['image']['contentUrl'] for e in els if e.get('image')), None)
    name = ''
    for e in els:
        t = ''.join(x.get('textRun', {}).get('content', '') for x in e.get('shape', {}).get('text', {}).get('textElements', []))
        if t.strip(): name = ' '.join(t.split()); break
    if img and name: items.append({'slide': i, 'name': name, 'url': img})
def fetch(it):
    p = os.path.join(out, f"slide-{it['slide']:03d}.img")
    if not os.path.exists(p):
        urllib.request.urlretrieve(it['url'] + ('' if '=' in it['url'].split('/')[-1] else ''), p)
    return p
with cf.ThreadPoolExecutor(8) as ex:
    for it, p in zip(items, ex.map(fetch, items)): it['raw'] = p; del it['url']
json.dump(items, open(os.path.join(out, 'deck.json'), 'w'), ensure_ascii=False, indent=1)
print(len(items), 'deck photos downloaded')
