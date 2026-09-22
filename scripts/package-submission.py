"""Package source and generated entry materials without local state or credentials."""
from pathlib import Path
from subprocess import check_output
from zipfile import ZipFile, ZIP_DEFLATED
import argparse
import hashlib
import json
import re

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--devpost', action='store_true', help='Create a complete source and document upload under 35 MB, excluding video.')
args = parser.parse_args()
target = root / 'output' / ('kavu-submission.zip' if args.devpost else 'kavu-submission-kit.zip')
tracked = check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
names = {name for name in tracked if name}
# Include the frozen authorized source and documentation before the final artifact commit.
for folder in ['src', 'server', 'tests', 'scripts', 'docs']:
    for path in (root / folder).rglob('*'):
        if path.is_file() and path.suffix in {'.ts', '.tsx', '.css', '.mjs', '.py', '.md', '.json'} and '__pycache__' not in path.parts:
            names.add(str(path.relative_to(root)))
for name in ['.firebaserc', 'firebase.json', 'firebase.firestore.json', 'firebase.emulator.json', 'firestore.indexes.json', 'firestore.rules']:
    if (root / name).is_file():
        names.add(name)
required = ['output/kavu-pitch.pptx', 'output/pdf/kavu-brief.pdf',
            'output/kavu-youtube-thumbnail.png', 'output/kavu-devpost-thumbnail.png',
            'output/kavu-demo-narrated.srt']
if not args.devpost:
    required += ['output/kavu-demo-narrated.mp4', 'output/kavu-demo-silent.mp4',
                 'output/kavu-accounts-silent.mp4']
assets = set(required)
assets.update(str(p.relative_to(root)) for p in (root / 'output/gallery').glob('*.png'))
if args.devpost:
    names = {n for n in names if not n.startswith('output/')}
names.update(assets)

for name in required:
    if not (root / name).is_file():
        raise FileNotFoundError(f'Required generated artifact is missing: {name}')

# Explicitly exclude local credentials, generated archives, recordings and caches.
def allowed(name):
    parts = Path(name).parts
    if any(part in {'.git', '.firebase', 'node_modules', '__pycache__', 'var', 'tmp', 'backups'} for part in parts):
        return False
    if name.startswith('output/build/') or name.endswith(('.zip', '.db', '.sqlite', '.sqlite3', '.log')):
        return False
    if Path(name).name.startswith('.env') and Path(name).name != '.env.example':
        return False
    if args.devpost and Path(name).suffix.lower() in {'.mp4', '.webm', '.mov', '.wav', '.mp3', '.m4a'}:
        return False
    return True

names = sorted(n for n in names if allowed(n))
files = [(name, root / name) for name in names]
for name, path in files:
    if not path.is_file():
        raise FileNotFoundError(path)
    if path.suffix in {'.ts', '.tsx', '.mjs', '.py', '.md', '.json', '.txt'} or path.name == '.env.example':
        data = path.read_bytes()
        if re.search(rb'sk-(?:proj-)?[A-Za-z0-9_-]{40,}', data) or (b'-----BEGIN ' + b'PRIVATE KEY-----') in data:
            raise RuntimeError(f'Potential credential found in included file: {name}')

prefix = 'kavu-submission/' if args.devpost else 'kavu-submission-kit/'
with ZipFile(target, 'w', ZIP_DEFLATED, compresslevel=9) as bundle:
    for name, path in files:
        bundle.write(path, prefix + name)
    if args.devpost:
        note = '''KAVU SUBMISSION PACKAGE

This archive includes actual generated pitch and PDF files, project images,
submission copy, source code, raw/processed data, dependency lockfile and tests.
Start with README.md and docs/submission/testing-instructions.md.

The narrated MP4 is intentionally excluded to meet the Devpost upload limit.
Its final SRT captions are included. Watch the verified public video:
https://www.youtube.com/watch?v=iyu0CjoYOgM
Use docs/submission/youtube.md for chapters and publication evidence.
Earlier capture instructions may reference optional recordings available in
the public repository. They are not required to build or test the application.

The source snapshot includes files present at packaging time. Reproduce the
application using npm ci, npm run build, npm test and the documented setup.
Generated build caches, databases, credentials and installed dependencies are
excluded. Environment variable names appear only in the example/setup files.
'''
        bundle.writestr(prefix + 'START-HERE.txt', note)
with ZipFile(target) as bundle:
    corrupt = bundle.testzip()
    if corrupt:
        raise RuntimeError(f'Archive integrity failure: {corrupt}')
if args.devpost and target.stat().st_size >= 35_000_000:
    raise RuntimeError('Devpost package exceeds the 35 MB decimal limit.')
manifest = {'path': str(target.relative_to(root)), 'files': len(files), 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'video_included': not args.devpost, 'integrity': 'passed'}
report = root / 'output/build/deck' / ('devpost-package.json' if args.devpost else 'package.json')
report.parent.mkdir(parents=True, exist_ok=True)
report.write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest, indent=2))
