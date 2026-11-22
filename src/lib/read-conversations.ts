import { appendMessage, deliveryMethods, demoBuyer, type Arrangement, type Conversation, type Message } from './conversations';

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function date(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isArrangement(value: unknown): value is Arrangement {
  return object(value) && ['method', 'day', 'time', 'area', 'instructions'].every((key) => typeof value[key] === 'string');
}

function isMessage(value: unknown, id: string): value is Message {
  if (!object(value) || typeof value.id !== 'string' || !value.id || value.conversationId !== id
    || typeof value.senderId !== 'string' || !date(value.timestamp) || value.delivery !== 'local') return false;

  if (value.type === 'text') return typeof value.text === 'string'
    && (value.example === undefined || typeof value.example === 'boolean');
  if (value.type === 'image' || value.type === 'payment') return typeof value.attachment === 'string';
  if (value.type !== 'system') return false;
  if (value.event === 'arrange') return isArrangement(value.arrangement);
  if (value.event === 'propose') return isArrangement(value.arrangement)
    && (value.replaces === undefined || typeof value.replaces === 'string');
  if (value.event === 'respond') return typeof value.proposalId === 'string'
    && ['Accepted', 'Declined', 'Changes Requested'].some((decision) => decision === value.decision);
  return ['confirm', 'complete', 'cancel', 'request-delivery'].some((event) => event === value.event);
}

export function readConversations(raw: string): Conversation[] {
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('Saved conversations are unreadable.');
  const ids = new Set<string>();

  return data.flatMap((entry: unknown) => {
    if (!object(entry) || typeof entry.id !== 'string' || ids.has(entry.id)
      || typeof entry.productId !== 'string' || !entry.productId || !date(entry.createdAt)
      || entry.buyerId !== demoBuyer.id || typeof entry.sellerId !== 'string' || !entry.sellerId || entry.sellerId === entry.buyerId
      || entry.id !== `chat-${entry.buyerId}-${entry.sellerId}-${entry.productId}`
      || !Array.isArray(entry.messages)) return [];

    const methods = deliveryMethods.filter((method) => Array.isArray(entry.methods) && entry.methods.includes(method));
    let conversation: Conversation = {
      id: entry.id, productId: entry.productId, buyerId: entry.buyerId, sellerId: entry.sellerId,
      createdAt: entry.createdAt, lastActivity: entry.createdAt, methods,
      status: 'Inquiry', payment: 'No claim', messages: [], unread: { buyer: false, seller: false },
    };
    const messages = new Set<string>();
    for (const message of entry.messages) {
      if (!isMessage(message, entry.id) || messages.has(message.id)
        || Date.parse(message.timestamp) < Date.parse(conversation.lastActivity)) continue;
      try {
        conversation = appendMessage(conversation, message, true);
        messages.add(message.id);
      } catch {
        // Skip invalid events while keeping the rest of the local conversation readable.
      }
    }
    if (object(entry.unread) && typeof entry.unread.buyer === 'boolean' && typeof entry.unread.seller === 'boolean') {
      conversation.unread = { buyer: entry.unread.buyer, seller: entry.unread.seller };
    }
    ids.add(entry.id);
    return [conversation];
  });
}
