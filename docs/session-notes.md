# Session Notes (2026-01-30)

This file summarizes the work completed during the stabilization and hardening of the blog stack.

## Highlights

- Fully dockerized stack with only nginx exposing ports (80/443).
- Clean install flow via `install.sh` (prompts for CORS/HTTPS/admin).
- Health check automation via `scripts/health-check.sh`.
- Admin dashboard metrics fixed to use `/papers/metrics` (route order corrected).
- Auth stabilized: access token cookies, logout works without refresh storms.
- Featured image file picker added for articles (stores data URL).
- Docs refreshed for production safety, CORS, cookies, and troubleshooting.

## New/Updated Scripts

- `install.sh`: optional purge, env setup, HTTPS cert handling, migrations, admin bootstrap.
- `scripts/bootstrap-admin.sh`: interactive admin creation (or env-based).
- `scripts/health-check.sh`: smoke test for `/api/health`, `/api/v1/profile/public`, `/api/v1/papers/metrics`.

## Key Fixes

- Added migrations to align Prisma and DB (`User.username`, `User.scholarUrl`, `Paper.url`).
- Fixed `/papers/metrics` route being shadowed by `/:id`.
- Added access token cookie for Next.js middleware auth.
- Logout no longer triggers refresh storms or redirects public pages.
- `/api/health` now proxied via nginx to backend `/health`.

## Security / Deployment Notes

- Only nginx exposes 80/443; backend/frontend/postgres/redis are internal.
- `COOKIE_SECURE=true` for HTTPS, `false` only for LAN HTTP testing.
- Strong JWT secrets required in production.
- CORS allowlist should include only actual frontend origins.

## Common Commands

Install (interactive):

```bash
./install.sh
```

Install (non-interactive):

```bash
CORS_ORIGIN=http://xxx.xxx.xxx.xxx:5000 INSTALL_HTTPS=false \
  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=YOUR_PASSWORD \
  ./install.sh
```

Health check:

```bash
./scripts/health-check.sh
```

Restart nginx after config changes:

```bash
sudo docker compose restart nginx
```

## Notes

- `blog_30/` is ignored in `.gitignore` for local transcript exports.
