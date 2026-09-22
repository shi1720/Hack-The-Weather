# Security and operational scope

Kavu is designed for a single-node supervised pilot. The server stores hashed passwords and hashed expiring sessions, validates inputs, scopes workspaces to the authenticated owner, applies origin checks and rate limits, and rejects conflicting revisions. The public static sandbox stores only its own sample records in browser storage and provides no real login.

Do not commit `.env`, SQLite databases, API credentials or real farmer records. Deploy the server behind HTTPS with a persistent writable database volume and a validated proxy configuration. Run `npm audit`, restore-test backups and keep dependencies current. The [deployment guide](docs/deployment.md) documents support, recovery, retention and privacy work still required before serving customers.

The database's bounded audit log is an operational history, not a tamper-proof compliance ledger. One account currently owns one workspace; multi-operator roles, MFA, email verification and self-service email recovery are not implemented. Grain decisions require field review and measured moisture, and do not certify food safety.

If you identify a vulnerability, report it privately through GitHub's private vulnerability reporting if enabled. Do not publish account data, credentials or exploit details in a public issue. This repository makes no external penetration-testing certification or availability guarantee.
