# Render deploy keeps timing out?

## 1. Fix the Build Command (most common)

Your logs showed: `npm install; npm run build`

This API service **does not serve the Vite `dist/` folder** — `npm run build` only wastes time and makes the deploy bundle huge (timeouts on compress/upload).

**Render → Web Service → Settings → Build Command** — set exactly:

```bash
npm install --omit=dev --no-audit --no-fund
```

Or copy from `render.yaml` in this repo.

**Do not** add `npm run build` here unless you change `server.js` to serve `dist/` for production.

Frontend should be built on **Vercel / Cloudflare / another static host** (or a separate Render Static Site).

## 2. Health check

**Health Check Path:** `/health`  
Use the **`.onrender.com`** URL to test, not your marketing domain.

## 3. Disk + SQLite

`DATABASE_PATH=/data/strategybox.db` and a **persistent disk** mounted at `/data` on the **same** web service.

## 4. Still timing out?

- **Clear build cache** once, then deploy again.
- **Starter/paid** plan has more build resources than free.
- **Render status page** — check for incidents.
- **GitHub access** — reconnect Render ↔ GitHub if you see “no access to your repo”.
