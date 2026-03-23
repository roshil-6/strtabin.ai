/**
 * Database initialization and connection
 * SQLite for now; schema designed for easy PostgreSQL migration later
 */

import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '..', 'data', 'strategybox.db');

if (!process.env.DATABASE_PATH) {
    console.warn('⚠️  DATABASE_PATH not set — database will be lost on redeploy.');
    console.warn('   On Render: upgrade to Starter plan, add disk (mount /data), set DATABASE_PATH=/data/strategybox.db');
}

let db = null;
/** After a failed init, skip retry spam (getDb will throw a clear error). */
let dbInitFailed = false;

export function isDbReady() {
    return !!db;
}

/**
 * Initialize database: create data dir, run schema, return connection
 */
export function initDb() {
    if (db) return db;
    if (dbInitFailed) {
        const e = new Error('Database unavailable (initialization failed — see server logs).');
        e.code = 'DB_INIT_FAILED';
        throw e;
    }

    try {
        const dataDir = dirname(DB_PATH);
        if (!existsSync(dataDir)) {
            try {
                mkdirSync(dataDir, { recursive: true });
            } catch (err) {
                console.error(`❌ Cannot create database dir ${dataDir}:`, err.message);
                if (process.env.DATABASE_PATH) {
                    console.error('   Check that the disk is mounted and the path is correct.');
                }
                throw err;
            }
        }

        try {
            db = new Database(DB_PATH);
        } catch (err) {
            console.error(`❌ Cannot open database at ${DB_PATH}:`, err.message);
            if (process.env.DATABASE_PATH && err.message.includes('unable to open')) {
                console.error('   The disk may not be mounted. On Render: ensure disk is attached and mount path matches DATABASE_PATH.');
            }
            throw err;
        }
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');

        const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
        db.exec(schema);

        // Migration: add assigned_to to projects if missing
        try {
            const cols = db.prepare("PRAGMA table_info(projects)").all();
            if (!cols.some(c => c.name === 'assigned_to')) {
                db.exec('ALTER TABLE projects ADD COLUMN assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL');
                console.log('📦 Migration: added assigned_to to projects');
            }
        } catch (e) { /* column may already exist */ }

        // Migration: shared_canvases table (for chat canvas sharing)
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
        } catch (e) { /* table may already exist */ }

        // Migration: project_canvases table (for team workspace canvas persistence)
        try {
            db.exec(`
            CREATE TABLE IF NOT EXISTS project_canvases (
                project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
                data TEXT NOT NULL,
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);
            db.exec('CREATE INDEX IF NOT EXISTS idx_project_canvases_project ON project_canvases(project_id)');
        } catch (e) { /* table may already exist */ }

        console.log(`📦 Database initialized at ${DB_PATH}${process.env.DATABASE_PATH ? ' (persistent)' : ' (EPHEMERAL — data lost on redeploy)'}`);
        return db;
    } catch (err) {
        dbInitFailed = true;
        if (db) {
            try { db.close(); } catch { /* ignore */ }
            db = null;
        }
        throw err;
    }
}

/**
 * Get database connection (call initDb first)
 */
export function getDb() {
    if (!db) return initDb();
    return db;
}

export default { initDb, getDb };
