export function registerChatSocket(socket, userId, getChat) {
    const chatIdFrom = (payload) => Number.isSafeInteger(payload?.chatId) && payload.chatId > 0 ? payload.chatId : null;
    socket.on('chat:join', async (payload) => {
        const id = chatIdFrom(payload);
        if (!id) return;
        try {
            if (await getChat(id, userId)) socket.join(`chat:${id}`);
        } catch { /* Fail closed if membership cannot be checked. */ }
    });
    socket.on('chat:typing', async (payload) => {
        const id = chatIdFrom(payload);
        if (!id) return;
        try {
            if (await getChat(id, userId)) socket.to(`chat:${id}`).emit('chat:typing', { chatId: id, userId });
        } catch { /* Fail closed. */ }
    });
    socket.on('chat:leave', (payload) => {
        const id = chatIdFrom(payload);
        if (id) socket.leave(`chat:${id}`);
    });
}
