/**
 * Optional Redis: shared pub client for rate-limit commands + Socket.io adapter (pub/sub).
 * Set REDIS_URL (e.g. Railway/Upstash). If unset, callers use in-memory rate limits and default Socket.io.
 */

import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

/**
 * @returns {Promise<{ sendCommand: ((...args: string[]) => Promise<unknown>) | null, applySocketAdapter: ((io: import('socket.io').Server) => void) | null }>}
 */
export async function initRedisInfrastructure() {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
        return { sendCommand: null, applySocketAdapter: null };
    }

    try {
        const pubClient = createClient({ url });
        const subClient = pubClient.duplicate();
        pubClient.on('error', (err) => console.error('Redis:', err.message));
        subClient.on('error', (err) => console.error('Redis sub:', err.message));
        await Promise.all([pubClient.connect(), subClient.connect()]);
        console.log('📦 Redis connected (rate limits + Socket.io adapter)');

        const sendCommand = (...args) => pubClient.sendCommand(args);

        const applySocketAdapter = (io) => {
            io.adapter(createAdapter(pubClient, subClient));
        };

        return { sendCommand, applySocketAdapter };
    } catch (err) {
        console.warn('⚠️  REDIS_URL set but Redis failed — falling back:', err?.message || err);
        return { sendCommand: null, applySocketAdapter: null };
    }
}
