# Development Guide

This guide covers running the project locally in a standard development workflow.

## Running with Docker (Recommended)

The default Docker setup mirrors production and does not include hot-reloading. For a clean setup with migrations and admin bootstrap, run `./install.sh`.
You can also run it non-interactively:

```bash
CORS_ORIGIN=http://localhost:5000 INSTALL_HTTPS=false \
  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=YOUR_PASSWORD \
  ./install.sh
```

```bash
docker compose up -d
```

## Rebuilding Images

If you install new npm packages (`npm install`), you must rebuild the images because `node_modules` inside the container needs to update.

```bash
docker compose up -d --build
```

## Database Management

We use Prisma for database schema management.

**Running Migrations:**
Run Prisma inside the backend container:

```bash
docker compose exec backend npx prisma migrate deploy

## Bootstrap an Admin User

The UI relies on an admin user for public settings. Create one after migrations:

```bash
./scripts/bootstrap-admin.sh
```

You can also pass values non-interactively:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=YOUR_PASSWORD ./scripts/bootstrap-admin.sh
```
```

**Viewing Data (Prisma Studio):**
You can run Prisma Studio locally if you have Node installed on your host:
```bash
cd backend
npx prisma studio
```
It will connect to `localhost:5432` (since we expose that port in `docker-compose.yml`).

## Debugging

### Auth Issues
*   **"Session expired" constantly**: If you are using HTTP, set `COOKIE_SECURE=false` (or use HTTPS). Secure cookies are dropped over HTTP.
*   **Log Inspection**: Use the structured logs to trace where auth fails.
    ```bash
    docker compose logs -f backend | grep "auth_login_failed"
    ```

### Port Conflicts
If you see `bind: address already in use`, another service is using port 3001 or 5000.
*   Change the host port mapping in `docker-compose.yml`.
*   Example: Change `3001:5000` to `3002:5000`. Your API is now at `localhost:3002`.

### Viewing specific service logs
To see only frontend logs:
```bash
docker compose logs -f frontend
```
