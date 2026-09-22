"""Create Kavu's four-page buyer/judge brief with embedded fonts and source links."""
from pathlib import Path
import sys, json, os
ROOT=Path.cwd(); BUILD=ROOT/'output/build/deck'; sys.path.insert(0,str(BUILD/'python'))
from fontTools.ttLib import TTFont as Font
from fontTools.varLib.instancer import instantiateVariableFont
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.lib.enums import TA_LEFT
for family,src,weight in [('Body','DMSans.ttf',400),('BodyBold','DMSans.ttf',650),('Display','Manrope.ttf',650)]:
 dest=BUILD/'fonts'/f'{family}.ttf'
 font=Font(BUILD/'fonts'/src)
 limits={a.axisTag:(weight if a.axisTag=='wght' else a.defaultValue) for a in font['fvar'].axes}
 instantiateVariableFont(font,limits,inplace=True).save(dest)
 pdfmetrics.registerFont(TTFont(family,str(dest)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='BodyBold')
W,H=595.276,841.89
FOREST='#244D37'; IVORY='#F8F9F5'; GOLD='#D0A650'; INK='#26392D'; MUTED='#667561'; LIGHT='#DEE5D9'
out=ROOT/'output/pdf/kavu-brief.pdf';out.parent.mkdir(parents=True,exist_ok=True)
c=canvas.Canvas(str(out),pagesize=(W,H));c.setTitle('Kavu - buyer and judge brief');c.setAuthor('Shivam Gupta; AI-assisted preparation with OpenAI Codex');c.setSubject('Maize drying operations using JKUAT Conduit observations')
RELEASE_VERIFIED=os.environ.get('KAVU_CLOUD_VERIFIED')=='true'
q=json.loads((ROOT/'data/processed/quality-report.json').read_text())
def bg(color):c.setFillColor(HexColor(color));c.rect(0,0,W,H,fill=1,stroke=0)
def txt(s,x,y,size=12,color=INK,font='Body'):
 c.setFillColor(HexColor(color));c.setFont(font,size);c.drawString(x,y,s)
def para(s,x,y,width,size=11,color=INK,leading=None,font='Body'):
 style=ParagraphStyle('p',fontName=font,fontSize=size,leading=leading or size*1.45,textColor=HexColor(color),alignment=TA_LEFT)
 p=Paragraph(s,style);_,h=p.wrap(width,H);p.drawOn(c,x,y-h);return y-h

def footer(n,dark=False):
 txt('KAVU   /   HACK THE WEATHER 2026',44,30,8,LIGHT if dark else MUTED,'BodyBold');txt(f'{n:02d}',526,30,9,LIGHT if dark else MUTED)
def title(s,kicker=None):
 if kicker:txt(kicker.upper(),44,783,9,MUTED,'BodyBold')
 para(s,44,750,507,31,FOREST,38,'Display')
def line(y):c.setStrokeColor(HexColor(LIGHT));c.setLineWidth(.7);c.line(44,y,551,y)

# Page 1: product and the actual screen.
bg(IVORY);txt('BUYER AND JUDGE BRIEF',44,789,9,MUTED,'BodyBold')
txt('kavu.',42,700,68,FOREST,'Display')
para('Every dry hour counts.',45,657,500,28,FOREST,36,'Display')
para('A drying operations desk for maize cooperatives',45,607,495,15,MUTED,22)
para('A harvest takes months. At the drying yard, the next few hours matter.',45,545,494,18,FOREST,25,'Display')
para('Kavu helps a supervisor allocate limited drying space, record completed work and take the next moisture reading. Each lot keeps the decision and its result together.',45,480,490,11.4,INK,17)
shot=BUILD/'overview-release.png'
if not shot.exists():shot=ROOT/'output/screenshots/overview.png'
image=ImageReader(str(shot));iw,ih=image.getSize(); scale=min(507/iw,286/ih);dh=ih*scale;dw=iw*scale
c.drawImage(image,44+(507-dw)/2,104+(286-dh)/2,width=dw,height=dh,mask='auto')
para('Actual application screen. Historical Conduit replay with demonstration lots.',45,94,498,8.5,MUTED,12)
txt('Shivam Gupta',45,63,10,FOREST,'BodyBold');txt('Founder and product lead',45,47,9,MUTED);txt('kavu-drying.web.app',350,57,11,FOREST,'BodyBold');footer(1);c.showPage()

# Page 2: actual evidence and architecture.
bg(IVORY);title('Data and the decision','Evidence and implementation')
txt(f'{q["uniqueRows"]:,}',44,616,42,FOREST,'Display');txt(f'{q["duplicatesRemoved"]:,}',331,616,42,FOREST,'Display')
txt('unique observations',47,591,12,MUTED);txt('duplicate rows removed',334,591,12,MUTED)
para('The supplied exports span 28 August to 15 September 2026 UTC. A 144-hour gap remains missing. The interface shows East Africa Time. This is a retrospective replay for one JKUAT station, not a live warning or a nationwide observation network.',45,558,502,11,INK,16)
line(474)
steps=[
 ('1','Original Conduit exports','GeoCSV files retain source attribution and checksums. The pipeline deduplicates timestamps and inspects available inputs.'),
 ('2','Evidence gates','Missing intervals remain missing. Humidity interpretation, rain counters and station health receive explicit handling. Operating thresholds need local validation.'),
 ('3','Shared decision logic','Environmental conditions, batch metadata and yard capacity produce an explained plan. An operator commits and completes tasks.'),
 ('4','Cloud accounts and a local option','Firebase Hosting serves React. Cloud Run runs the API with durable Firestore records. Express and SQLite remain available for local self-hosting.'),
 ('5','New measurement and record','Recent measured moisture determines eligibility for storage review. Task completion alone cannot certify grain quality or aflatoxin status.')]
y=447
for num,head,body in steps:
 txt(num,46,y-19,21,GOLD,'Display');txt(head,79,y-10,12.5,FOREST,'BodyBold');para(body,79,y-23,466,10.1,INK,14.6);y-=75
para(('Cloud release verified at kavu-drying.web.app. ' if RELEASE_VERIFIED else 'Cloud release awaiting final hosted verification. ')+'The historical plan uses observed weather retrospectively. It demonstrates the workflow and does not estimate forecast accuracy or drying rates.',45,70,505,8.4,MUTED,11.6)
footer(2);c.showPage()

# Page 3: transparent commercial case.
bg(IVORY);title('A business worth testing','Economics and buyer')
txt('KSh 2,176',43,626,48,FOREST,'Display')
txt('Drying-tariff equivalent of the example reduction',47,594,12.5,FOREST,'BodyBold')
para('1.8 tonnes x 3.2 percentage points x KSh 377.80',46,565,505,16,INK,22)
para('Mavuno A-01 is an example 1,800 kg lot. A reading from 18.2% to 15.0% gives KSh 2,176.128, displayed rounded. The comparison uses NCPB\'s published tonne tariff and the intake-to-current moisture gap.',46,526,502,10.6,MUTED,15)
para('A transparent reference comparison. Measuring actual savings requires labour, transport, handling and alternative drying costs.',46,462,502,11,FOREST,16,'BodyBold')
line(412)
para('Prospective buyer',46,386,238,16,FOREST,22,'Display')
para('A cooperative or aggregator that already dries maize and uses a moisture meter. One supervisor coordinates many farmers\' lots. The existing alternative is a weather report plus a notebook.',46,352,238,10.8,INK,16)
para('Price hypothesis',331,386,218,16,FOREST,22,'Display')
txt('KSh 2,500',330,330,29,FOREST,'Display')
para('per active month per site.<br/>Test support effort, daily use and willingness to renew.',332,310,216,10.8,INK,16)
line(247)
para('Illustrative operating assumptions',46,226,507,15,FOREST,21,'Display')
rows=[('Revenue per site per active month','KSh 2,500'),('Infrastructure allocation at 20 sites','KSh 150'),('Support and operating allowance','KSh 350'),('Contribution before sales, onboarding and founder pay','KSh 2,000')]
y=193
for i,(a,b) in enumerate(rows):
 txt(a,46,y,9.7,INK,'BodyBold' if i==3 else 'Body');txt(b,476,y,9.7,FOREST,'BodyBold');y-=24
para('Planning assumptions only. At two sites, the same KSh 3,000 infrastructure budget costs KSh 1,500 per site. Seasonality, support and onboarding can erase the apparent margin.',46,85,502,8.9,MUTED,12)
footer(3);c.showPage()

# Page 4: pilot and sources, with working links.
bg(IVORY);title('Pilot, limits and sources','Next step')
para('A supervised pilot with up to three maize yards',46,649,505,21,FOREST,28,'Display')
items=[('Observe current work','Document handling, representative sampling, handovers and actual receipts before changing the process.'),('Run in shadow mode','Compare suggestions with experienced operators. Record disagreements and retain existing protective practices.'),('Test continued use','Measure adoption, rechecks, administrative time and actual costs. Ask whether a buyer will renew at an agreed price.')]
y=603
for i,(head,body) in enumerate(items,1):
 txt(f'0{i}',46,y-17,17,GOLD,'Display');txt(head,83,y-10,12,FOREST,'BodyBold');para(body,83,y-24,466,10.4,INK,14.7);y-=73
para('Proposed research, with partner recruitment still to come. Initial histories test daily usefulness. Expansion depends on relevant weather coverage, local validation and confirmed data rights.',46,374,505,10.1,FOREST,14.5)
line(320);txt('Sources and traceability',46,294,16,FOREST,'Display')
sources=[
 ('1. Conduit observations and source files','https://drive.google.com/drive/folders/1KDoCh8vss7nv_B6SuVBlQQssjSh1yaBg','Official hackathon folder. Attribute 3d-fewsnet.icdp.ucar.edu, instrument 61. Confirm redistribution and commercial rights with the owner.'),
 ('2. KALRO Maize Training of Trainers Manual, July 2021','https://keep.kalro.org/appfiles/media/vc_files/maize-tot.pdf','Module 10 covers post-harvest handling, drying and moisture measurement. It does not validate Kavu\'s operating thresholds.'),
 ('3. NCPB drying service','https://ncpb.co.ke/drying/','Published reference: KSh 377.80 per tonne per percentage point. Actual depot terms and total costs may differ.'),
 ('4. Kavu repository and methodology','https://github.com/shi1720/Hack-The-Weather','Raw-source checksums, quality report, decision logic, tests and the fuller market memo accompany the build.')]
y=271
for label,url,desc in sources:
 y=para(f'<link href="{url}" color="{FOREST}"><b>{label}</b></link>',46,y,506,9.5,FOREST,13)
 y=para(desc,46,y-3,506,8.7,MUTED,12)-10
para('Shivam Gupta supplied product direction, commercial focus and quality constraints. OpenAI Codex assisted research, engineering, test development and documentation. No field outcomes or additional human contributions are implied.',46,74,505,8.2,MUTED,11.5)
footer(4);c.save();print(out)
