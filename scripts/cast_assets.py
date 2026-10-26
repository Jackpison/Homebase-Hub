#!/usr/bin/env python3
"""Builds the Home characters' models and props into src/web/hub/animation/ (models/, props/, cast.json). Not part of the site.

  python3 scripts/cast_assets.py --packs DIR --node DIR

--packs  a folder with the free (CC0) packs unzipped, each in a folder named like its download:
         Kenney: mini-characters, cube-pets, blocky-characters, survival-kit, food-kit, furniture-kit, holiday-kit, mini-skate,
         mini-arena, nature-kit (kenney.nl/assets/<name>); Quaternius: pirate (Pirate Kit, its glTF folder) and monsters
         (Ultimate Monsters, its Big/Blob/Flying folders), from quaternius.com.
--node   a folder with the model tools installed:
         npm i --no-save @gltf-transform/core@4.1.1 @gltf-transform/functions@4.1.1 @gltf-transform/extensions@4.1.1 meshoptimizer@0.22.0

Each model is shrunk by scripts/cast-shrink.mjs (only the animations the characters use, fewer keyframes, smaller numbers) and saved
as {"glb": "<base64>"} in a .json file: a site update may carry .json but not .glb, and the page turns it back into a model.

To add a character: add a line to CAST (and its family to FAMILIES in animation/engine.js if it is a new family), run this, commit.
To add a prop: add a line to PROPS, run this, and use it by its name in an activity (animation/activities.js)."""
import argparse, base64, json, os, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'web', 'hub', 'animation')

# Animations each family keeps (the rest are dropped to save space). engine.js maps them to verbs like "happy" or "punch".
KEEP = {
    'mini':     'idle,walk,sprint,jump,fall,crouch,sit,drive,die,pick-up,emote-yes,emote-no,holding-both,holding-right,attack-melee-right,attack-melee-left,attack-kick-right,attack-kick-left,interact-right,interact-left',
    'blocky':   'idle,walk,sprint,sit,drive,die,pick-up,emote-yes,emote-no,holding-both,holding-right,attack-melee-right,attack-melee-left,attack-kick-right,attack-kick-left,interact-right,interact-left',
    'pets':     'idle,walk,run,eat,dance,gesture-positive,gesture-negative',
    'pirates':  '',   # all (14 or fewer)
    'monsters': '',
    'blobs':    '',
    'flyers':   '',
}
K = 'kenney'
# id, name, family, source file (under --packs), height (1 = a person), simplify the mesh
CAST = [
    ('bruno',      'Bruno',            'mini',     'mini-characters/Models/GLB format/character-male-b.glb', 1.0, False),
    ('kip',        'Officer Kip',      'mini',     'mini-characters/Models/GLB format/character-male-c.glb', 1.0, False),
    ('lion',       'Lion',             'pets',     'cube-pets/Models/GLB format/animal-lion.glb', .78, False),
    ('monkey',     'Monkey',           'pets',     'cube-pets/Models/GLB format/animal-monkey.glb', .78, False),
    ('panda',      'Panda',            'pets',     'cube-pets/Models/GLB format/animal-panda.glb', .78, False),
    ('penguin',    'Penguin',          'pets',     'cube-pets/Models/GLB format/animal-penguin.glb', .74, False),
    ('pig',        'Pig',              'pets',     'cube-pets/Models/GLB format/animal-pig.glb', .7, False),
    ('tom',        'Tattoo Tom',       'blocky',   'blocky-characters/Models/GLB format/character-a.glb', 1.0, False),
    ('zombie',     'Zombie',           'blocky',   'blocky-characters/Models/GLB format/character-l.glb', 1.0, False),
    ('ninja',      'Ninja',            'blocky',   'blocky-characters/Models/GLB format/character-r.glb', 1.0, False),
    ('anne',       'Anne',             'pirates',  'pirate/glTF/Characters_Anne.gltf', 1.0, True),
    ('barbarossa', 'Capt. Barbarossa', 'pirates',  'pirate/glTF/Characters_Captain_Barbarossa.gltf', 1.05, True),
    ('mako',       'Mako',             'pirates',  'pirate/glTF/Characters_Mako.gltf', 1.05, True),
    ('shark',      'Shark',            'swimmers', 'pirate/glTF/Characters_Shark.gltf', .8, True),
    ('skeleton',   'Skeleton',         'pirates',  'pirate/glTF/Characters_Skeleton.gltf', 1.0, True),
    ('bunny',      'Bunny',            'monsters', 'monsters/Big/glTF/Bunny.gltf', 1.1, True),
    ('demon',      'Demon',            'monsters', 'monsters/Big/glTF/Demon.gltf', 1.1, True),
    ('shadow',     'Shadow',           'monsters', 'monsters/Big/glTF/Ninja.gltf', 1.05, True),
    ('yeti',       'Yeti',             'monsters', 'monsters/Big/glTF/Yeti.gltf', 1.2, True),
    ('dog',        'Dog',              'blobs',    'monsters/Blob/glTF/Dog.gltf', .66, True),
    ('pinkblob',   'Pink Blob',        'blobs',    'monsters/Blob/glTF/PinkBlob.gltf', .6, True),
    ('tribal',     'Tribal',           'flyers',   'monsters/Flying/glTF/Tribal.gltf', .8, True),
]
CREDIT = {'mini': K, 'pets': K, 'blocky': K}

