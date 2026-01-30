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
    Copy the example environment files. The defaults work out-of-the-box for local development.
    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    ```

3.  **Start the Stack:**
    ```bash
    ./scripts/deploy.sh
    ```
    *(Note: Ensure Docker is installed and running)*

4.  **Access the Application:**
    *   **Frontend**: [http://localhost:5000](http://localhost:5000)
    *   **API**: [http://localhost:3001/api/v1](http://localhost:3001/api/v1)

## Ports & Configuration

By default, the application exposes the following ports on your host machine:

| Service | Host Port | Internal Port | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** | `5000` | `3000` | User Interface |
| **Backend** | `3001` | `5000` | API Server |
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
2.  Update internal CORS configuration if necessary. Since the backend allows the frontend origin, if you access the site via a different port, you usually update the `CORS_ORIGIN` in `backend/.env`:
    ```env
    CORS_ORIGIN=http://localhost:8080
    ```
3.  Restart containers:
    ```bash
    docker compose up -d
    ```

**Pitfalls:**
*   **Cookies**: Access tokens are stored in HttpOnly cookies. If you change the API domain/port, ensure browsers treat the cookie path correctly.
*   **CORS**: Browsers enforced strict same-origin policies. If your frontend port changes, the backend *must* know about it in `CORS_ORIGIN`.

## Troubleshooting

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
