/**
 * Keeps a local copy of recent messages per chat on this device for faster reloads
 * and offline-style viewing. Does not replace server storage or provide true E2E encryption.
 */
import type { Message } from '../services/chatService';

const STORAGE_KEY = 'stratabin-chat-mirror-v1';
const MAX_PER_CHAT = 150;

type MirrorStore = Record<string, { updated: number; messages: Message[] }>;

function readStore(): MirrorStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MirrorStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: MirrorStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

export function mirrorChatMessages(chatId: number, messages: Message[]) {
  if (!chatId || !messages?.length) return;
  const store = readStore();
  const slice = messages.slice(-MAX_PER_CHAT);
  store[String(chatId)] = { updated: Date.now(), messages: slice };
  writeStore(store);
}

export function readMirroredMessages(chatId: number): Message[] | null {
  const entry = readStore()[String(chatId)];
  if (!entry?.messages?.length) return null;
  return entry.messages;
}
