# API Documentation

All endpoints are prefixed with `/api/v1`.

## Authentication

### Register
`POST /auth/register`
Creates a new user account.
*   **Body**: `{ "email": "user@example.com", "password": "...", "name": "..." }`
    *   Either `email` or `username` is required.
    *   Passwords must be at least 8 characters.
*   **Response**: `201 Created` with user data.

### Login
`POST /auth/login`
Authenticates a user and sets the HttpOnly Refresh Token cookie.
*   **Body**: `{ "email": "...", "password": "..." }`
*   **Response**: `200 OK`
    ```json
    {
      "data": {
        "user": { ... },
        "accessToken": "eyJhbG..."
      }
    }
    ```

### Refresh Token
`POST /auth/refresh`
Exchanges the valid cookie for a new Access Token and rotates the cookie.
*   **Headers**: Cookie `refresh_token=...` (Automatic by browser)
*   **Response**: `200 OK`
    ```json
    { "data": { "accessToken": "..." } }
    ```

### Logout
`POST /auth/logout`
Revokes the refresh token and clears the cookie.
*   **Headers**: `Authorization: Bearer <token>`
*   **Response**: `200 OK`

### Get Current User
`GET /auth/me`
*   **Headers**: `Authorization: Bearer <token>`
*   **Response**: `200 OK` with full user profile.

---

## Content

### GET /articles
List all published articles.
*   **Query**: `?page=1&limit=10&tag=tech`

### GET /articles/:slug
Get a single article by slug.

### GET /articles/:slug/featured-image
Returns the featured image for a published, public article.
*   **Response**: `200 OK` with image bytes or `302` redirect to the hosted image.

### GET /s/:code
Short-link redirect (outside `/api/v1`).
*   **Response**: `301` to `/blog/:slug` if the article is published and public.

### GET /papers
List Google Scholar papers.

### GET /papers/metrics (Protected)
Returns aggregate paper metrics for the authenticated user.

---

## Admin (Protected)

Requires `role: "ADMIN"`.

### POST /admin/sync-scholar
Triggers a background sync with Google Scholar.

### GET /admin/subscribers
Lists all newsletter subscribers.

### Backups (Admin)

#### GET /admin/backups
List backups.

#### POST /admin/backups
Create a backup job.
*   **Body**:
    ```json
    {
      "includeDb": true,
      "includeUploads": true,
      "includeEnv": true,
      "includeCerts": true,
      "encrypt": false,
      "passphrase": "optional"
    }
    ```
*   **Response**: `202 Accepted` with `{ "data": { "jobId": "..." } }`

#### GET /admin/backups/jobs/:id
Get backup/restore job status.

#### GET /admin/backups/:id/download
Download the backup archive.

#### GET /admin/backups/:id/bundle
Download a restore bundle (archive + metadata + restore instructions).

#### POST /admin/backups/:id/restore
Start a restore job.
*   **Body**:
    ```json
    {
      "mode": "staged",
      "restoreDb": true,
      "restoreUploads": true,
      "restoreEnv": false,
      "restoreCerts": false,
      "passphrase": "optional"
    }
    ```

#### DELETE /admin/backups/:id
Delete a backup.

---

## Example Requests

**Login (cURL):**
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"YOUR_PASSWORD"}' \
  -c cookies.txt
```

**Access Protected Route (using cookie from above):**
*Note: You actually need the Bearer token from the login response for the Authorization header, AND the cookie for refresh.*

```bash
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```
