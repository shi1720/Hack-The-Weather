# Narrated hosted walkthrough

The final walkthrough demonstrates the real application at **https://kavu-drying.web.app/**. It was recorded on 22 September 2026 in a dedicated browser context. It is a product walkthrough with a disclosed stock AI narrator. Actual human team appearances remain necessary for the official hackathon video requirements.

## Deliverables

- `output/kavu-demo-narrated.mp4`: **4:25.000**, 1920 × 1080, 24 fps, H.264 video, AAC mono audio at 48 kHz. Final size: **10,842,049 bytes**. Fast-start MP4 supports web playback.
- `output/kavu-demo-narrated.srt`: **66 timed caption cues**, preserving all **500 words** of the locked narration.
- `scripts/record-narrated-demo.mjs`: reproducible browser capture and composition script.
- `output/build/narrated/capture/contact-sheet.jpg`: local visual review sheet of twelve decoded final-video frames. Intermediate capture files are intentionally excluded from Git.

The 144-pixel caption band occupies reserved space below the app. It does not cover controls or records. AI narration is disclosed continuously in the footer and explicitly on the closing architecture card. The voice is OpenAI's stock Cedar voice, not Shivam Gupta's voice; no voice cloning or generated person is used.

## What is shown

| Start | Scene | Verified content |
| --- | --- | --- |
| 00:00 | The last mile of the harvest | Actual hosted welcome screen and visible app URL |
| 00:18 | A real workspace | Real account creation, empty workspace, 500 kg sample batch at 17.0%, logout, login, and persisted record |
| 00:52 | Real Conduit observations | 18,364 unique observations, 2,825 duplicate overlaps removed, source files and primary gauge attribution |
| 01:17 | Evidence changes the decision | Missing 8 September, humid 15 September, and six suitable historical hours on 12 September |
| 01:41 | A plan that fits the yard | Sample Mavuno A-01, 1,800 kg at 18.2%; operator plan allocates 2,700 kg within 3,000 kg capacity |
| 02:07 | From plan to completed work | Actual spread and turn commands for the same sample batch, completed job records and handover brief |
| 02:29 | A measured cost comparison | Illustrative 15.0% reading, then approximately KSh 2,176 of drying-tariff equivalent in the ledger |
| 02:59 | Readiness starts with measurement | Separate illustrative 12.7% reading, confirmed storage readiness, and measurement history |
| 03:24 | A buyer and a practical pilot | Clearly labelled product-plan card: prospective buyer, KSh 2,500 pricing hypothesis, proposed pilot |
| 03:52 | A working foundation | Clearly labelled architecture and credit card, then the actual product closing |

All interface operations were recorded from the real hosted app. Product-plan and architecture cards are separate local HTML explanatory scenes, labelled as such. The capture does not substitute mockups for operations or accelerate clicks. Narration uses short silent holds to match the actual workflow; scene 02 audio is slowed to 0.82× for readability.

## Verification and limits

- Browser capture recorded **zero page errors and zero failing API responses**.
- Both browser UI and the authenticated workspace response verified a blank new account and the sample record surviving logout and login. The example email uses `example.test`. The generated password remained masked and was kept only in memory.
- The account scene and demonstration workspace are separate. The historical sequence uses fictional cooperative lots and explicitly illustrative meter readings, not field measurements.
- The ledger was checked before the later reading: `1.8 tonnes × 3.2 percentage points × KSh 377.80 = KSh 2,176.128`. This is a tariff reference comparison, not realized savings.
- The 12.7% reading and ready state were checked independently. The video distinguishes moisture-based review from food safety and aflatoxin testing.
- Pricing, customers and the pilot are hypotheses. No signed pilot, paying customers, causal field impact or revenue is claimed.
- Captions have exact script coverage, valid timestamps and no overlapping cues. Decoded frames were reviewed for provenance labels, values, readable controls, credits and unobstructed captions.
- Final encoded audio measures **−16.87 LUFS integrated**, **−1.37 dBTP true peak** and **4.90 LU loudness range**. The voice is normalized for comfortable listening without clipping. Caption timing remains unchanged by normalization.

Local QA records are in `output/build/narrated/capture/capture-manifest.json`, `composition-manifest.json`, `caption-verification.json`, `audio-verification.json` and `video-verification.json`. This walkthrough is prepared for publication; producing it does not itself submit the hackathon entry.

## Reproduce

Use installed project dependencies, a Playwright Chromium browser, FFmpeg, Python 3 and Pillow. The separately generated scene audio and word timestamps must exist in `output/build/narrated/audio/`. No service key is read by the recording script.

```sh
# Capture the hosted app and render. This creates a harmless new example account.
node scripts/record-narrated-demo.mjs

# Re-render the existing verified capture without creating another account.
node scripts/record-narrated-demo.mjs --render

# Reuse encoded scene clips as well; useful for caption/audio-only edits.
node scripts/record-narrated-demo.mjs --render --reuse-video
```

The default capture URL is the hosted app. `KAVU_NARRATED_URL` can select a compatible local or staging instance. On systems without the default macOS or Linux font, set `KAVU_CAPTION_FONT` to a readable TrueType font. Keep the spoken text, word timings and recorded actions consistent when revising scenes.
