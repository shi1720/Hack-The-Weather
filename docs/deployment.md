# Running Kavu

Kavu has two deployment modes. The server mode provides real accounts, tenant isolation, durable SQLite workspaces and live forecast retrieval. The public static preview provides an isolated demonstration saved in the visitor's browser. It does not pretend to register accounts or run server infrastructure.

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

## Single-node production

Build and run behind an HTTPS reverse proxy. This release deliberately targets one persistent server process and one SQLite volume. Do not scale replicas against a shared SQLite file or deploy this server to ephemeral serverless storage.

```sh
npm ci
npm run build
NODE_ENV=production APP_ORIGIN=https://kavu.example.org DATABASE_PATH=/srv/kavu/kavu.db npm start
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
| `APP_ORIGIN` | Exact public origin; HTTPS is mandatory in production. |
| `DATABASE_PATH` | Writable persistent SQLite file; defaults to `./var/kavu.db`. |
| `HOST`, `PORT` | Bind address and port; defaults to `127.0.0.1:3001`. |
| `NODE_ENV` | Set `production` for secure cookies and production headers. |
| `TRUST_PROXY_HOPS` | Optional number of trusted reverse proxies (1–5). |
| `WEATHER_USER_AGENT` | Identifying MET Norway User-Agent; set a real project contact URL. |
| `VITE_DEMO_ONLY` | Build-time switch for an explicitly local static demonstration. |
| `VITE_BASE_PATH` | Build-time subdirectory base, for example `/Hack-The-Weather/`. |

MET Norway Locationforecast requires no API key. Requests use a project-identifying User-Agent, coordinates rounded to four decimals, an 8-second timeout, in-flight deduplication, a 12-request in-flight limit, a 200-location bounded cache and at least 30 minutes of caching while honouring a later provider `Expires` time. Provider failures are surfaced; the server never replaces a failed forecast with invented observations. Missing hourly precipitation remains unknown rather than zero. Attribution appears in forecast data and the product.

The checked-in official Conduit export snapshot supports reliable reproduction with no secret. Conduit account credentials are not required to demonstrate the supplied dataset. Do not publish private platform credentials or place them in `VITE_` variables.

### Authentication and persistence

Passwords use a unique random salt with Node's scrypt derivation. Sessions are 256-bit random opaque tokens, stored hashed in SQLite and sent in HttpOnly, SameSite=Strict cookies. Production cookies are Secure and use the browser-enforced `__Host-` prefix (host-only, root path, no Domain attribute). Regular sessions last 7 days; demo sessions last 24 hours. Login rotates the presented session; logout revokes it. Password change verifies the current password, updates it with a compare-and-swap check and revokes all existing sessions. Each account is limited to 20 simultaneous sessions; older sessions are removed when a new device exceeds the limit. Expired sessions and expired demo tenants are periodically removed. Production must use TLS so credentials and sessions are protected in transit.

Mutating APIs require JSON, the application request header and a matching Origin when an Origin header is supplied. No cross-origin CORS policy is enabled. Login, registration and demo creation have stricter rate limits; all APIs have a general rate limit. Limits are process-local, suitable for the documented one-node deployment. Body size is bounded and error responses do not disclose database details.

Every workspace query uses the authenticated user identifier, never a caller-supplied tenant ID. Commands carry an expected revision and execute in an atomic SQLite transaction. Conflicting edits return HTTP 409 and cannot overwrite newer state. Each real account currently represents one operator-owned yard; team invitations and shared multi-operator organizations are future work. Yard data is bounded to 500 batches, 2,000 tasks, 500 audit entries and 500 measurements per batch; this is a bounded operational history, not an immutable compliance archive.

Storage confirmation and dispatch both require an actual moisture meter reading at or below that batch's target within 24 hours. The default operating target is 13.0%, configurable for new intakes; it is not a grain-safety certification. Existing batch targets remain fixed when yard settings change. A capacity of zero represents a closed/unavailable outdoor yard. The reference tariff is exactly KSh 377.80 per tonne per moisture percentage point, not a per-kilogram charge. Completing a drying task never changes the recorded moisture. The operational planning model is transparent decision support and does not certify grain safety, detect aflatoxin or validate a drying outcome. Historical replay is not a dispatch instruction based on current weather. Every generated task explicitly identifies its historical or forecast basis. Real accounts cannot complete historical spread/turn tasks as live outdoor instructions; the isolated demonstration permits simulated execution. Completing a forecast spread/turn task fetches current cached model guidance again and checks its age, location, scheduled day and current conditions. New outdoor spreading also requires a favourable following hour and sufficient physical yard capacity. Provider failure leaves the task pending. Operators must still check actual local conditions; no automated rule guarantees weather or grain safety.

Recommitting a plan updates changed pending instructions and removes obsolete pending tasks for that same date/mode, while retaining completed task evidence. Task completion cannot create a fictional moisture reduction, early meter readings cannot satisfy future measurement reminders, and stale spread tasks are rejected when the batch has reached its target, become too wet for the outdoor rule, or moved to a mechanical dryer. Turning is only confirmed for grain already spread outdoors. An old cover reminder does not downgrade grain already confirmed ready. In this model, completing a cover job means **moving grain under shelter and clearing its drying-floor allocation**; throwing a tarp over grain that remains on the floor does not release capacity and must not be recorded as this job's completion. Separate sheltered-storage capacity is not modeled. A dryer job records an operator's referral/contact outside Kavu only. Completing it preserves the batch's physical status, bay and measured moisture; it does not imply booking confirmation, handoff, a drying start or a drying outcome. Grain already under shelter remains there; any separate move must be confirmed as its own action. Stale referrals for grain already at target or ready are rejected. Kavu sends no contact or booking requests and cannot verify external dryer availability or completion.

### Backups, maintenance and recovery

Use the included backup command while the application is running:

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

There is currently no email verification, self-service password recovery, MFA, account-deletion UI or administrative console. Do not promise these features to pilot customers. Password change is available in **Account settings**, backed by `/api/auth/password`; changing it revokes existing sessions and requires sign-in again. For a real pilot, publish a privacy notice, define support/recovery/deletion procedures, monitor backups and perform a deployment-specific security review. Those are operational deployment prerequisites, not evidence of completed customer validation.

## Public static preview

```sh
VITE_DEMO_ONLY=true VITE_BASE_PATH=/Hack-The-Weather/ npm run build
```

Publish `dist/` to a static host at the configured base path. The preview has no backend, no real registration, no shared accounts and no live forecast endpoint. Demo workspace changes stay in localStorage on that browser/device. **Reset demo** restores the fictional seed; signing out clears the local session. Clearing browser data also removes the preview workspace. Web Locks serialize edits across tabs where supported; expected revisions detect stale writes. This mode is suitable for a judge's click-through and is not suitable for a production cooperative.
