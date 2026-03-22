# Database Persistence on Render

Team workspace data (and all SQLite data) is lost on redeploy unless you use a **persistent disk**.

## Why data is lost

- Render's **free plan** has an ephemeral filesystem — all files are wiped on every redeploy
- **Persistent disks** are only available on **paid plans** (Starter $7/mo or higher)

## Fix: Use a persistent disk

### Option A: Use the updated `render.yaml` (recommended)

The repo includes disk configuration. You must:

1. **Upgrade to Starter plan** in Render Dashboard → your service → Settings → Instance Type → Starter
2. **Sync the blueprint** or redeploy — the disk will be created automatically
3. The disk mounts at `/data` and `DATABASE_PATH=/data/strategybox.db` is set

### Option B: Manual setup in Render Dashboard

1. Upgrade your service to **Starter** or higher
2. Go to **Disks** → **Add Disk**
   - **Mount path:** `/data`
   - **Size:** 1 GB (minimum)
3. Add environment variable:
   - **Key:** `DATABASE_PATH`
   - **Value:** `/data/strategybox.db`
4. Redeploy

### Verify it works

After redeploy, check the logs. You should see:

```
📦 Database initialized at /data/strategybox.db (persistent)
```

If you see `(EPHEMERAL — data lost on redeploy)`, the disk or `DATABASE_PATH` is not configured correctly.

## Staying on Free plan

If you cannot upgrade, data will reset on every redeploy. Consider migrating to **Render Postgres** (managed database) for persistence — that would require code changes to use PostgreSQL instead of SQLite.
