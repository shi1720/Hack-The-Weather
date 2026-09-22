# Kavu HTTP interface

All endpoints are under `/api`. The web application uses the same-origin API. No CORS access is enabled. Mutations require JSON, `X-Kavu-Request: 1`, and a permitted browser Origin. A caller never supplies a user/tenant ID: the opaque HttpOnly session determines ownership.

| Method / path | Purpose |
|---|---|
| `GET /health` | Service/database availability |
| `GET /auth/me` | Current public user or `null` |
| `POST /auth/register` | `{ name, email, password }`; minimum 12-character password |
| `POST /auth/login` | `{ email, password }` |
| `POST /auth/demo` | `{}`; new isolated demo tenant |
| `POST /auth/logout` | `{}`; revoke the presented session |
| `POST /auth/password` | `{ currentPassword, newPassword }`; revoke all sessions after change |
| `GET /workspace` | Authenticated workspace with integer revision |
| `POST /commands` | `{ revision, command }`; validate and atomically apply a workspace command |
| `GET /data` | Canonical attributed historical Conduit snapshot |
| `GET /forecast?latitude=-1.0997&longitude=37.0145` | Authenticated server-side model forecast |

## Command examples

The discriminated TypeScript contract lives in `src/shared/types.ts`. The Zod runtime contract is in `src/shared/workspace.ts`. Server-side validation is authoritative.

```json
{
  "revision": 0,
  "command": {
    "type": "batch.create",
    "name": "North field E-05",
    "farmer": "North field group",
    "weightKg": 1800,
    "moisturePct": 18.2,
    "deadline": "2026-09-26"
  }
}
```

```json
{
  "revision": 1,
  "command": {
    "type": "batch.measure",
    "batchId": "actual-batch-id",
    "moisturePct": 15,
    "note": "Meter 02, representative samples; operator's observed reading."
  }
}
```

Supported commands: `batch.create`, `batch.measure`, `batch.status`, `plan.commit`, `task.complete`, `settings.update`, and demo-only `demo.reset`. Date-only deadlines express a planning day, not a promised delivery appointment. Task timestamps retain their own actual date/mode; clients must not combine them under an unrelated date.

Successful commands return the complete current workspace. Repeat task completions and identical plan commits do not duplicate actions. A stale revision returns **409**; reload the workspace and ask the operator to retry. Do not blindly replay non-idempotent intake commands after a network timeout: first check whether the batch was created.

## Failure contract

JSON errors contain `{ "error": "readable message", "code": "STABLE_CODE" }`. Typical statuses: 400 invalid input/operational constraint, 401 unauthenticated, 403 invalid origin or unauthorized action, 404 missing resource, 409 conflict, 413 oversized body, 415 wrong content type, 429 rate limit, 503 unavailable weather/provider.

The API never represents failed station data as a valid dry day, never trusts a client-calculated moisture outcome, and never accepts another caller's workspace identifier. Production cookies are Secure, HttpOnly, SameSite=Strict and use the `__Host-` prefix. See `tests/api.test.ts`, `tests/workspace.test.ts` and the deployment guide for executable examples and limitations.
