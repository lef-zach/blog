# Development Guide

This guide covers running the project locally in a standard development workflow.

## Running with Docker (Recommended)

The Docker setup mirrors production but enables hot-reloading for development convenience.

```bash
docker compose up
```

*   **Backend Changes**: The `backend/` directory is mounted as a volume. Changes to `.ts` files trigger `nodemon` to restart the server automatically.
*   **Frontend Changes**: The `frontend/` directory is mounted. Next.js Fast Refresh handles UI updates instantly.

## Rebuilding Images

If you install new npm packages (`npm install`), you must rebuild the images because `node_modules` inside the container needs to update.

```bash
docker compose up --build
```

## Database Management

We use Prisma for database schema management.

**Running Migrations:**
You need to run prisma commands *inside* the backend container or pointing to the exposed port. Ideally, run inside the container:

```bash
# Enter the backend container
docker compose exec backend sh

# Run migrations
npx prisma migrate dev
```

**Viewing Data (Prisma Studio):**
You can run Prisma Studio locally if you have Node installed on your host:
```bash
cd backend
npx prisma studio
```
It will connect to `localhost:5432` (since we exposed that port in docker-compose).

## Debugging

### Auth Issues
*   **"Session expired" constantly**: Check if your browser is blocking "Third-party cookies" if running frontend/backend on different domains (though localhost ports are usually fine).
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
