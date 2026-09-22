# Hosted release verification

Verified on 22 September 2026 at **https://kavu-drying.web.app/**.

## Delivered deployment

- Firebase Hosting site: `kavu-drying`.
- Cloud Run: `kavu-api`, `europe-west1`, revision `kavu-api-00003-4pb`.
- Firestore: dedicated project `kavu-drying`, native `(default)` database, `europe-west1`.
- Runtime identity has datastore access to the dedicated Kavu database project. Client Firestore access is denied by deployed rules.
- Cloud Build: `4be4d6fa-f8a4-4986-ac12-5d9807c1b451`.
- Image: `europe-west1-docker.pkg.dev/gen-lang-client-0444960702/kavu/api:release-20260922054114166`.
- Image digest: `sha256:f0a6fc2e27f844ee35df95d7df1209cabf211ca9859ba4091d1cad315a0affcf`.
- The complete `npm run deploy:firebase` command passed, including build, unit/API checks, lint, remote container build, API revision deployment, Hosting deployment and public health verification.

Hosting and Cloud Run occupy only newly created Kavu resources in the existing billed project `gen-lang-client-0444960702`. Application data is isolated in the dedicated Firestore project. No unrelated service or database was changed. Cloud Run scales to zero, with a maximum of two instances. This is a cost-conscious pilot configuration, not a load-test result or a zero-cost guarantee.

## Verification results

| Check | Result and scope |
| --- | --- |
| TypeScript and production UI build | Passed |
| ESLint | Passed; generated browser reports are excluded |
| Default Vitest suite | 112 passed, 6 optional Firestore integration checks skipped |
| Real Firestore suite | 8 passed, including the two codec tests also present in the default suite |
| Local Playwright suite | 16 passed before the additional cloud-loading regression |
| Final hosted Playwright suite | 17 passed in approximately 1.6 minutes |
| Dependency audit | Zero production dependency vulnerabilities at verification time |
| Reproducible data evaluation | Six suitable hours and 2,700 kg allocation on the favourable replay; zero outdoor allocation for humid, missing or removed evidence |
| API deployment persistence | Original sessions, exact workspace digests and revisions survived the real 1.0.0 to 2.0.0 deployment |
| Hosted tenancy and concurrency | Other tenant's batch rejected; simultaneous same-revision writes produce one success and one 409 |
| Hosted request protections | Secure, HttpOnly, SameSite=Strict session cookie; private/no-store API responses; invalid-origin and missing-request-header writes rejected |

The final hosted run includes the two review fixes: repeated same-day outdoor cycles create fresh jobs while retaining completed history, and downloaded evidence contains the calculation basis and individual measurement records. The independent reviewer verified 30 focused workspace/export tests. GitHub CI at commit `26a9688` also passed the Firestore emulator suite, all browser checks, the production Docker build and startup, and the separate static offline preview.

The hosted browser run covers registration, incorrect-password feedback, sign-out/sign-in, password change, persistent batch intake, the complete Conduit-to-job-to-measurement workflow, storage checks, CSV download and spreadsheet formula escaping. It also exercises retryable load/save failures, revision-conflict form retention, session expiry, demo reset, forecast failure and stale-forecast withdrawal.

Every application page was checked at 390, 768 and 1440 pixels. Operation dialogs and the loading state were checked with axe. No serious or critical automated accessibility finding or horizontal page overflow remained in these checks. Keyboard focus trapping/restoration and mobile navigation were exercised. Automated checks do not establish complete accessibility conformance.

The first hosted run found low contrast in the initial loading message, which a fast local session check had usually hidden. The text contrast was corrected, and the final suite explicitly holds the session request open to test that state. All final hosted checks passed.

The internal browser independently opened the live site, created an isolated demo and received a current MET Norway forecast with visible issue time and attribution. That forecast is clearly distinguished from historical Conduit observations. Firebase responses supplied HTTPS HSTS, the intended Content Security Policy, `X-Frame-Options: DENY` and `nosniff`.

## Evidence and operational limits

See [API verification](hosted-api-v2.md), [machine-readable API evidence](../hosted-verification.json), [UI review](ui-audit-v2.md), [deployment guide](../deployment.md), and [judge testing instructions](../submission/testing-instructions.md).

This is a working hosted application suitable for supervised evaluation. It has not been load tested or field validated. Pilot operations still need off-host backup and restore procedures, account recovery/support and privacy processes, local operating validation and confirmation of commercial data permissions. Current limits, including one account owner per workspace and process-local rate limits, are documented. No automated messages, dryer bookings, measured savings, food-safety certification or actual customer adoption are claimed.
