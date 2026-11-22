import type { Arrangement, Conversation, Message, Role } from './conversations';
import { normalizeTime, scheduleError } from './fulfillment-time';
import type { Seller } from '@/types/marketplace';

export type Decision = 'Accepted' | 'Declined' | 'Changes Requested';
export type FulfillmentEvent =
  | { type: 'system'; event: 'request-delivery' }
  | { type: 'system'; event: 'propose'; arrangement: Arrangement; replaces?: string }
  | { type: 'system'; event: 'respond'; proposalId: string; decision: Decision };

export interface Proposal {
  id: string;
  senderId: string;
  state: 'Requested' | 'Proposed' | Decision;
  arrangement?: Arrangement;
}

export function sellerArea(seller?: Pick<Seller, 'neighborhood'>) {
  return seller?.neighborhood.trim() ?? '';
}

export function hasPendingFulfillment(thread: Conversation) {
  return thread.fulfillment?.state === 'Proposed' || thread.fulfillment?.state === 'Requested';
}

export function canComplete(thread: Conversation) {
  return Boolean(thread.arrangement) && !hasPendingFulfillment(thread) && thread.payment !== 'Payment Claimed';
}

export function responseRole(arrangement: Arrangement): Role {
  return arrangement.method === 'Buyer pickup' ? 'seller' : 'buyer';
}

export function canScheduleDelivery(thread: Conversation) {
  return thread.methods.includes('Seller-arranged delivery') &&
    (thread.fulfillment?.state === 'Requested' || thread.fulfillment?.arrangement?.method === 'Seller-arranged delivery');
}

export function applyFulfillment(
  next: Conversation, message: Message & FulfillmentEvent, role: Role,
) {
  const current = next.fulfillment;
  const at = new Date(message.timestamp);
  if (message.event === 'request-delivery') {
    if (role !== 'buyer' || !next.methods.includes('Seller-arranged delivery')) throw new Error('Only the buyer can request supported seller delivery.');
    if (current?.state === 'Requested') throw new Error('A delivery request is already pending.');
    if (current?.state === 'Proposed' && current.arrangement?.method === 'Seller-arranged delivery') {
      throw new Error('Respond to the pending delivery proposal before sending another request.');
    }
    next.fulfillment = { id: message.id, senderId: message.senderId, state: 'Requested' };
    return;
  }

  if (message.event === 'propose') {
    const draft = message.arrangement;
    if (!next.methods.includes(draft.method)) throw new Error('Choose a supported pickup or delivery method.');
    if (draft.method === 'Buyer pickup') {
      if (role !== 'buyer') throw new Error('Only the buyer can propose pickup.');
    } else if (role !== 'seller' || !canScheduleDelivery(next)) {
      throw new Error('Only the seller can schedule delivery after a buyer requests it.');
    }
    if (message.replaces !== current?.id) throw new Error('This request changed. Reopen the current fulfillment details.');
    const error = scheduleError(draft.day, draft.time, at);
    if (error) throw new Error(error);
    const arrangement = {
      ...draft, time: normalizeTime(draft.time)!, area: draft.area.trim(), instructions: draft.instructions.trim(),
    };
    if (!arrangement.area || arrangement.area.length > 100) throw new Error('Enter a general meeting area.');
    if (arrangement.instructions.length > 400) throw new Error('Use up to 400 characters for instructions.');
    const previous = current?.arrangement;
    if (current?.state === 'Proposed' && previous && previous.method === arrangement.method
      && previous.day === arrangement.day && previous.time === arrangement.time
      && previous.area === arrangement.area && previous.instructions === arrangement.instructions) {
      throw new Error('That proposal is already awaiting approval.');
    }
    next.fulfillment = { id: message.id, senderId: message.senderId, state: 'Proposed', arrangement };
    return;
  }

  if (current?.id !== message.proposalId || current.state !== 'Proposed' || !current.arrangement) {
    throw new Error('This proposal is no longer awaiting a response.');
  }
  if (current.senderId === message.senderId || role !== responseRole(current.arrangement)) {
    throw new Error('Only the other participant can respond to this proposal.');
  }
  if (!(['Accepted', 'Declined', 'Changes Requested'] as Decision[]).includes(message.decision)) {
    throw new Error('This proposal response is invalid.');
  }
  if (message.decision === 'Accepted') {
    const error = scheduleError(current.arrangement.day, current.arrangement.time, at);
    if (error) throw new Error('This proposal has passed. Request a new date or time.');
    next.arrangement = { ...current.arrangement };
    next.status = 'Fulfillment Arranged';
  }
  next.fulfillment = { ...current, state: message.decision };
}
