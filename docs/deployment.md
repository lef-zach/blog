# Deployment Guide

This application is designed to run behind a reverse proxy (Nginx, Traefik, Cloudflare).

## Production Requirements

1. **HTTPS is mandatory**
   Refresh tokens are stored in HttpOnly cookies. In production, cookies must be marked `Secure`, which requires HTTPS.

2. **Environment variables**
   Set strong, unique secrets and restrict allowed origins.
   - `JWT_SECRET` and `JWT_REFRESH_SECRET`: long random strings (e.g. `openssl rand -hex 64`)
   - `CORS_ORIGIN`: exact frontend origin(s), comma-separated
   - `COOKIE_SECURE`: `true` in production, `false` only for local HTTP testing

## Reverse Proxy Setup (Nginx example)

Expose only Nginx to the public internet and keep app containers internal.

```nginx
server {
    listen 443 ssl http2;
    server_name yourblog.com;

    # SSL config...

    location / {
        proxy_pass http://frontend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://backend:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Port Exposure Strategy

In production, do not expose database or Redis ports.

- PostgreSQL `5432`: keep internal only
- Redis `6379`: keep internal only
- Expose only Nginx (80/443). Backend/frontend should stay internal.

If you need local access for troubleshooting, use a separate `docker-compose.override.yml` and do not commit it.

## CORS on LAN / VPS

If you see `Not allowed by CORS` errors, add the exact browser origin(s) to `CORS_ORIGIN` and restart the backend.

## Local HTTPS (Self-Signed)

`install.sh` can generate a self-signed certificate for local HTTPS testing. Browsers will show a warning until the cert is trusted.
