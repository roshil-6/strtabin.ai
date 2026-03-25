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

/** Remove leading full-line -- comments (do not drop the whole chunk if it starts with a comment). */
function stripLeadingLineComments(chunk) {
    let s = chunk.trim();
    while (s.length > 0) {
        const lines = s.split('\n');
        const first = lines[0].trim();
        if (first === '' || first.startsWith('--')) {
            lines.shift();
            s = lines.join('\n').trim();
            continue;
        }
        break;
    }
    return s;
}

function splitSqlStatements(sql) {
    return sql
        .replace(/\r\n/g, '\n')
        .split(/;\s*(?:\n|$)/)
        .map((s) => stripLeadingLineComments(s))
        .filter((s) => s.length > 0);
}

/**
 * Safe summary for logs (no password).
 * @param {string} connectionString
 */
export function summarizePgUrl(connectionString) {
    try {
        const normalized = connectionString.replace(/^postgres(ql)?:/i, 'http:');
        const u = new URL(normalized);
        return {
            host: u.hostname,
            port: u.port || '(default)',
            database: (u.pathname || '').replace(/^\//, '') || '(none)',
        };
    } catch {
        return { host: '(unparseable URL)', port: '', database: '' };
    }
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export async function initPostgres(connectionString) {
    const ssl =
        /localhost|127\.0\.0\.1/i.test(connectionString) && !connectionString.includes('sslmode=require')
            ? undefined
            : { rejectUnauthorized: false };

    /** @type {import('pg').Pool} */
    const newPool = new pg.Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 20_000,
        ssl,
    });

    const schemaPath = join(__dirname, 'schema.postgres.sql');
    const schema = readFileSync(schemaPath, 'utf8');

    try {
        const client = await newPool.connect();
        try {
            let n = 0;
            for (const stmt of splitSqlStatements(schema)) {
                n += 1;
                await client.query(stmt);
            }
            if (n === 0) {
                throw new Error('schema.postgres.sql produced zero statements — check file format.');
            }
        } finally {
            client.release();
        }
        await newPool.query('SELECT 1');
        pool = newPool;
        usePostgres = true;
        console.log('📦 PostgreSQL connected (DATABASE_URL)');
    } catch (err) {
        await newPool.end().catch(() => {});
        throw err;
    }
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
