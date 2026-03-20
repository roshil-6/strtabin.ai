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
