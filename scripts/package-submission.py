"""Bundle tracked source, reproducible data and entry materials; exclude local state."""
from pathlib import Path
from subprocess import check_output
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
target = root / 'output' / 'kavu-submission-kit.zip'
tracked = check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
files = sorted(root / name for name in tracked if name)
required = ['output/kavu-pitch.pptx', 'output/pdf/kavu-brief.pdf',
            'output/kavu-demo-silent.mp4', 'output/kavu-accounts-silent.mp4']
for name in required:
    if root / name not in files:
        raise RuntimeError(f'Add the final artifact to Git before packaging: {name}')
for path in files:
    if not path.is_file():
        raise FileNotFoundError(path)
with ZipFile(target, 'w', ZIP_DEFLATED) as bundle:
    for path in files:
        bundle.write(path, 'kavu-submission-kit/' + str(path.relative_to(root)))
print(f'{target}: {len(files)} files, {target.stat().st_size:,} bytes')
