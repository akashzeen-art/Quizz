# Admin panel — local run & production

## Prerequisites

- **JDK 21** (LTS). This repo’s Maven enforcer allows **21–24** only; **JDK 25+** is rejected (and often breaks MongoDB Atlas TLS). Use Temurin 21 or run `backend/run-dev.sh` on macOS (it picks Java 21 when available).
- **MongoDB** — local `mongodb://localhost:27017` or **MongoDB Atlas** (`MONGODB_URI` in `backend/.env`).

## Local development (two terminals)

### 1) Backend

```bash
cd backend
cp .env.example .env   # edit MONGODB_URI (and optional JWT / admin vars)
./run-dev.sh
```

API: `http://localhost:8080` (context path `/` — Vite proxies `/api` → backend).

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173` · Admin: **`http://localhost:5173/admin`**

### 3) Login (default seed)

If no document exists in the `admins` collection yet, the app creates one on startup:

- **Email:** `admin@gmail.com`  
- **Password:** `Admin@123`

Override defaults with **`ADMIN_SEED_EMAIL`** and **`ADMIN_SEED_PASSWORD`** in `backend/.env` before the first run (or change the admin document in MongoDB later).

## Production

**Production:** set a long random `JWT_SECRET`, set `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` for first deploy if you do not want the defaults, and point `CORS_ORIGINS` at your real origin.

1. Set a strong secret (min 32 characters):

   ```bash
   export JWT_SECRET="$(openssl rand -base64 48)"
   ```

2. Set **`ADMIN_SEED_EMAIL`** / **`ADMIN_SEED_PASSWORD`** only for the **first** deployment if you need a known bootstrap user; afterwards prefer managing admins in MongoDB or rotating credentials.

3. Set **`MONGODB_URI`**, **`CORS_ORIGINS`** (your real web origin), and run the backend with the same env vars your orchestrator supports (Kubernetes secrets, etc.).

4. Build frontend: `cd frontend && npm run build` — static assets can be served behind your CDN or reverse proxy.

## Troubleshooting

| Issue | What to do |
|--------|------------|
| `mvn compile` / enforcer fails | Use **JDK 21–24** (`java -version`). Not a bug in admin code. |
| Admin login 401 | Check `JWT_SECRET` matches between deploys; token stored in browser as `nserve_admin_jwt`. |
| Mongo connection errors | Verify Atlas IP allowlist, `MONGODB_URI`, and TLS (JDK 21). |
