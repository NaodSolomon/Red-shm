import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { color } from '@/constants/marketplace';
import { sellers } from '@/data/products';
import { canCoordinate, type Arrangement, type Conversation, type DraftMessage, type Method, type Role } from '@/lib/conversations';
import { canComplete, canScheduleDelivery, sellerArea } from '@/lib/fulfillment';
import { addisNow, friendlyDay, quickDates } from '@/lib/fulfillment-time';
import type { Product } from '@/types/marketplace';
import { ChatDialog, StatusBadge, participant } from './conversation-ui';
import { FulfillmentDetails } from './fulfillment-card';
import { FulfillmentPicker } from './fulfillment-picker';
import { Choices, FormAction } from './listing-form';
import { PriceText, PrimaryButton } from './primitives';

type SystemDraft = Extract<DraftMessage, { type: 'system' }>;
type Page = 'summary' | 'schedule' | 'confirm' | 'complete' | 'cancel';

export function TransactionDialog({ thread, product, role, busy, error, startScheduling, onClose, send, choosePayment }: {
  thread: Conversation; product?: Product; role: Role; busy: boolean; error: string; startScheduling?: boolean;
  onClose: () => void; send: (draft: SystemDraft) => Promise<boolean>; choosePayment: () => void;
}) {
  function initialDraft(): Arrangement {
    const method: Method = role === 'seller' ? 'Seller-arranged delivery'
      : thread.fulfillment?.arrangement?.method ?? thread.arrangement?.method ?? thread.methods[0] ?? 'Buyer pickup';
    const previous = [thread.fulfillment?.arrangement, thread.arrangement].find((entry) => entry?.method === method);
    if (previous) return previous;
    const seller = product?.seller.id === thread.sellerId ? product.seller : sellers.find((entry) => entry.id === thread.sellerId);
    return { method, day: '', time: '', area: sellerArea(seller), instructions: '' };
  }

  const [page, setPage] = useState<Page>(startScheduling ? 'schedule' : 'summary');
  const [draft, setDraft] = useState(initialDraft);
  const [replaces, setReplaces] = useState(thread.fulfillment?.id);
  const active = canCoordinate(thread);
  const canSchedule = role === 'buyer' ? thread.methods.length > 0 : canScheduleDelivery(thread);

  async function submit(event: SystemDraft) {
    if (await send(event)) setPage('summary');
  }

  function schedule() {
    setDraft(initialDraft());
    setReplaces(thread.fulfillment?.id);
    setPage('schedule');
  }

  const questions = {
    confirm: { title: 'Confirm payment received', body: 'Only confirm after independently checking that the payment has reached your account. A screenshot is not proof of payment.', action: 'Confirm receipt' },
    complete: { title: 'Mark transaction complete?', body: 'Do this after handing over the item. Change the listing separately in My Listings if needed.', action: 'Mark complete' },
    cancel: { title: 'Cancel this transaction?', body: 'The conversation history will remain. Any payment or refund must be handled directly between you.', action: 'Cancel transaction' },
  };

  if (page !== 'summary' && page !== 'schedule') {
    const question = questions[page];
    return <ChatDialog title={question.title} onClose={() => setPage('summary')} busy={busy}>
      <Text style={styles.body}>{question.body}</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <PrimaryButton label={question.action} disabled={busy} onPress={() => submit({ type: 'system', event: page })} />
      <FormAction label="Back to summary" disabled={busy} onPress={() => setPage('summary')} />
    </ChatDialog>;
  }

  if (page === 'schedule') {
    const requestOnly = role === 'buyer' && draft.method === 'Seller-arranged delivery';
    const pendingDelivery = thread.fulfillment?.state === 'Requested'
      || (thread.fulfillment?.state === 'Proposed' && thread.fulfillment.arrangement?.method === 'Seller-arranged delivery');
    const today = addisNow().day;
    const meetingLabel = draft.method === 'Buyer pickup' ? 'General meeting area' : 'General delivery area';
    return <ChatDialog title="Arrange pickup or delivery" onClose={() => setPage('summary')} busy={busy}>
      {role === 'buyer' ? <Choices options={thread.methods} label="Fulfillment method" value={draft.method}
        onChange={(method) => setDraft((previous) => ({ ...previous, method }))} />
        : <Text style={styles.label}>Seller-arranged delivery</Text>}
      {requestOnly ? <Text style={styles.body}>
        {pendingDelivery ? 'A delivery request or proposal is already awaiting a response.'
          : 'Request delivery and let the seller propose a date, time, and handover area. You can review the details before accepting.'}
      </Text> : <>
        <Text style={styles.body}>Dates use the Gregorian calendar. Times are in Addis Ababa.</Text>
        <Text style={styles.label}>{draft.day ? friendlyDay(draft.day) : 'Proposed date'}</Text>
        <View style={styles.quick}>
          {quickDates().map(({ label, day }) => <Pressable key={label} accessibilityRole="button"
            accessibilityState={{ selected: draft.day === day, disabled: busy }}
            disabled={busy} onPress={() => setDraft((previous) => ({ ...previous, day }))}
            style={[styles.quickDate, draft.day === day && styles.selectedDate]}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.body}>{friendlyDay(day)}</Text>
          </Pressable>)}
        </View>
        <FulfillmentPicker mode="date" value={draft.day} minimumDay={today} disabled={busy}
          onChange={(day) => setDraft((previous) => ({ ...previous, day }))} />
        <FulfillmentPicker mode="time" value={draft.time} minimumDay={today} disabled={busy}
          onChange={(time) => setDraft((previous) => ({ ...previous, time }))} />
        <View style={styles.field}>
          <Text style={styles.label}>{meetingLabel}</Text>
          <TextInput accessibilityLabel={meetingLabel} value={draft.area} editable={!busy} maxLength={100}
            onChangeText={(area) => setDraft((previous) => ({ ...previous, area }))} style={styles.input} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Instructions (optional)</Text>
          <TextInput accessibilityLabel="Instructions (optional)" value={draft.instructions} editable={!busy}
            maxLength={400} multiline onChangeText={(instructions) => setDraft((previous) => ({ ...previous, instructions }))}
            style={styles.input} />
        </View>
      </>}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label={requestOnly ? 'Request seller-arranged delivery' : draft.method === 'Buyer pickup' ? 'Propose pickup' : 'Propose delivery'}
        disabled={busy || (requestOnly && pendingDelivery)}
        onPress={() => submit(requestOnly ? { type: 'system', event: 'request-delivery' }
          : { type: 'system', event: 'propose', arrangement: draft, replaces })} />
    </ChatDialog>;
  }

  return <ChatDialog title="Transaction summary" onClose={onClose}>
    <View style={styles.facts}>
      <Text style={styles.label}>{product?.title ?? 'Listing unavailable'}</Text>
      {product ? <PriceText amount={product.price} /> : null}
      <Text style={styles.body}>Buyer · {participant(thread.buyerId).name}</Text>
      <Text style={styles.body}>Seller · {participant(thread.sellerId).name}</Text>
      <Text style={styles.body}>Payment · {thread.payment === 'Seller Confirmed Receipt' ? 'Seller confirmed receipt' : thread.payment}</Text>
      <StatusBadge status={thread.status} />
    </View>
    {thread.arrangement ? <View style={styles.facts}>
      <Text style={styles.label}>Accepted · {thread.arrangement.method}</Text>
      <FulfillmentDetails arrangement={thread.arrangement} />
    </View> : <Text style={styles.body}>Fulfillment · No accepted arrangement</Text>}
    {thread.legacyArrangement ? <View style={styles.facts}>
      <Text style={styles.label}>Legacy arrangement · Approval was not recorded</Text>
      <FulfillmentDetails arrangement={thread.legacyArrangement} />
    </View> : null}
    {thread.fulfillment && thread.fulfillment.state !== 'Accepted'
      ? <Text style={styles.body}>Latest fulfillment update · {thread.fulfillment.state}</Text> : null}
    {active && role === 'buyer' && thread.payment !== 'Seller Confirmed Receipt'
      ? <FormAction label="Submit payment screenshot" onPress={choosePayment} /> : null}
    {active && role === 'seller' && thread.payment === 'Payment Claimed'
      ? <FormAction label="Confirm payment received" onPress={() => setPage('confirm')} /> : null}
    {active && canSchedule ? <FormAction label="Arrange pickup or delivery" onPress={schedule} /> : null}
    {active && role === 'seller' && canComplete(thread)
      ? <FormAction label="Mark transaction complete" onPress={() => setPage('complete')} /> : null}
    {active ? <FormAction label="Cancel transaction" onPress={() => setPage('cancel')} /> : null}
    <Text style={styles.body}>Pay the other participant directly outside Red-shm. This demo offers no escrow or payment protection. Check payments independently, avoid advance payments to unknown sellers, inspect items when possible, and meet in public. Keep PINs, passwords, and other financial credentials private.</Text>
  </ChatDialog>;
}

const styles = StyleSheet.create({
  facts: { gap: 6, borderWidth: 1, borderColor: color.line, borderRadius: 11, padding: 11 },
  quick: { gap: 5 },
  quickDate: { paddingHorizontal: 10, paddingVertical: 7, minHeight: 44, borderWidth: 1,
    borderColor: color.line, borderRadius: 9, backgroundColor: color.white },
  selectedDate: { borderColor: color.red, backgroundColor: color.rose },
  field: { gap: 5 },
  label: { fontSize: 14, fontWeight: '700', color: color.ink },
  body: { color: color.muted, fontSize: 14, lineHeight: 20 },
  error: { color: color.red, lineHeight: 20 },
  input: { minHeight: 46, borderWidth: 1, borderColor: color.line, borderRadius: 9, backgroundColor: color.white, color: color.ink, fontSize: 16, padding: 10 },
});
