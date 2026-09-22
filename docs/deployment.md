# Running Kavu

Kavu's full application has two durable storage options: Firestore for the Firebase Hosting and Cloud Run deployment, or SQLite for a persistent single-node server. Both provide real accounts, tenant isolation and live forecast retrieval through the same API. A separate static preview keeps fictional demonstration records only in the visitor's browser and does not offer real registration or a live backend.

## Local development

Use Node.js 22.16 or newer and npm. Run:

```sh
npm ci
npm run dev
```

Open the Vite URL, normally `http://127.0.0.1:5173`. Vite proxies `/api` to the local API on port 3001. The development origin defaults to `http://localhost:5173` and accepts the equivalent `127.0.0.1` hostname. If Vite chooses another port, explicitly set `APP_ORIGIN` to that exact origin before starting the server. Environment files are examples; the Node server reads actual environment variables, not an automatically loaded `.env` file. The API can be started with `node --env-file=.env --import tsx server/index.ts` after copying and configuring `.env.example`.

Use **Try the demo** to create an independent fictional cooperative. Each demo session gets a new tenant and four fictional batches. A real registration starts with an empty yard. Real Conduit weather provenance remains visible in either mode. Replay dates are historical observations, never a live nowcast. Demo data reset is allowed only for demo tenants.

Run validation with:

```sh
npm run check
npm run test:e2e
```

The API and reducer tests do not require external services. The API suite uses a real HTTP listener on an ephemeral local port and an in-memory SQLite database. Forecast provider calls are injected for deterministic tests. An installed Playwright browser is required for browser tests (`npx playwright install chromium`).

## Firebase Hosting and Cloud Run

