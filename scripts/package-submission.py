"""Bundle the reviewable entry materials; source code remains in the public repository."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
target = root / 'output' / 'kavu-submission-kit.zip'
files = [root / name for name in ['README.md', 'LICENSE', 'THIRD_PARTY.md']]
files += sorted((root / 'docs').rglob('*.md'))
files += [root / 'output' / name for name in [
    'kavu-pitch.pptx', 'pdf/kavu-brief.pdf', 'kavu-demo-silent.mp4', 'demo-cues.srt',
    'screenshots/overview-slide.png', 'screenshots/welcome.png',
]]
for path in files:
    if not path.is_file():
        raise FileNotFoundError(path)
with ZipFile(target, 'w', ZIP_DEFLATED) as bundle:
    for path in files:
        bundle.write(path, 'kavu-submission-kit/' + str(path.relative_to(root)))
print(f'{target}: {len(files)} files, {target.stat().st_size:,} bytes')
