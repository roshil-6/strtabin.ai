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

let db = null;

/**
 * Initialize database: create data dir, run schema, return connection
 */
export function initDb() {
    if (db) return db;

    const dataDir = join(__dirname, '..', 'data');
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
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

    console.log(`📦 Database initialized at ${DB_PATH}`);
    return db;
}

/**
 * Get database connection (call initDb first)
 */
export function getDb() {
    if (!db) return initDb();
    return db;
}

export default { initDb, getDb };
