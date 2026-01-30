# Contributing

We welcome contributions!

## Development Workflow

1.  **Fork** the repository.
2.  **Clone** your fork.
3.  **Start** the environment using Docker:
    ```bash
    docker compose up
    ```
4.  Make your changes.
    *   **Backend**: Edit `backend/src`. changes will auto-restart the server.
    *   **Frontend**: Edit `frontend/`. Next.js will hot-reload.
5.  **Test** your changes.
6.  **Push** to your fork and submit a Pull Request.

## Guidelines

*   Keep commits focused and atomic.
*   Format code using Prettier (if configured) or standard style.
*   Do not commit secrets (User `.env` for local config).
