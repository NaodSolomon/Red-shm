import { demoSeller, photoNamePattern } from './listings';
import { applyFulfillment, canComplete, type FulfillmentEvent, type Proposal } from './fulfillment';
import type { Product } from '@/types/marketplace';

export const demoBuyer = { id: 'local-demo-buyer', name: 'Red-shm Demo Buyer' };
export const deliveryMethods = ['Buyer pickup', 'Seller-arranged delivery'] as const;
export type Method = typeof deliveryMethods[number];
export type Role = 'buyer' | 'seller';
export type Status = 'Inquiry' | 'Payment Claimed' | 'Seller Confirmed Receipt'
  | 'Fulfillment Arranged' | 'Completed' | 'Cancelled';

export interface Arrangement {
  method: Method;
  day: string;
  time: string;
  area: string;
  instructions: string;
}

type MessageContent =
  | { type: 'text'; text: string; example?: boolean }
  | { type: 'image'; attachment: string }
  | { type: 'payment'; attachment: string }
  | { type: 'system'; event: 'confirm' | 'complete' | 'cancel' }
  | { type: 'system'; event: 'arrange'; arrangement: Arrangement }
  | FulfillmentEvent;

export type Message = MessageContent & {
  id: string; conversationId: string; senderId: string; timestamp: string; delivery: 'local';
};

export interface Conversation {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  methods: Method[];
  createdAt: string;
  lastActivity: string;
  status: Status;
  payment: 'No claim' | 'Payment Claimed' | 'Seller Confirmed Receipt';
  arrangement?: Arrangement;
  legacyArrangement?: Arrangement;
  fulfillment?: Proposal;
  messages: Message[];
  unread: Record<Role, boolean>;
}

export type DraftMessage = Exclude<MessageContent, { type: 'text' } | { event: 'arrange' }> | { type: 'text'; text: string };

export function roleFor(conversation: Conversation, senderId: string): Role {
  if (senderId === conversation.buyerId) return 'buyer';
  if (senderId === conversation.sellerId) return 'seller';
  throw new Error('This participant does not belong to the conversation.');
}

export function defaultRole(conversation: Conversation): Role {
  return conversation.sellerId === demoSeller.id ? 'seller' : 'buyer';
}

export function conversationId(product: Pick<Product, 'id' | 'seller'>) {
  return `chat-${demoBuyer.id}-${product.seller.id}-${product.id}`;
}

export function createConversation(product: Product, now: string): Conversation {
  const methods = deliveryMethods.filter((method) =>
    !product.fulfillment || product.fulfillment === 'Both' || product.fulfillment === method);
  return {
    id: conversationId(product), productId: product.id, sellerId: product.seller.id, buyerId: demoBuyer.id,
    methods, createdAt: now, lastActivity: now, status: 'Inquiry', payment: 'No claim',
    messages: [], unread: { buyer: false, seller: false },
  };
}

export function canCoordinate(conversation: Conversation) {
  return conversation.status !== 'Completed' && conversation.status !== 'Cancelled';
}

export function arrangementError(arrangement: Arrangement, methods: Method[]) {
  if (!methods.includes(arrangement.method)) return 'Choose a supported pickup or delivery method.';
  const timestamp = Date.parse(`${arrangement.day}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(arrangement.day) || !Number.isFinite(timestamp)
    || new Date(timestamp).toISOString().slice(0, 10) !== arrangement.day) return 'Enter a valid day as YYYY-MM-DD.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(arrangement.time)) return 'Enter a valid time as HH:MM.';
  if (!arrangement.area.trim() || arrangement.area.trim().length > 100) return 'Enter a general meeting area.';
  if (arrangement.instructions.length > 400) return 'Use up to 400 characters for instructions.';
}

export function appendMessage(conversation: Conversation, message: Message, replay = false): Conversation {
  const role = roleFor(conversation, message.senderId);
  const next = { ...conversation };
  if (message.type === 'text' && (!message.text.trim() || message.text.length > 2000)) {
    throw new Error('Enter a message of up to 2,000 characters.');
  }
  if ((message.type === 'image' || message.type === 'payment') && !photoNamePattern.test(message.attachment)) {
    throw new Error('The attachment reference is invalid.');
  }
  if (message.type === 'payment' || message.type === 'system') {
    if (!canCoordinate(conversation)) throw new Error('This transaction is closed.');
    if (message.type === 'payment') {
      if (role !== 'buyer' || next.payment === 'Seller Confirmed Receipt') {
        throw new Error('Only the buyer can submit evidence before receipt is confirmed.');
      }
      next.payment = 'Payment Claimed';
      if (!next.arrangement) next.status = next.payment;
    } else if (message.event === 'confirm') {
      if (role !== 'seller' || next.payment !== 'Payment Claimed') {
        throw new Error('Only the seller can confirm an outstanding payment claim.');
      }
      next.payment = 'Seller Confirmed Receipt';
      if (!next.arrangement) next.status = next.payment;
    } else if (message.event === 'arrange') {
      if (!replay) throw new Error('Create a fulfillment proposal first.');
      const error = arrangementError(message.arrangement, next.methods);
      if (error) throw new Error(error);
      next.legacyArrangement = message.arrangement;
    } else if (message.event === 'complete') {
      const historical = replay && next.legacyArrangement && !next.fulfillment && next.payment !== 'Payment Claimed';
      if (role !== 'seller' || (!canComplete(next) && !historical)) {
        throw new Error('Only the seller can complete an arranged transaction after approval and with no outstanding payment claim.');
      }
      next.status = 'Completed';
    } else if (message.event === 'cancel') {
      next.status = 'Cancelled';
    } else if (message.event === 'request-delivery' || message.event === 'propose' || message.event === 'respond') {
      applyFulfillment(next, message, role);
    }
  }
  return {
    ...next, lastActivity: message.timestamp, messages: [...next.messages, message],
    unread: { [role]: false, [role === 'buyer' ? 'seller' : 'buyer']: true } as Record<Role, boolean>,
  };
}

export function describeMessage(message: Message) {
  if (message.type === 'text') return message.example ? `Example · ${message.text}` : message.text;
  if (message.type === 'image') return 'Photo';
  if (message.type === 'payment') return 'Payment screenshot · claim only';
  if (message.type === 'system') {
    switch (message.event) {
      case 'confirm': return 'Seller confirmed receipt';
      case 'complete': return 'Transaction marked complete';
      case 'cancel': return 'Transaction cancelled';
      case 'arrange': return 'Legacy arrangement · approval not recorded';
      case 'request-delivery': return 'Seller-arranged delivery requested';
      case 'propose': return message.arrangement.method === 'Buyer pickup' ? 'Pickup proposed' : 'Delivery proposed';
      case 'respond': return `Fulfillment · ${message.decision}`;
    }
  }
  return '';
}

export function seedConversations(products: Product[], now: string) {
  const examples = [
    { id: 'RSH-001', text: 'Yes, the gold trim is intact. I can share another photo if you would like.' },
    { id: 'RSH-006', text: 'Is the sky-blue kemis still available for pickup?' },
  ];
  return examples.flatMap(({ id, text }, index) => {
    const product = products.find((entry) => entry.id === id);
    if (!product) return [];
    const conversation = createConversation(product, now);
    return [appendMessage(conversation, {
      id: `example-${id}`, conversationId: conversation.id,
      senderId: index === 0 ? conversation.sellerId : conversation.buyerId,
      timestamp: now, delivery: 'local', type: 'text', text, example: true,
    })];
  });
}
