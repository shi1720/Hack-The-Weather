# Durable backend storage

The browser API is the same in both modes. Registration, sign-in, password changes, session revocation, workspace loading and revision-checked commands run on the Express server. `DATA_STORE=sqlite` uses a persistent single-node SQLite file. `DATA_STORE=firestore` uses durable Firestore documents and is suitable for Cloud Run instances whose local files disappear when an instance stops.

## Production configuration

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

`GOOGLE_CLOUD_PROJECT` identifies the Firestore project explicitly. It can differ from the project hosting Cloud Run. Production Cloud Run startup refuses local SQLite so a missing storage setting cannot silently create an ephemeral account database. Application Default Credentials come from the Cloud Run runtime service account, which needs database access only in the intended Firestore project. Do not create or ship a service-account key in the browser, source tree or container image. The deployed runtime identity is configured by infrastructure, not by the user signing into Kavu.

`TRUST_PROXY_HOPS` must match the trusted proxy path and direct network exposure of the actual deployment. API rate limits remain per-instance. A bounded Cloud Run instance count limits cost and multiplication of those limits; a global abuse-control service would be needed before large-scale public adoption.

`APP_ADDITIONAL_ORIGINS` optionally lists up to eight explicit HTTPS origins separated by commas. Paths, credentials, query strings and fragments are rejected. Incoming Origin values must exactly match the configured set; the server never reflects arbitrary request origins. This supports the two hostnames Firebase provisions while preserving request-origin checks.

Firebase Hosting forwards only the specially named `__session` cookie to Cloud Run. With the explicit environment setting, Kavu sends that cookie as host-only, HttpOnly, Secure and SameSite=Strict. All account, workspace, command, forecast and health responses use `Cache-Control: private, no-store` and vary by Cookie. The public, identical-for-everyone Conduit dataset is the sole cacheable API response. [Firebase Hosting cookie and cache documentation](https://firebase.google.com/docs/hosting/manage-cache).

Production authorization is server-side. Firestore web/mobile client rules must deny all client reads and writes. The server SDK uses IAM credentials, so the runtime service account's scope is the relevant access boundary. A public Firebase site configuration is not permission to read database records.

## Data layout and transactions

The configured prefix produces five collections:

| Collection | Purpose |
| --- | --- |
| `kavu_users` | Account identity, salted password hash, authentication version and up to 20 active session references. |
| `kavu_emails` | SHA-256 email claim keys used to enforce unique normalized email addresses transactionally. |
| `kavu_sessions` | Hashed opaque session identifiers, owner, expiry and authentication version. |
| `kavu_workspaces` | Tenant-owned workspace payload and optimistic-concurrency revision. |
| `kavu_meta` | Reserved metadata namespace; health checks read a non-sensitive document reference without creating it. |

User creation reserves the email claim, user and initial workspace in one transaction. Workspace mutations read the expected revision and write the replacement in one transaction. Concurrent edits cannot silently overwrite newer work; one succeeds and a stale revision receives HTTP 409. Transaction retries run only local command evaluation, with no external bookings, messages or weather requests inside the transaction. [Firestore transaction behavior](https://cloud.google.com/firestore/native/docs/manage-data/transactions).

Session creation checks that the password hash still matches the one just authenticated, preventing an in-flight old-password login from creating a session after a password change. Password change compares the current hash, increments the authentication version, revokes earlier sessions and creates the replacement session atomically. Authentication checks expiry, user existence, authentication version and membership in the account's bounded session list. A deleted, expired or superseded session cannot authenticate even if a delayed cleanup has not deleted every related document.

Workspace JSON is gzip-compressed into a Firestore bytes field. The compressed payload is limited to 900,000 bytes, leaving room below Firestore's 1 MiB document limit for revision and metadata. Encoding and decompression also cap the uncompressed representation at 32 MiB. A workspace that reaches either limit gets an explicit HTTP 413 `STORAGE_LIMIT` response and the previous revision remains intact. Users can export records; operators must plan archival or a future chunked-history migration before expanding beyond this bounded pilot storage model. This is an enforced limit, not an unlimited-history claim. Exempting the `payload` field from indexes avoids indexing data that is never queried. [Firestore document and field limits](https://firebase.google.com/docs/firestore/quotas).

## Expiry and cleanup

Regular sessions expire after seven days. Demo sessions and demo workspaces expire after 24 hours. Expiry is checked during authentication and does not depend on deletion timing. Each cleanup pass deletes at most 100 expired sessions and 20 expired demo tenants, including their workspace and known sessions. Cleanup runs at server startup, hourly while the process is scheduled, and at most once per minute when API traffic resumes. It never deletes a real account based on age.

The optional Firestore TTL field is `expiresAt`, a timestamp on session documents and on demo user/workspace documents only. TTL is not required for authentication correctness. If enabled, it must be configured for all relevant collections so deleting a demo user cannot leave its workspace indefinitely. TTL deletion is asynchronous, does not cascade automatically, and requires billing. The application cleanup remains available when the dedicated database uses the free quota. [Firestore TTL behavior](https://cloud.google.com/firestore/native/docs/ttl), [billing requirements](https://firebase.google.com/docs/firestore/quotas).

## Verification

The ordinary SQLite API suite remains deterministic and does not contact cloud services. The Firestore suite has an explicit opt-in and uses random `kavu_test_<uuid>` collection prefixes. It deletes only the fixtures in that exact generated namespace after the run:

```sh
FIRESTORE_TEST_PROJECT=kavu-drying npx vitest run tests/firestore-store.test.ts
```

Use approved Application Default Credentials or the emulator, never pasted tokens in source files. When the official gcloud CLI is already signed in but ADC is absent, the test-only flag `FIRESTORE_TEST_USE_GCLOUD=1` obtains a short-lived access token from `gcloud auth print-access-token` directly into process memory. The token is never logged or written to a file; production uses the runtime service account instead. For an already running Firestore emulator:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIRESTORE_TEST_PROJECT=demo-kavu-test npx vitest run tests/firestore-store.test.ts
```

The integration suite checks concurrent email claims, tenant isolation, competing workspace revisions, reads through a second client, session limits and revocation, password compare-and-swap, bounded demo cleanup, storage-limit rollback, and the real HTTP API with Firebase-compatible cookies and private cache headers. A skipped cloud suite is not evidence of a successful cloud test.

The SQLite backup CLI applies only to SQLite deployments. Firestore recovery requires the provider's database export, backup or recovery facilities and their associated billing and retention settings. No Firestore backup schedule is implied by enabling this adapter. Any restore procedure must invalidate restored sessions before reopening access so a rollback cannot revive a previously revoked token.