The full hosted application uses [kavu-drying.web.app](https://kavu-drying.web.app), with [kavu-drying.firebaseapp.com](https://kavu-drying.firebaseapp.com) accepted as Firebase's secondary hostname. Hosting serves the built frontend and rewrites `/api/**` to Cloud Run. Firestore stores accounts, hashed sessions and workspace state independently of each Cloud Run instance.

| Resource | Configuration |
| --- | --- |
| Hosting and Cloud Run project | `gen-lang-client-0444960702` |
| Firebase Hosting site | `kavu-drying` |
| Cloud Run service and region | `kavu-api`, `europe-west1` |
| Dedicated Firestore project | `kavu-drying` |
| Firestore database and location | `(default)`, `europe-west1` |
| Runtime service account | `kavu-runtime@gen-lang-client-0444960702.iam.gserviceaccount.com` |
| Database IAM grant | `roles/datastore.user` on the dedicated `kavu-drying` project only |

The runtime account does not need access to databases belonging to other applications in the hosting project. Production uses the runtime service account's Application Default Credentials. No service-account key file or OpenAI key is required.

Cloud Run's environment must explicitly target the dedicated database:

```text
DATA_STORE=firestore
GOOGLE_CLOUD_PROJECT=kavu-drying
FIRESTORE_DATABASE_ID=(default)
FIRESTORE_COLLECTION_PREFIX=kavu
SESSION_COOKIE_NAME=__session
NODE_ENV=production
APP_ORIGIN=https://kavu-drying.web.app
APP_ADDITIONAL_ORIGINS=https://kavu-drying.firebaseapp.com
HOST=0.0.0.0
PORT=8080
TRUST_PROXY_HOPS=1
```

Production startup refuses SQLite when the Cloud Run `K_SERVICE` environment is present, preventing accidental use of an ephemeral account database. Health checks query the selected store and return `storage: firestore` for this deployment. Cloud Run is configured with zero minimum instances, at most two instances, 1 GiB memory and concurrency 20. Authentication and general API rate limits are process-local; their aggregate allowance can scale with the two instances. They are not a global distributed rate limiter.

Firebase Hosting strips incoming cookies except `__session`. This explicit cookie name preserves the same opaque-session authentication contract while remaining host-only, Secure, HttpOnly and SameSite=Strict. User-specific API responses are `private, no-store`; only the public Conduit dataset can be cached. The secondary hostname is allowed through an explicit HTTPS-origin list, with no arbitrary Origin reflection. [Firebase Hosting cookie behavior](https://firebase.google.com/docs/hosting/manage-cache).

Firestore client security rules deny browser/mobile reads and writes. The API uses the runtime IAM identity and verifies the session and tenant on every workspace request. The compressed workspace payload is bounded to 900,000 bytes, with a 32 MiB uncompressed cap; writes exceeding a cap fail explicitly and preserve the previous revision. See [backend-store.md](backend-store.md) for transactions, session revocation, namespace layout, bounded cleanup and the real-service integration test.

Deployment uses the repository's `deploy:firebase` script with the authenticated official gcloud and Firebase CLIs. The script/configuration must select the hosting project and dedicated Firestore project explicitly; do not assume they are the same project. Build the hosted frontend with `VITE_DEMO_ONLY=false` and base path `/`. The full Firebase site must not receive the GitHub Pages demonstration build.

To verify the hosted API and persistence across a real deployment, use the guarded smoke script:

```sh
node scripts/smoke-hosted.mjs setup https://kavu-drying.web.app
# Deploy the next application revision, then verify its expected version:
node scripts/smoke-hosted.mjs verify https://kavu-drying.web.app var/hosted-smoke.json 2.0.0
node scripts/smoke-hosted.mjs cleanup https://kavu-drying.web.app
```

Setup creates two clearly named synthetic accounts and checks authentication, private cache headers, session attributes, tenant isolation, origin checks and concurrent-write conflicts. It uses three authentication requests so it can run alongside the browser suite without repeatedly consuming the shared authentication limit. Credentials and session cookies are saved only in ignored `var/hosted-smoke.json` with owner-only permissions. Verification reuses those original sessions and compares exact workspace digests, proving that the deployment preserved both. The optional final version argument must match the revision being tested.

Cleanup uses the authenticated official gcloud CLI to obtain a short-lived credential in process memory, verifies that each stored account matches the generated smoke identity, deletes only those accounts and associated data in the dedicated database, then removes the private state file. Do not leave fixture credentials in a submission archive or commit them. The script never prints them.

Firestore survives Cloud Run restarts without a mounted disk. This repository does not claim an automated Firestore export, backup or point-in-time-recovery schedule. Those provider features require separate retention, billing and recovery configuration. The SQLite backup command below does not back up Firestore, and CSV exports are not a full service backup.

## Single-node production with SQLite

Build and run behind an HTTPS reverse proxy. This storage mode requires one persistent server process and one SQLite volume. Do not scale replicas against a shared SQLite file or use SQLite on ephemeral serverless storage. Use the Firestore adapter for Cloud Run.

```sh
npm ci
npm run build
DATA_STORE=sqlite NODE_ENV=production APP_ORIGIN=https://kavu.example.org DATABASE_PATH=/srv/kavu/kavu.db npm start
```

The hostname above is a placeholder; configure a domain you control. `APP_ORIGIN` must be the exact public HTTPS origin, with no path. Secure session cookies will not work over plain HTTP in production. `HOST` defaults to `127.0.0.1`; set `HOST=0.0.0.0` only when appropriate for the deployment network. The built SPA and bundled public datasets are served by Express. Unknown `/api` routes return JSON 404 responses. Missing asset paths never return the SPA document.

Alternatively, use the included Dockerfile and Compose configuration:

```sh
APP_ORIGIN=https://your-real-domain.example docker compose up --build -d
```

Replace the example origin before running. Compose exposes the application only on `127.0.0.1:3001`, uses an unprivileged process, a read-only container filesystem and a persistent named data volume. Set up your own Caddy, nginx or platform TLS proxy in front. The container image bundles the server and backup CLI into Node entry points and installs only production runtime dependencies. Both install stages copy `.npmrc` before `npm ci` so lockfile peer-resolution settings stay consistent. Its health check calls `/api/health`.

`TRUST_PROXY_HOPS=1` is suitable only when exactly one trusted reverse proxy sits between clients and the server and direct external access to the server is blocked. Adjust it to the actual topology. Do not blindly trust arbitrary forwarding headers; they are used for request rate limiting.

### Configuration

| Variable | Purpose |
| --- | --- |
| `DATA_STORE` | `sqlite` for a persistent single node, or `firestore` for the cloud service. |
| `APP_ORIGIN` | Exact primary public origin; HTTPS is mandatory in production. |
| `APP_ADDITIONAL_ORIGINS` | Optional comma-separated explicit HTTPS origins, maximum eight; no paths or credentials. |
| `SESSION_COOKIE_NAME` | Use `__session` behind Firebase Hosting; otherwise the production default is `__Host-kavu_session`. |
| `GOOGLE_CLOUD_PROJECT` | Explicit Firestore project, which may differ from the Cloud Run project. |
| `FIRESTORE_DATABASE_ID` | Firestore database ID; defaults to `(default)`. |
| `FIRESTORE_COLLECTION_PREFIX` | Validated collection namespace; defaults to `kavu`. |
| `DATABASE_PATH` | Writable persistent SQLite file; defaults to `./var/kavu.db`. |
| `HOST`, `PORT` | Bind address and port; defaults to `127.0.0.1:3001`. |
| `NODE_ENV` | Set `production` for secure cookies and production headers. |
| `TRUST_PROXY_HOPS` | Optional number of trusted reverse proxies (1 to 5). |
| `WEATHER_USER_AGENT` | Identifying MET Norway User-Agent; set a real project contact URL. |
| `VITE_DEMO_ONLY` | Build-time switch for an explicitly local static demonstration. |
| `VITE_BASE_PATH` | Build-time subdirectory base, for example `/Hack-The-Weather/`. |

MET Norway Locationforecast requires no API key. Requests use a project-identifying User-Agent, coordinates rounded to four decimals, an 8-second timeout, in-flight deduplication, a 12-request in-flight limit, a 200-location bounded cache and at least 30 minutes of caching while honouring a later provider `Expires` time. Provider failures are surfaced; the server never replaces a failed forecast with invented observations. Missing hourly precipitation remains unknown rather than zero. Attribution appears in forecast data and the product.

The checked-in official Conduit export snapshot supports reliable reproduction with no secret. Conduit account credentials are not required to demonstrate the supplied dataset. Do not publish private platform credentials or place them in `VITE_` variables.

### Authentication and persistence

Passwords use a unique random salt with Node's scrypt derivation. Sessions are 256-bit random opaque tokens, stored hashed in the selected backend and sent in HttpOnly, SameSite=Strict cookies. Production cookies are Secure. Direct self-hosting defaults to the browser-enforced `__Host-` prefix. Firebase Hosting requires the configured name `__session`; it still uses a host-only cookie with root path and no Domain attribute. Regular sessions last 7 days; demo sessions last 24 hours. Login rotates the presented session; logout revokes it. Password change verifies the current password, updates it with a compare-and-swap check and revokes all existing sessions. Each account is limited to 20 simultaneous sessions; older sessions are removed when a new device exceeds the limit. Expired sessions and expired demo tenants are periodically removed. Production must use TLS so credentials and sessions are protected in transit.

Mutating APIs require JSON, the application request header and a matching Origin when an Origin header is supplied. No cross-origin CORS policy is enabled. Login, registration and demo creation have stricter rate limits; all APIs have a general rate limit. Limits are process-local: one limiter per SQLite server or Cloud Run instance. The hosted deployment caps Cloud Run at two instances; it does not claim a shared cross-instance limiter. Body size is bounded and error responses do not disclose database details.

Every workspace query uses the authenticated user identifier, never a caller-supplied tenant ID. Commands carry an expected revision and execute in an atomic transaction in the selected SQLite or Firestore store. Conflicting edits return HTTP 409 and cannot overwrite newer state. Each real account currently represents one operator-owned yard; team invitations and shared multi-operator organizations are future work. Yard data is bounded to 500 batches, 2,000 tasks, 500 audit entries and 500 measurements per batch; this is a bounded operational history, not an immutable compliance archive.

Storage confirmation and dispatch both require an actual moisture meter reading at or below that batch's target within 24 hours. The default operating target is 13.0%, configurable for new intakes; it is not a grain-safety certification. Existing batch targets remain fixed when yard settings change. A capacity of zero represents a closed/unavailable outdoor yard. The reference tariff is exactly KSh 377.80 per tonne per moisture percentage point, not a per-kilogram charge. Completing a drying task never changes the recorded moisture. The operational planning model is transparent decision support and does not certify grain safety, detect aflatoxin or validate a drying outcome. Historical replay is not a dispatch instruction based on current weather. Every generated task explicitly identifies its historical or forecast basis. Real accounts cannot complete historical spread/turn tasks as live outdoor instructions; the isolated demonstration permits simulated execution. Completing a forecast spread/turn task fetches current cached model guidance again and checks its age, location, scheduled day and current conditions. New outdoor spreading also requires a favourable following hour and sufficient physical yard capacity. Provider failure leaves the task pending. Operators must still check actual local conditions; no automated rule guarantees weather or grain safety.

Recommitting a plan updates changed pending instructions and removes obsolete pending tasks for that same date/mode, while retaining completed task evidence. Task completion cannot create a fictional moisture reduction, early meter readings cannot satisfy future measurement reminders, and stale spread tasks are rejected when the batch has reached its target, become too wet for the outdoor rule, or moved to a mechanical dryer. Turning is only confirmed for grain already spread outdoors. An old cover reminder does not downgrade grain already confirmed ready. In this model, completing a cover job means **moving grain under shelter and clearing its drying-floor allocation**; throwing a tarp over grain that remains on the floor does not release capacity and must not be recorded as this job's completion. Separate sheltered-storage capacity is not modeled. A dryer job records an operator's referral/contact outside Kavu only. Completing it preserves the batch's physical status, bay and measured moisture; it does not imply booking confirmation, handoff, a drying start or a drying outcome. Grain already under shelter remains there; any separate move must be confirmed as its own action. Stale referrals for grain already at target or ready are rejected. Kavu sends no contact or booking requests and cannot verify external dryer availability or completion.

### SQLite backups, maintenance and recovery

For a SQLite deployment, use the included backup command while the application is running:

```sh
npm run backup -- ./var/kavu.db ./backups/kavu-2026-09-22.db
```

Both arguments are explicit paths. The destination must be a **new filename**; even an existing empty file is rejected. This uses SQLite's online backup API, including committed WAL records, then runs `PRAGMA integrity_check`, checks foreign keys and verifies an independent restore copy in a temporary directory. The temporary copy is deleted after verification. It never replaces or modifies the live database. Output contains paths, record counts and verification metadata, never account or workspace contents. New snapshots use owner-only permissions on POSIX systems. Failed new snapshots are removed; existing backup files are never overwritten.

Re-verify a stored snapshot before a recovery operation:

```sh
npm run backup -- --verify ./backups/kavu-2026-09-22.db
```

The production image bundles the same CLI without requiring development dependencies:

```sh
docker compose exec kavu node backup.mjs /app/var/kavu.db /app/var/backups/kavu-2026-09-22.db
docker compose exec kavu node backup.mjs --verify /app/var/backups/kavu-2026-09-22.db
```

Copy the resulting snapshot to protected storage outside that volume/host. These commands do not schedule recurring backups or make off-host copies automatically. Choose a fresh timestamped filename for every run. Do not manually copy only an active `.db` file while WAL mode is in use; committed data can remain in its WAL sidecar. The verification command expects a completed standalone snapshot, not a still-running source database.

Store backup copies outside the server, protect them as sensitive operational data, and test restores into a separate instance. For an actual recovery, stop the service first, preserve the existing database and sidecars together as a rollback set, and restore the verified snapshot into a clean target location with the correct owner/permissions. Do not leave old WAL/SHM files next to a restored database. Before restarting, invalidate restored sessions (`DELETE FROM sessions;` using a reviewed administrative SQLite operation on the stopped restored database) so rolling back cannot revive previously revoked session tokens. Then restart and verify `/api/health`, sign-in and workspace revision. The CLI deliberately does not automate live replacement or remove production files. Set an operator-owned retention schedule and monitor disk space, backup age, API error rate and service availability.

Current schema version is tracked with SQLite `user_version=1`; older application versions reject a database with a newer schema rather than silently downgrading its version. Newly created data directories are private and database files use owner-only permissions on POSIX systems. There is no deployed schema-migration history yet. Future upgrades that change the schema must add reviewed, transactional migrations and a restore-tested backup. SIGINT/SIGTERM stop accepting requests and close SQLite cleanly, with a 10-second shutdown limit.

There is currently no email verification, self-service password recovery, MFA, account-deletion UI or administrative console. Do not promise these features to pilot customers. Password change is available in **Account settings**, backed by `/api/auth/password`; changing it revokes existing sessions and requires sign-in again. Before onboarding a real cooperative, review the published privacy information, define operational support/recovery/deletion procedures, configure and monitor the appropriate store backups, and perform a deployment-specific security review. Those are operational deployment prerequisites, not evidence of completed customer validation.

## Optional public static preview

```sh
VITE_DEMO_ONLY=true VITE_BASE_PATH=/Hack-The-Weather/ npm run build
```

Use this only for the separate static preview, not for the full Firebase site. Publish `dist/` to a static host at the configured base path. The preview has no backend, no real registration, no shared accounts and no live forecast endpoint. Demo workspace changes stay in localStorage on that browser/device. **Reset demo** restores the fictional seed; signing out clears the local session. Clearing browser data also removes the preview workspace. Web Locks serialize edits across tabs where supported; expected revisions detect stale writes. This mode is suitable for a judge's click-through and is not suitable for a production cooperative.
