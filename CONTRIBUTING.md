# Contributing

We welcome contributions!

## Development Workflow

1.  **Fork** the repository.
2.  **Clone** your fork.
3.  **Start** the environment using Docker:
    ```bash
    ./install.sh
    ```
    If the project is already configured:
    ```bash
    docker compose up -d
    ```
4.  Make your changes.
    *   Rebuild containers after dependency or code changes:
        ```bash
        docker compose up -d --build
        ```
5.  **Test** your changes.
6.  **Push** to your fork and submit a Pull Request.

## Guidelines

*   Keep commits focused and atomic.
*   Format code using Prettier (if configured) or standard style.
*   Do not commit secrets (User `.env` for local config).
