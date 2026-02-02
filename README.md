# Modern Blog Platform

A production-ready, Dockerized full-stack blogging platform built with Next.js, Node.js/Express, PostgreSQL, and Redis.

## Overview

This project implements a secure, scalable blogging engine designed for performance and maintainability. It features a rich text editor, role-based access control (RBAC), and a synchronized Google Scholar integration for academic papers.

**Key Features:**
*   **Full-Stack Type Safety**: TypeScript across the entire stack.
*   **Secure Authentication**: HttpOnly cookies, JWT rotation, reuse detection, and strict session management.
*   **Performance**: Server-Side Rendering (SSR) with Next.js and Redis caching for high-load endpoints.
*   **Security**: Hardened with Helmet, strict CORS, rate limiting, and input sanitization.
*   **Observability**: Structured JSON logging and request correlation tracing.
*   **SEO Settings**: Global meta title/description (and optional OG image) from Admin settings.

## Architecture

*   **Frontend**: Next.js 14 (React) running in a standalone Node container.
*   **Backend**: Express.js REST API with Prisma ORM.
*   **Database**: PostgreSQL for persistent data.
*   **Cache**: Redis for session management (blacklisting) and rate limiting.
*   **Infrastructure**: Fully Dockerized with `docker-compose` orchestration.

## Quickstart

Prerequisites: Docker and Docker Compose installed.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/lef-zach/blog.git
    cd blog
    ```

2.  **Environment Setup:**
    Copy the example environment files and update secrets for your environment.
    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    ```
    *Set strong values for `JWT_SECRET` and `JWT_REFRESH_SECRET` before going public.*

3.  **Install & Bootstrap:**
    ```bash
    ./install.sh
    ```
    This will build containers, run migrations, optionally configure HTTPS, and create the first admin.
    It also disables the default nginx server block to avoid conflicting `server_name` warnings.
    You can run it non-interactively:
    ```bash
    CORS_ORIGIN=http://xxx.xxx.xxx.xxx:5000 INSTALL_HTTPS=false \
      ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=YOUR_PASSWORD \
      ./install.sh

    # HTTPS with self-signed cert
    CORS_ORIGIN=https://your-domain.com INSTALL_HTTPS=true \
      ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=YOUR_PASSWORD \
      ./install.sh
    ```
    *(Note: `./scripts/deploy.sh` is destructive: it hard-resets git and deletes volumes.)*

4.  **Access the Application:**
    *   **Frontend**: [http://localhost](http://localhost)
    *   **API**: [http://localhost/api/v1](http://localhost/api/v1)

## Health Checks

Use these after installation to confirm services are responding:

```bash
./scripts/health-check.sh
```

You can also run it non-interactively:

```bash
API_BASE_URL=http://localhost/api/v1 \
  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=YOUR_PASSWORD \
  ./scripts/health-check.sh
```

## Security Checklist (Production)

- HTTPS enabled and `COOKIE_SECURE=true`
- Strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (rotate if leaked)
- Only 80/443 exposed; Postgres/Redis/backends stay internal
- Use `docker compose exec` for database/redis access (no host ports)
- CORS allowlist includes only your real domain
- Admin registration disabled after first setup

## Ports & Configuration

By default, the application exposes the following ports on your host machine:

| Service | Host Port | Internal Port | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** | `5000` | `3000` | User Interface |
| **Backend** | `3001` | `3001` | API Server |
| **Database** | `5432` | `5432` | PostgreSQL (exposed for debugging) |
| **Redis** | `6379` | `6379` | Redis (exposed for debugging) |

### Changing Ports

If you need to change the exposed ports (e.g., if port 5000 is occupied), modify `docker-compose.yml`.

**Example: Change Frontend to Port 8080**

1.  Edit `docker-compose.yml`:
    ```yaml
    frontend:
      ports:
        - "8080:3000" # Map host 8080 to container 3000
    ```
2.  Update internal CORS configuration if necessary. Since the backend allows the frontend origin, if you access the site via a different port, update `CORS_ORIGIN` in `backend/.env` or `docker-compose.yml`:
    ```env
    CORS_ORIGIN=http://localhost:8080
    ```
3.  Restart containers:
    ```bash
    docker compose up -d
    ```

**Pitfalls:**
*   **Cookies**: Refresh tokens are stored in HttpOnly cookies. Over plain HTTP, cookies marked `Secure` are dropped. Use HTTPS in production or set `COOKIE_SECURE=false` for LAN testing.
*   **CORS**: Browsers enforce strict same-origin policies. If your frontend port or host changes, the backend must allow it in `CORS_ORIGIN`.
*   **Featured images**: Uploads are stored as data URLs. For large images, use a hosted URL instead. Layout/size can be set to Banner or Left Portrait with S/M/B sizes.
*   **Inline images**: Use the editor image button, then select the image and choose S/M/B in the toolbar size dropdown.

## Troubleshooting

**Common errors:**
*   **`Paper not found` on `/papers/metrics`**: restart backend after pulling the latest changes.
*   **`Not allowed by CORS`**: add the exact browser origin(s) to `CORS_ORIGIN` and restart backend.
*   **`Session expired` loops**: set `COOKIE_SECURE=false` on HTTP, or use HTTPS.
*   **`column ... does not exist`**: run `docker compose exec backend npx prisma migrate deploy`.

**Stop and clean everything:**
If you encounter weird database errors or want a fresh start:
```bash
docker compose down -v
```
*(Warning: `-v` deletes the database volume and all data)*

**View Logs:**
```bash
docker compose logs -f backend
# or
docker compose logs -f frontend
```
