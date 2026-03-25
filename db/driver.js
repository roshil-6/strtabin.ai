/**
 * Dual backend: PostgreSQL (DATABASE_URL) or SQLite (better-sqlite3).
 * All model access goes through qAll / qGet / qRun for portability.
 */

import pg from 'pg';
import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Parse int8 as number for JSON/API consistency */
pg.types.setTypeParser(pg.types.builtins.INT8, (val) => parseInt(val, 10, 10));

let usePostgres = false;
/** @type {import('pg').Pool | null} */
let pool = null;
/** @type {import('better-sqlite3').Database | null} */
let sqliteDb = null;

export function isPostgres() {
    return usePostgres;
}

export function nowSql() {
    return usePostgres ? 'CURRENT_TIMESTAMP' : "datetime('now')";
}

/** IFNULL (SQLite) / COALESCE (both) for scalar subqueries */
export function ifNull(expr, fallback) {
    return usePostgres ? `COALESCE(${expr}, ${fallback})` : `IFNULL(${expr}, ${fallback})`;
}

/** YYYY-MM-DD day key from a timestamp column */
export function dayKey(col) {
    return usePostgres
        ? `to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`
        : `date(${col})`;
}

function sqlConv(sql) {
    if (!usePostgres) return sql;
    let n = 0;
    return sql.replace(/\?/g, () => `$${++n}`);
}

/**
 * @param {string} sql
 * @param {unknown[]} [params]
 */
export async function qAll(sql, params = []) {
    if (usePostgres) {
        const r = await pool.query(sqlConv(sql), params);
        return r.rows;
    }
    return sqliteDb.prepare(sql).all(...params);
}

/**
 * @param {string} sql
 * @param {unknown[]} [params]
 */
export async function qGet(sql, params = []) {
    if (usePostgres) {
        const r = await pool.query(sqlConv(sql), params);
        return r.rows[0];
    }
    return sqliteDb.prepare(sql).get(...params);
}

/**
 * @param {string} sql
 * @param {unknown[]} [params]
 * @returns {Promise<{ changes: number, lastInsertRowid: number | null }>}
 */
export async function qRun(sql, params = []) {
    if (usePostgres) {
        const r = await pool.query(sqlConv(sql), params);
        const id = r.rows[0]?.id;
        return {
            changes: r.rowCount ?? 0,
            lastInsertRowid: id != null ? Number(id) : null,
        };
    }
    if (/RETURNING\s+id/i.test(sql)) {
        const row = sqliteDb.prepare(sql).get(...params);
        return { changes: 1, lastInsertRowid: row?.id != null ? Number(row.id) : null };
    }
    const info = sqliteDb.prepare(sql).run(...params);
    return { changes: info.changes, lastInsertRowid: Number(info.lastInsertRowid) || null };
}

function splitSqlStatements(sql) {
    return sql
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export async function initPostgres(connectionString) {
    usePostgres = true;
    const ssl =
        /localhost|127\.0\.0\.1/i.test(connectionString) && !connectionString.includes('sslmode=require')
            ? undefined
            : { rejectUnauthorized: false };
    pool = new pg.Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 15_000,
        ssl,
    });
    const schemaPath = join(__dirname, 'schema.postgres.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    const client = await pool.connect();
    try {
        for (const stmt of splitSqlStatements(schema)) {
            await client.query(stmt);
        }
    } finally {
        client.release();
    }
    await pool.query('SELECT 1');
    console.log('📦 PostgreSQL connected (DATABASE_URL)');
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function attachSqlite(db) {
    usePostgres = false;
    pool = null;
    sqliteDb = db;
}

export function getSqliteDb() {
    return sqliteDb;
}