# name, source file (under --packs). Simple shapes (balls, hoops, ropes, the ring, the beam) are drawn by props.js instead.
PROPS = [
    ('campfire',   'survival-kit/Models/GLB format/campfire-pit.glb'),
    ('bedroll',    'survival-kit/Models/GLB format/bedroll.glb'),
    ('bucket',     'survival-kit/Models/GLB format/bucket.glb'),
    ('fish',       'survival-kit/Models/GLB format/fish.glb'),
    ('log',        'survival-kit/Models/GLB format/tree-log-small.glb'),
    ('rocks',      'survival-kit/Models/GLB format/resource-stone.glb'),
    ('planks',     'survival-kit/Models/GLB format/resource-planks.glb'),
    ('apple',      'food-kit/Models/GLB format/apple.glb'),
    ('burger',     'food-kit/Models/GLB format/burger-cheese.glb'),
    ('cupcake',    'food-kit/Models/GLB format/cupcake.glb'),
    ('donut',      'food-kit/Models/GLB format/donut.glb'),
    ('pizza',      'food-kit/Models/GLB format/pizza.glb'),
    ('soda',       'food-kit/Models/GLB format/soda-can.glb'),
    ('icecream',   'food-kit/Models/GLB format/ice-cream-cne.glb'),   # Kenney's own spelling
    ('watermelon', 'food-kit/Models/GLB format/watermelon.glb'),
    ('speaker',    'furniture-kit/Models/GLTF format/speaker.glb'),
    ('lounger',    'furniture-kit/Models/GLTF format/loungeChairRelax.glb'),
    ('plant',      'furniture-kit/Models/GLTF format/pottedPlant.glb'),
    ('bench',      'holiday-kit/Models/GLB format/bench-short.glb'),
    ('snowman',    'holiday-kit/Models/GLB format/snowman.glb'),
    ('snowpile',   'holiday-kit/Models/GLB format/snow-pile.glb'),
    ('present',    'holiday-kit/Models/GLB format/present-a-cube.glb'),
    ('skateboard', 'mini-skate/Models/GLB format/skateboard.glb'),
    ('trophy',     'mini-arena/Models/GLB format/trophy.glb'),
    ('palm',       'nature-kit/Models/GLTF format/tree_palmBend.glb'),
    ('tent',       'nature-kit/Models/GLTF format/tent_detailedOpen.glb'),
    ('cutlass',    'pirate/glTF/Weapon_Cutlass.gltf'),
    ('sword',      'pirate/glTF/Weapon_Sword_1.gltf'),
    ('lute',       'pirate/glTF/Weapon_Lute.gltf'),
    ('chest',      'pirate/glTF/Prop_Chest_Gold.gltf'),
    ('sunglasses', 'mini-characters/Models/GLB format/aid-sunglasses.glb'),
]

def find(packs, rel):
    p = os.path.join(packs, rel)
    if os.path.isfile(p): return p
    # Kenney's folders differ a little between packs (GLB format / GLTF format / no Models folder): look for the file name
    base = os.path.basename(rel); top = rel.split('/')[0]
    for d, _, fs in os.walk(os.path.join(packs, top)):
        if base in fs and 'glb' in d.lower() or base in fs and base.endswith('.gltf'): return os.path.join(d, base)
    for d, _, fs in os.walk(os.path.join(packs, top)):
        if base in fs: return os.path.join(d, base)
    sys.exit('not found: ' + rel)

def shrink(node, src, keep, simp):
    tmp = os.path.join(node, '_out.glb')
    shutil.copy(os.path.join(ROOT, 'scripts', 'cast-shrink.mjs'), os.path.join(node, 'cast-shrink.mjs'))
    r = subprocess.run(['node', 'cast-shrink.mjs', os.path.abspath(src), tmp, keep or '', 'simplify' if simp else ''], cwd=node, capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr)
    data = open(tmp, 'rb').read(); os.remove(tmp)
    return data

def anims(glb):
    import struct
    n = struct.unpack('<I', glb[12:16])[0]
    return [a['name'] for a in json.loads(glb[20:20 + n]).get('animations', [])]

def save(path, glb):
    with open(path, 'w') as f: json.dump({'glb': base64.b64encode(glb).decode()}, f, separators=(',', ':'))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--packs', required=True); ap.add_argument('--node', required=True)
    a = ap.parse_args()
    for d in ('models', 'props'):
        shutil.rmtree(os.path.join(OUT, d), ignore_errors=True); os.makedirs(os.path.join(OUT, d))
    cast, total = [], 0
    for cid, name, fam, rel, h, simp in CAST:
        glb = shrink(a.node, find(a.packs, rel), KEEP.get(fam, ''), simp)
        save(os.path.join(OUT, 'models', cid + '.json'), glb); total += len(glb)
        cast.append({'id': cid, 'name': name, 'family': fam, 'height': h, 'anims': anims(glb), 'by': 'Kenney' if CREDIT.get(fam) else 'Quaternius'})
        print('%-11s %5d KB  %d animations' % (cid, len(glb) // 1024, len(cast[-1]['anims'])))
    props = []
    for pid, rel in PROPS:
        glb = shrink(a.node, find(a.packs, rel), '', False)
        save(os.path.join(OUT, 'props', pid + '.json'), glb); total += len(glb); props.append(pid)
    with open(os.path.join(OUT, 'cast.json'), 'w') as f:
        json.dump({'cast': cast, 'props': props}, f, indent=1)
    print('%d characters, %d props, %d KB of models' % (len(cast), len(props), total // 1024))

if __name__ == '__main__': main()
