/**
 * Database initialization: PostgreSQL (DATABASE_URL) or SQLite (DATABASE_PATH / local file).
 */

import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { initPostgres, attachSqlite, isPostgres } from './driver.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '..', 'data', 'strategybox.db');

/** Strip whitespace and accidental wrapping quotes from dashboard paste. */
function normalizeDatabaseUrl(raw) {
    if (!raw) return '';
    let s = String(raw).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
    }
    return s;
}

if (!normalizeDatabaseUrl(process.env.DATABASE_URL || '') && !process.env.DATABASE_PATH) {
    console.warn('⚠️  DATABASE_PATH not set — SQLite database will be lost on redeploy.');
    console.warn('   On Render: use DATABASE_URL (Postgres) or disk + DATABASE_PATH=/data/strategybox.db');
}

let db = null;
let dbInitFailed = false;
let postgresReady = false;

export function isDbReady() {
    if (isPostgres()) return postgresReady;
    return !!db;
}

/**
 * Initialize database (async when using PostgreSQL).
 */
export async function initDb() {
    const pgUrl = normalizeDatabaseUrl(process.env.DATABASE_URL || '');
    if (pgUrl) {
        if (dbInitFailed) {
            const e = new Error('Database unavailable (initialization failed — see server logs).');
            e.code = 'DB_INIT_FAILED';
            throw e;
        }
        try {
            await initPostgres(pgUrl);
            postgresReady = true;
            return null;
        } catch (err) {
            dbInitFailed = true;
            postgresReady = false;
            throw err;
        }
    }

    if (db) return db;
    if (dbInitFailed) {
        const e = new Error('Database unavailable (initialization failed — see server logs).');
        e.code = 'DB_INIT_FAILED';
        throw e;
    }

    try {
        const dataDir = dirname(DB_PATH);
        if (!existsSync(dataDir)) {
            mkdirSync(dataDir, { recursive: true });
        }

        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        db.pragma('busy_timeout = 8000');

        const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
        db.exec(schema);

        try {
            const cols = db.prepare('PRAGMA table_info(projects)').all();
            if (!cols.some((c) => c.name === 'assigned_to')) {
                db.exec('ALTER TABLE projects ADD COLUMN assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL');
                console.log('📦 Migration: added assigned_to to projects');
            }
        } catch { /* ignore */ }

        try {
            db.exec(`
            CREATE TABLE IF NOT EXISTS shared_canvases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                share_id TEXT UNIQUE NOT NULL,
                name TEXT,
                data TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);
            db.exec('CREATE INDEX IF NOT EXISTS idx_shared_canvases_share_id ON shared_canvases(share_id)');
        } catch { /* ignore */ }

        try {
            db.exec(`
            CREATE TABLE IF NOT EXISTS project_canvases (
                project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
                data TEXT NOT NULL,
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);
            db.exec('CREATE INDEX IF NOT EXISTS idx_project_canvases_project ON project_canvases(project_id)');
        } catch { /* ignore */ }

        try {
            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_projects_workspace_updated ON projects(workspace_id, updated_at DESC);
                CREATE INDEX IF NOT EXISTS idx_invitations_invitee_user ON invitations(invitee_user_id);
                CREATE INDEX IF NOT EXISTS idx_activity_workspace_created ON activity_logs(workspace_id, created_at DESC);
            `);
        } catch (e) {
            console.warn('Index migration note:', e?.message || e);
        }

        attachSqlite(db);
        console.log(`📦 SQLite initialized at ${DB_PATH}${process.env.DATABASE_PATH ? ' (persistent)' : ' (ephemeral on redeploy)'}`);
        return db;
    } catch (err) {
        dbInitFailed = true;
        if (db) {
            try {
                db.close();
            } catch { /* ignore */ }
            db = null;
        }
        throw err;
    }
}

/**
 * @deprecated Models use db/driver.js. SQLite only.
 */
export function getDb() {
    if (isPostgres()) {
        throw new Error('getDb() is SQLite-only; use async model functions with DATABASE_URL.');
    }
    if (!db) throw new Error('Database not initialized — call await initDb() first.');
    return db;
}

export default { initDb, getDb, isDbReady };
