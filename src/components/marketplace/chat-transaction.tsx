import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { color } from '@/constants/marketplace';
import { canCoordinate, type Arrangement, type Conversation, type DraftMessage, type Role } from '@/lib/conversations';
import type { Product } from '@/types/marketplace';
import { ChatDialog, StatusBadge, participant } from './conversation-ui';
import { Choices, FormAction } from './listing-form';
import { PriceText, PrimaryButton } from './primitives';

type SystemDraft = Extract<DraftMessage, { type: 'system' }>;

export function TransactionDialog({ thread, product, role, busy, error, onClose, send, choosePayment }: {
  thread: Conversation; product?: Product; role: Role; busy: boolean; error: string;
  onClose: () => void; send: (draft: SystemDraft) => Promise<boolean>; choosePayment: () => void;
}) {
  const [page, setPage] = useState<'summary' | SystemDraft['event']>('summary');
  const [arrangement, setArrangement] = useState<Arrangement>(() => thread.arrangement ?? {
    method: thread.methods[0] ?? 'Buyer pickup', day: '', time: '', area: '', instructions: '',
  });
  const active = canCoordinate(thread);

  async function submit(draft: SystemDraft) {
    if (await send(draft)) setPage('summary');
  }

  const questions = {
    confirm: { title: 'Confirm payment received', body: 'Only confirm after independently checking that the payment has reached your account. A screenshot is not proof of payment.', action: 'Confirm receipt' },
    complete: { title: 'Mark transaction complete?', body: 'Do this after handing over the item. Change the listing separately in My Listings if needed.', action: 'Mark complete' },
    cancel: { title: 'Cancel this transaction?', body: 'The conversation history will remain. Any payment or refund must be handled directly between you.', action: 'Cancel transaction' },
  };

  if (page !== 'summary' && page !== 'arrange') {
    const question = questions[page];
    return <ChatDialog title={question.title} onClose={() => setPage('summary')} busy={busy}>
      <Text style={styles.body}>{question.body}</Text>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <PrimaryButton label={question.action} disabled={busy} onPress={() => submit({ type: 'system', event: page })} />
      <FormAction label="Back to summary" disabled={busy} onPress={() => setPage('summary')} />
    </ChatDialog>;
  }

  if (page === 'arrange') {
    return <ChatDialog title="Arrange pickup or delivery" onClose={() => setPage('summary')} busy={busy}>
      <Choices options={thread.methods} label="Fulfillment method" value={arrangement.method}
        onChange={(method) => setArrangement({ ...arrangement, method })} />
      <Text style={styles.body}>Use Addis Ababa local time and a general public meeting area.</Text>
      {([
        ['day', 'Proposed day (YYYY-MM-DD)', 10],
        ['time', 'Proposed time (HH:MM)', 5],
        ['area', 'General meeting area', 100],
        ['instructions', 'Instructions (optional)', 400],
      ] as const).map(([field, label, maxLength]) => <View key={field} style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput value={arrangement[field]} editable={!busy} accessibilityLabel={label} maxLength={maxLength}
          multiline={field === 'instructions'} onChangeText={(value) => setArrangement({ ...arrangement, [field]: value })}
          style={styles.input} />
      </View>)}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <PrimaryButton label="Save arrangement" disabled={busy} onPress={() => submit({
        type: 'system', event: 'arrange', arrangement: { ...arrangement, area: arrangement.area.trim(), instructions: arrangement.instructions.trim() },
      })} />
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
      <Text style={styles.label}>{thread.arrangement.method}</Text>
      <Text style={styles.body}>{thread.arrangement.day} · {thread.arrangement.time} Addis Ababa time</Text>
      <Text style={styles.body}>{thread.arrangement.area}</Text>
      {thread.arrangement.instructions ? <Text style={styles.body}>{thread.arrangement.instructions}</Text> : null}
    </View> : <Text style={styles.body}>Fulfillment · No arrangement yet</Text>}
    {active && role === 'buyer' && thread.payment !== 'Seller Confirmed Receipt'
      ? <FormAction label="Submit payment screenshot" onPress={choosePayment} /> : null}
    {active && role === 'seller' && thread.payment === 'Payment Claimed'
      ? <FormAction label="Confirm payment received" onPress={() => setPage('confirm')} /> : null}
    {active && thread.methods.length > 0
      ? <FormAction label="Arrange pickup or delivery" onPress={() => setPage('arrange')} /> : null}
    {active && role === 'seller' && thread.arrangement && thread.payment !== 'Payment Claimed'
      ? <FormAction label="Mark transaction complete" onPress={() => setPage('complete')} /> : null}
    {active ? <FormAction label="Cancel transaction" onPress={() => setPage('cancel')} /> : null}
    <Text style={styles.body}>Pay the other participant directly outside Red-shm. This demo offers no escrow or payment protection. Check payments independently, avoid advance payments to unknown sellers, inspect items when possible, and meet in public. Keep PINs, passwords, and other financial credentials private.</Text>
  </ChatDialog>;
}

const styles = StyleSheet.create({
  facts: { gap: 6, borderWidth: 1, borderColor: color.line, borderRadius: 11, padding: 11 },
  field: { gap: 5 },
  label: { fontSize: 14, fontWeight: '700', color: color.ink },
  body: { color: color.muted, fontSize: 14, lineHeight: 20 },
  error: { color: color.red, lineHeight: 20 },
  input: { minHeight: 46, borderWidth: 1, borderColor: color.line, borderRadius: 9, backgroundColor: color.white, color: color.ink, fontSize: 16, padding: 10 },
});
