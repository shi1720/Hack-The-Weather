/** Build editable Kavu pitch. Requires the Codex bundled artifact-tool runtime. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root=process.cwd();
const runtime=process.env.KAVU_RUNTIME || '/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies';
process.env.RUNTIME_NODE_MODULES=path.join(runtime,'node/node_modules');
const skill='/Users/shivamgupta/.codex/plugins/cache/openai-primary-runtime/presentations/26.904.11930/skills/presentations';
const out=path.join(root,'output/build/deck');
const req=createRequire(path.join(runtime,'node/node_modules/@oai/artifact-tool/package.json'));
const {Presentation,PresentationFile}=await import(pathToFileURL(path.join(runtime,'node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs')));
await fs.mkdir(out,{recursive:true});
try { const {FontLibrary}=req('skia-canvas'); FontLibrary.use('Manrope',[path.join(out,'fonts/Manrope.ttf')]); FontLibrary.use('DM Sans',[path.join(out,'fonts/DMSans.ttf')]); } catch(e) { console.warn('Font registration:',e.message); }
try { const {GlobalFonts}=req('@napi-rs/canvas'); GlobalFonts.registerFromPath(path.join(out,'fonts/Manrope.ttf'),'Manrope'); GlobalFonts.registerFromPath(path.join(out,'fonts/DMSans.ttf'),'DM Sans'); } catch {}
const colors={forest:'#244D37',ivory:'#F8F9F5',gold:'#D0A650',ink:'#26392D',muted:'#667561',light:'#DEE5D9'};
const p=Presentation.create({slideSize:{width:1280,height:720}});
function text(s,copy,x,y,w,h,size=28,color=colors.ink,bold=false,font='DM Sans'){
 const t=s.shapes.add({geometry:'textbox',name:copy.slice(0,45),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 t.text=copy;t.text.style={typeface:font,fontSize:size,color,bold,autoFit:'none',wrap:'square',insets:{top:0,left:0,right:0,bottom:0}};return t;
}
function slide(bg=colors.ivory){const s=p.slides.add();s.background.fill=bg;return s;}
function note(s,n){s.speakerNotes.textFrame.setText(n);}
function foot(s,n,dark=false){text(s,`Kavu    ${String(n).padStart(2,'0')}`,72,665,1120,24,16,dark?colors.light:colors.muted);}
function heading(s,t,dark=false){text(s,t,72,54,1130,100,48,dark?colors.ivory:colors.forest,true,'Manrope');}
const quality=JSON.parse(await fs.readFile(path.join(root,'data/processed/quality-report.json'),'utf8'));
let s=slide(colors.forest);
text(s,'HACK THE WEATHER 2026',76,64,1080,30,19,colors.gold,true);
text(s,'kavu.',72,169,1120,147,128,colors.ivory,true,'Manrope');
text(s,'Every dry hour counts.',78,350,1080,68,52,colors.ivory,false,'Manrope');
text(s,'A drying operations desk for maize cooperatives',80,450,1075,50,28,colors.light);
text(s,'Shivam Gupta\nFounder and product lead',80,585,700,64,22,colors.light);
note(s,'Kavu project presentation for Hack The Weather 2026. Shivam Gupta supplied product direction, commercial focus and quality constraints. OpenAI Codex assisted research, engineering, tests and documentation. No fictional teammate or field contribution is claimed. Project source: https://github.com/shi1720/Hack-The-Weather');

s=slide();heading(s,'The work after the weather report');
text(s,'Which lot\nneeds action\nnext?',72,210,530,330,70,colors.forest,true,'Manrope');
text(s,'Spread and turn',692,205,490,48,32,colors.forest,true);
text(s,'Use the available yard and operator time.',692,260,485,62,25,colors.muted);
text(s,'Cover or seek a dryer',692,351,490,48,32,colors.forest,true);
text(s,'Respond when the weather changes.',692,405,485,60,25,colors.muted);
text(s,'Measure again',692,494,490,48,32,colors.forest,true);
text(s,'A new reading decides the next step.',692,548,485,60,25,colors.muted);foot(s,2);
note(s,'Problem framing is a product hypothesis, not a claim from interviews. KALRO 2021 Training of Trainers Manual, Module 10, printed pp60–64 (PDF pp72–76), covers drying, moisture for storage and practical use of moisture meters. https://keep.kalro.org/appfiles/media/vc_files/maize-tot.pdf . NCPB provides paid mechanical grain drying: https://ncpb.co.ke/drying/ . Kavu has no validated customer adoption or loss reduction at submission.');

s=slide(colors.forest);heading(s,'Real observations, visible limits',true);
text(s,quality.uniqueRows.toLocaleString('en-US'),72,211,600,110,95,colors.ivory,true,'Manrope');
text(s,'unique Conduit observations',78,328,650,48,28,colors.light);
text(s,quality.duplicatesRemoved.toLocaleString('en-US'),800,223,390,88,70,colors.gold,true,'Manrope');
text(s,'duplicate rows removed',803,328,375,62,25,colors.light);
text(s,'28 Aug–15 Sep 2026 UTC',78,453,1015,45,32,colors.ivory,true);
text(s,'A 144-hour gap remains missing.\nHistorical replay represents one JKUAT station.',78,521,1090,86,29,colors.light);foot(s,3,true);
note(s,'Derived source: data/processed/quality-report.json in the submitted repository. Input 21,189 rows, 18,364 unique, 2,825 duplicates removed. First 2026-08-28T00:00:25Z, last 2026-09-15T23:58:29Z. Gap 2026-09-04T23:58:18Z to 2026-09-11T00:00:01Z, 144.029h. The UI uses EAT; the date span here explicitly uses UTC. No interpolation crosses missing observations. Source files are organizer GeoCSV exports; official folder https://drive.google.com/drive/folders/1KDoCh8vss7nv_B6SuVBlQQssjSh1yaBg . Attribution: 3d-fewsnet.icdp.ucar.edu instrument61. DOI10.5065/D6V1236Q identifies CHORDS software, not a dataset DOI. Confirm redistribution and commercial terms with the owner before commercial deployment.');

s=slide();heading(s,'One workspace for the next job');
text(s,'A plan the\noperator can\ncarry out',72,217,360,195,44,colors.forest,true,'Manrope');
text(s,'Capacity-aware allocation\n\nRecorded task completion\n\nMeasured moisture history',75,447,345,150,25,colors.muted);
let shot=path.join(out,'overview-focus.png');try{await fs.access(shot)}catch{shot=path.join(root,'output/screenshots/overview.png')}
s.images.add({blob:new Uint8Array(await fs.readFile(shot)),contentType:'image/png',alt:'Actual Kavu overview in historical Conduit replay with demonstration batches',fit:'contain',position:{left:460,top:161,width:748,height:467}});foot(s,4);
note(s,'Screenshot of the actual local Kavu application provided by the implementation owner. Historical replay for 12 September 2026 and example batches. It shows software functionality, not a photograph of a customer installation or evidence of outcomes. Overview, Drying yard, Batches, Impact ledger and Data & settings are the implemented view structure. No external imagery used.');

s=slide();heading(s,'A measurement closes each decision');
const steps=[['01','Record the lot','Mass, measured moisture\nand a configured target.'],['02','Assign the work','Environmental evidence\nand available capacity.'],['03','Log a new reading','A person measures the grain\nafter the handling work.'],['04','Review the lot','Recent moisture at target\npermits storage review.']];
steps.forEach((a,i)=>{const x=72+i*295;text(s,a[0],x,214,250,65,54,colors.gold,true,'Manrope');text(s,a[1],x,313,260,82,31,colors.forest,true);text(s,a[2],x,413,253,110,25,colors.muted);});
text(s,'Weather suitability is an operating heuristic. Moisture review does not certify food safety.',75,584,1110,58,24,colors.forest);foot(s,5);
note(s,'Product methodology: deterministic operational rules use available temperature, relative humidity and rain plus capacity and lot metadata. Thresholds are configurable operating assumptions, not a trained drying model. Grain moisture comes from operator readings. Storage review requires a recent reading at or below the configured target. Moisture alone does not establish aflatoxin status or satisfy all buyer quality requirements. The historical replay is retrospective and cannot measure forecast performance. See shared domain engine and docs/methodology in final repository.');

s=slide(colors.gold);heading(s,'The economics of one example');
text(s,'KSh 3,778',72,190,1120,130,105,colors.forest,true,'Manrope');
text(s,'Drying-tariff equivalent',80,342,1100,58,40,colors.forest,true);
text(s,'5 tonnes × 2 percentage points × KSh 377.80',80,445,1100,56,33,colors.forest);
text(s,'Example moisture: 17% to 15%\nLabour, transport and causal savings are outside this comparison.',82,543,1090,80,27,colors.ink);foot(s,6);
note(s,'NCPB published reference tariff: KSh377.80 per1% moisture reduction per tonne, https://ncpb.co.ke/drying/ . We interpret a drop17% to15% as2 percentage points. Calculation5t×2pp×377.8=3778. The same NCPB page quotes18.90/50kg/pp; multiplying that rounded bag basis yields3780, a KSh2 rounding difference. Kavu uses the tonne basis consistently. Inputs are illustrative, not field observations. The tariff equivalent excludes actual handling/labour/transport, may differ from a depot quote, and is not verified savings, revenue or attributable impact.');

s=slide();heading(s,'A co-op buyer, a price to test');
text(s,'One supervisor.\nMany farmers’ lots.',72,207,560,150,50,colors.forest,true,'Manrope');
text(s,'The incumbent is a weather report\nand a notebook. Kavu must earn its\nplace in that daily workflow.',76,398,552,137,29,colors.muted);
text(s,'KSh 2,500',756,222,458,83,66,colors.forest,true,'Manrope');
text(s,'per active month per site',760,320,448,47,26,colors.muted);
text(s,'Pricing hypothesis\nNo paying customers claimed',760,433,445,111,28,colors.forest);
text(s,'Complements moisture meters and dryers. Potential advantage: permissioned lot and cost histories.',76,582,1125,66,24,colors.muted);foot(s,7);
note(s,'All buyer, price and moat statements are hypotheses, not customer discovery results. Proposed price KSh2500/active month/site from docs/research/market-and-evidence.md. Costs include infrastructure, support, onboarding, sales and seasonality. Competitor/complement sources: NCPB https://ncpb.co.ke/drying/ and Sesi GrainMate https://sesitechnologies.com/grainmate-grain-moisture-meter/ . No claim that these products lack unexamined features. The initial customer is a maize cooperative or aggregator near the station-relevant area, not all Kenyan farmers.');

s=slide(colors.forest);heading(s,'The next test is in the yard',true);
text(s,'A supervised pilot\nwith three maize yards',74,208,1090,149,59,colors.ivory,true,'Manrope');
text(s,'Observe current work first.\nCompare recommendations in shadow mode.\nMeasure adoption, rechecks and actual costs.',78,416,1090,159,30,colors.light);
text(s,'Seeking operator feedback and pilot introductions',80,602,1090,41,26,colors.gold,true);foot(s,8,true);
note(s,'Proposed pilot only. No committed yard, partner, customer or field result. Target3 yards and initially30 lot histories would test feasibility and usability, not power a causal impact study. Operators retain existing protective practices. Measure task completion, recordkeeping time, moisture-recheck process, rewetting episodes and receipts. Consider expansion after validated use, maintained station coverage and confirmed data rights. GitHub https://github.com/shi1720/Hack-The-Weather . Shivam Gupta founder/product lead; Codex-assisted research, engineering and documents.');

const candidate=path.join(out,'candidate.pptx');await (await PresentationFile.exportPptx(p)).save(candidate);
for(let i=0;i<p.slides.items.length;i++){const current=p.slides.items[i];const img=await p.export({slide:current,format:'png',scale:1});await fs.writeFile(path.join(out,`slide-${i+1}.png`),new Uint8Array(await img.arrayBuffer()));}
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')));
const finalPath=path.join(out,'final',`kavu-pitch-${Date.now()}.pptx`);
await fs.mkdir(path.dirname(finalPath),{recursive:true});
const result=await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath,pythonExecutable:path.join(runtime,'python/bin/python3'),integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:8,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:['Manrope','DM Sans']},verifyArtifactToolImport:true,receiptPath:path.join(out,'validation.json')});
await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));await fs.copyFile(finalPath,path.join(root,'output/kavu-pitch.pptx'));console.log(path.join(root,'output/kavu-pitch.pptx'));
