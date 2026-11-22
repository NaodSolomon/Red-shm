import type { ImagePickerAsset } from 'expo-image-picker';

import { appendMessage, conversationId, createConversation, demoBuyer, roleFor, seedConversations,
  type Conversation, type DraftMessage, type Message, type Role } from './conversations';
import { photoExtension } from './listing-photo';
import { demoSeller } from './listings';
import { readConversations } from './read-conversations';
import { normalizeTime } from './fulfillment-time';
import type { Product } from '@/types/marketplace';

export const conversationStorageKey = 'red-shm.conversations.v1';

interface Storage {
  read: () => Promise<string | null>;
  write: (data: string) => Promise<void>;
  uuid: () => string;
  copy: (name: string, asset: ImagePickerAsset) => Promise<string>;
  resolve: (name: string) => Promise<string | undefined>;
  remove: (name: string, uri?: string) => Promise<void>;
}

interface Snapshot {
  ready: boolean;
  error?: string;
  conversations: Conversation[];
  attachments: ReadonlyMap<string, string>;
}

export function createConversationStore(io: Storage, catalogue: Product[]) {
  const initial: Snapshot = { ready: false, conversations: [], attachments: new Map() };
  let snapshot = initial;
  let loading: Promise<void> | undefined;
  let pending = Promise.resolve();
  const listeners = new Set<() => void>();

  function update(next: Snapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  async function persist(conversations: Conversation[], attachments = snapshot.attachments) {
    try {
      await io.write(JSON.stringify(conversations));
    } catch {
      throw new Error('This change could not be saved on this device. Try again.');
    }
    update({ ready: true, conversations, attachments });
  }

  async function read() {
    update(initial);
    try {
      const raw = await io.read();
      if (raw === null) {
        await persist(seedConversations(catalogue, new Date().toISOString()));
        return;
      }
      const conversations = readConversations(raw);
      const attachments = new Map<string, string>();
      const names = new Set(conversations.flatMap((thread) => thread.messages.flatMap((message) =>
        message.type === 'image' || message.type === 'payment' ? [message.attachment] : [])));
      await Promise.all([...names].map(async (name) => {
        const uri = await io.resolve(name).catch(() => undefined);
        if (uri) attachments.set(name, uri);
      }));
      update({ ready: true, conversations, attachments });
    } catch {
      update({ ...initial, error: 'Saved conversations could not be opened. Try again.' });
    }
  }

  async function load() {
    if (snapshot.ready) return;
    loading ??= read().finally(() => { loading = undefined; });
    await loading;
  }

  function serialize<T>(operation: () => Promise<T>) {
    const result = pending.then(async () => {
      await load();
      if (!snapshot.ready) throw new Error(snapshot.error);
      return operation();
    });
    pending = result.then(() => {}, () => {});
    return result;
  }

  function lookup(id: string) {
    const thread = snapshot.conversations.find((conversation) => conversation.id === id);
    if (!thread) throw new Error('This conversation is unavailable.');
    return thread;
  }

  function replace(next: Conversation, attachments?: ReadonlyMap<string, string>) {
    return persist(snapshot.conversations.map((thread) => thread.id === next.id ? next : thread), attachments);
  }

  function open(product: Product, perspective: Role = 'buyer') {
    return serialize(async () => {
      const ownListing = product.seller.id === demoSeller.id;
      if ((perspective === 'seller') !== ownListing || product.seller.id === demoBuyer.id) {
        throw new Error('Choose a listing belonging to the other participant.');
      }
      const id = conversationId(product);
      if (snapshot.conversations.some((thread) => thread.id === id)) return id;
      if (product.status !== 'Active') throw new Error('This listing is unavailable for new inquiries.');
      await persist([...snapshot.conversations, createConversation(product, new Date().toISOString())]);
      return id;
    });
  }

  function build(thread: Conversation, senderId: string, draft: DraftMessage): Message {
    const timestamp = new Date(Math.max(Date.now(), Date.parse(thread.lastActivity))).toISOString();
    return { ...draft, id: io.uuid(), conversationId: thread.id, senderId, timestamp, delivery: 'local' };
  }

  function send(id: string, senderId: string, draft: Extract<DraftMessage, { type: 'text' | 'system' }>) {
    return serialize(async () => {
      const thread = lookup(id);
      const content = draft.type === 'text' ? { ...draft, text: draft.text.trim() }
        : draft.event === 'propose' ? {
          ...draft, arrangement: { ...draft.arrangement, time: normalizeTime(draft.arrangement.time) ?? draft.arrangement.time },
        } : draft;
      await replace(appendMessage(thread, build(thread, senderId, content)));
    });
  }

  function attach(id: string, senderId: string, type: 'image' | 'payment', asset: ImagePickerAsset) {
    return serialize(async () => {
      const thread = lookup(id);
      const attachment = `${io.uuid()}.${photoExtension(asset)}`;
      const next = appendMessage(thread, build(thread, senderId, { type, attachment }));
      const attachments = new Map(snapshot.attachments);
      let uri: string | undefined;
      try {
        try {
          uri = await io.copy(attachment, asset);
        } catch {
          throw new Error('The photo could not be saved on this device. Try choosing it again.');
        }
        attachments.set(attachment, uri);
        await replace(next, attachments);
      } catch (error) {
        await io.remove(attachment, uri).catch(() => {});
        throw error;
      }
    });
  }

  function markRead(id: string, senderId: string) {
    return serialize(async () => {
      const thread = lookup(id);
      const role = roleFor(thread, senderId);
      if (thread.unread[role]) await replace({ ...thread, unread: { ...thread.unread, [role]: false } });
    });
  }

  return {
    load, open, send, attach, markRead,
    getSnapshot: () => snapshot,
    getInitialSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
