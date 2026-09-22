# Conduit source observations

The three files in `raw/` were downloaded on 22 September 2026 from the public [organizer resource folder](https://drive.google.com/drive/folders/1KDoCh8vss7nv_B6SuVBlQQssjSh1yaBg), linked by the [hackathon resources page](https://hack-the-weather.devpost.com/resources).

Each export identifies **Kenya Kiambu JKUAT IOT AWS - Conduti@Empathy1**, sensor 61, at **-1.099736, 37.014528, 1,523 m**. Original headers, timestamps and attribution remain intact. The source filenames in our repository are convenience labels; the actual timestamp ranges in the files and provenance report are authoritative.

Run `npm run data:prepare` to reproduce `public/data/conduit.json` and `data/processed/quality-report.json`. SHA-256 checksums identify the original downloaded bytes. `npm run evaluate` reproduces the dated decision comparison.

This dataset contains station weather, not real cooperative records or measured grain moisture. Every seeded batch is fictional and labelled. Do not use the snapshot as current weather.

## Original files

| Local file | Original download |
|---|---|
| conduit-aug28-sep03.csv | https://drive.google.com/uc?export=download&id=1uQLj3WHvGeX6WRU3EL0ZcLTDVI_Gl23P |
| conduit-aug31-sep04.csv | https://drive.google.com/uc?export=download&id=192QZkcS3F3B1OnfxvARbvLs-ZGR3abwE |
| conduit-sep11-sep15.csv | https://drive.google.com/uc?export=download&id=1XQo9JstB_RzGi40MByI88TLQNQHqXV4Q |

Source attribution: Conduit@Empathy, JKUAT, JHUB Africa, UCAR/3D-PAWS CHORDS, DOI [10.5065/d6v1236q](https://doi.org/10.5065/d6v1236q). Source data retains its original rights and is excluded from the software MIT licence. See [methodology](../docs/data-methodology.md) and [third-party attribution](../THIRD_PARTY.md).
