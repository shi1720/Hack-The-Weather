# Hosted API release verification

The production API at [kavu-drying.web.app](https://kavu-drying.web.app) passed the hosted smoke checks and preserved both original sessions and exact workspace contents across a real deployment from version 1.0.0 to 2.0.0. Persistence uses the dedicated Firestore database in project `kavu-drying`.

| Phase | UTC time | Result |
| --- | --- | --- |
| Establish fixtures on version 1.0.0 | 2026-09-22 05:29:26 | Passed |
| Verify after version 2.0.0 deployment | 2026-09-22 05:33:58 | Passed |
| Remove both fixtures and private local state | 2026-09-22 05:36:02 | Passed |

The setup used two independently registered, temporary accounts. One workspace reached revision 2 and the other stayed empty at revision 0. The script checked the following behavior through the public Firebase Hosting origin:

- Session cookies use the Firebase-compatible `__session` name with Secure, HttpOnly and SameSite=Strict attributes.
- Authenticated API responses are private and not cached.
- Separate accounts receive separate workspaces. A request to mutate the other account's batch returns HTTP 404.
- Requests from a foreign origin or without the required request header return HTTP 403.
- Two concurrent commands using the same revision yield exactly one HTTP 200 and one HTTP 409.
- Logout revokes the old session. Password login creates a working replacement.
- After deployment, the original session cookies still authenticate, and both workspace revisions and SHA-256 content digests are unchanged.

The verified release came from Cloud Build `267fca35-e31d-4e19-afaf-015184d85227`, image tag `release-20260922053015915`, image digest `sha256:cf3c591f1f793ed788986798e4dcf47e465c852847b328dd4203aded635958bd`.

Cleanup validated each fixture's generated identity before removing its user, email claim, workspace and sessions. Both fixtures were removed, and the private state file was deleted. No account identifiers, emails, passwords, cookies, access tokens or workspace contents are included in this report or the [machine-readable evidence](../hosted-verification.json).

The checks were performed with [`scripts/smoke-hosted.mjs`](../../scripts/smoke-hosted.mjs). They demonstrate the listed behavior for this deployment and do not claim an external penetration test, availability guarantee or configured cloud backup schedule. The separate real-Firestore integration suite also passed all eight tests, covering concurrent registration, transaction conflicts, password/session changes, tenant separation, bounded cleanup and storage limits.
