"""Generate disclosed stock narration and word timings, with the key kept in memory."""
import getpass
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/build/narrated/audio'
OUT.mkdir(parents=True, exist_ok=True)
key = os.environ.get('OPENAI_API_KEY') or getpass.getpass('OpenAI API key (hidden): ')
if not key.startswith('sk-'):
    raise SystemExit('A valid API key is required. No key was saved.')
segments = json.loads((ROOT / 'docs/submission/narration-v2.json').read_text())['segments']

def api(path, payload, content_type):
    req = urllib.request.Request('https://api.openai.com/v1/' + path, data=payload,
        headers={'Authorization': 'Bearer ' + key, 'Content-Type': content_type}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=180) as res:
            return res.read()
    except urllib.error.HTTPError as err:
        # Do not echo provider errors, headers or credentials.
        raise RuntimeError(f'OpenAI request failed with HTTP {err.code}; no credential was logged.') from None

def transcribe(path):
    boundary = 'kavu-' + uuid.uuid4().hex
    chunks = []
    for name, value in [('model','whisper-1'),('response_format','verbose_json'),
                        ('timestamp_granularities[]','word'),('language','en'),
                        ('prompt','Kavu. JKUAT Conduit. Mavuno A-zero-one. NCPB. Shivam Gupta. Kenyan shillings.')]:
        chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="narration.wav"\r\nContent-Type: audio/wav\r\n\r\n'.encode())
    chunks += [path.read_bytes(), f'\r\n--{boundary}--\r\n'.encode()]
    return json.loads(api('audio/transcriptions', b''.join(chunks), 'multipart/form-data; boundary=' + boundary))

manifest=[]
for segment in segments:
    path = OUT / (segment['id'] + '.wav')
    if not path.exists():
        payload = {'model':'gpt-4o-mini-tts','voice':'cedar','response_format':'wav',
          'input':segment['text'],
          'instructions': 'Narrate a polished product demonstration in clear natural English, at about 135 words per minute. Warm, grounded and confident. Use short natural pauses and articulate numbers carefully. Pronounce Kavu as KAH-voo, JKUAT as the letters J K U A T, NCPB as the letters N C P B. Do not add or omit words. No dramatic acting, no background sounds.'}
        path.write_bytes(api('audio/speech', json.dumps(payload).encode(), 'application/json'))
    timing_path=OUT / (segment['id'] + '-words.json')
    if not timing_path.exists():
        timing_path.write_text(json.dumps(transcribe(path), indent=2))
    duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)],text=True).strip())
    manifest.append({'id':segment['id'],'audio':str(path.relative_to(ROOT)),'seconds':duration,'words':len(segment['text'].split()),'voice':'cedar','model':'gpt-4o-mini-tts'})
    print(f"Scene {segment['id']}: {duration:.2f}s, narration and word timing ready.",flush=True)
(OUT / 'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Generated {sum(x["seconds"] for x in manifest):.1f}s of disclosed stock AI narration. No key was saved.')
