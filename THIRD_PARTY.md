# Attribution and third-party material

Kavu uses original application code and original product graphics (CSS/SVG) plus these dependencies. The lockfile records exact versions. Package licence files in `node_modules` remain authoritative.

| Resource | Role | Licence / source |
|---|---|---|
| React / React DOM | Interface | MIT, https://react.dev/ |
| Vite / TypeScript / tsx | Build and type system | MIT / Apache-2.0 / MIT; https://vite.dev/ and https://www.typescriptlang.org/ |
| Express | HTTP server | MIT, https://expressjs.com/ |
| better-sqlite3 / SQLite | Persistence | MIT / public domain, https://github.com/WiseLibs/better-sqlite3 and https://sqlite.org/ |
| Zod | Runtime validation | MIT, https://zod.dev/ |
| Papa Parse | GeoCSV parsing | MIT, https://www.papaparse.com/ |
| Helmet, express-rate-limit, cookie-parser | HTTP safeguards | See individual package licences |
| Lucide | UI icons | ISC, https://lucide.dev/license |
| Manrope and DM Sans | Locally hosted typography | SIL Open Font License 1.1, distributed via Fontsource |
| Vitest, Playwright, axe-core | Tests and accessibility checks | MIT / Apache-2.0 / MPL-2.0; see package licences |
| MET Norway Locationforecast | Optional model forecast | https://api.met.no/doc/License; CC BY 4.0 with attribution, terms https://api.met.no/doc/TermsOfService |
| Conduit@Empathy / JKUAT / JHUB Africa / 3D-PAWS / UCAR CHORDS | Organizer-provided station observations | Original attribution preserved in raw GeoCSV; https://doi.org/10.5065/d6v1236q |
| NCPB | Published drying-service reference tariff | Linked reference, not a partnership or negotiated price: https://ncpb.co.ke/drying/ |
| KALRO training manual | Postharvest problem context | https://keep.kalro.org/appfiles/media/vc_files/maize-tot.pdf |

Conduit data was downloaded from the organizer-linked public resource folder. Its use here supports the hackathon's explicit data-use requirement. The exports carry attribution but no comprehensive redistribution/commercial-use licence text. Kavu does not claim ownership or apply MIT to this data. Confirm the applicable data permissions with the provider before a commercial rollout. No competing project's application code or transformed dataset was used. A public provenance note helped locate the original organizer folder when its URL shortener was inaccessible; all included measurements were then retrieved from the original files.

Forecast data is never represented as a Conduit observation. Forecast requests go to MET Norway server-to-server with the requested approximate coordinates, following its identification/caching requirements. No third-party analytics, remote fonts, paid model inference, SMS or email delivery are required.
