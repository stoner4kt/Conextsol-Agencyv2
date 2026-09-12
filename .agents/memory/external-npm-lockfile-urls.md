---
name: External npm lockfile URLs
description: Deployment compatibility constraint for npm lockfiles generated inside Replit.
---

When a project is deployed outside Replit, npm lockfiles must use publicly resolvable registry URLs rather than Replit’s internal package-firewall tarball host.

**Why:** External builders such as Cloudflare cannot resolve internal Replit DNS names, so `npm clean-install` fails before the application build starts even when the dependency graph and source code are valid.

**How to apply:** If an external deployment reports `ENOTFOUND package-firewall.replit.internal`, inspect `package-lock.json` and replace only those `resolved` URLs with the matching public npm registry URLs while preserving versions and integrity hashes.