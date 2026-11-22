import { StyleSheet, Text, View } from 'react-native';

import { color } from '@/constants/marketplace';
import { canCoordinate, type Arrangement, type Conversation, type Message, type Role } from '@/lib/conversations';
import { responseRole, type Decision, type FulfillmentEvent } from '@/lib/fulfillment';
import { friendlyDay, friendlyTime } from '@/lib/fulfillment-time';
import { participant } from './conversation-ui';
import { FormAction } from './listing-form';

export function FulfillmentDetails({ arrangement }: { arrangement: Arrangement }) {
  return <View style={styles.details}>
    <Text style={styles.body}>{friendlyDay(arrangement.day)} · {friendlyTime(arrangement.time)} Addis Ababa time</Text>
    <Text style={styles.body}>{arrangement.method === 'Buyer pickup' ? 'Meeting area' : 'Delivery area'} · {arrangement.area}</Text>
    {arrangement.instructions ? <Text style={styles.body}>{arrangement.instructions}</Text> : null}
  </View>;
}

export function FulfillmentCard({ message, thread, role, busy, send, schedule }: {
  message: Message & (FulfillmentEvent | { type: 'system'; event: 'arrange'; arrangement: Arrangement });
  thread: Conversation; role: Role; busy: boolean;
  send: (event: FulfillmentEvent) => void; schedule: () => void;
}) {
  if (message.event === 'arrange') return <View style={styles.card}>
    <Text style={styles.title}>Legacy {message.arrangement.method.toLowerCase()}</Text>
    <FulfillmentDetails arrangement={message.arrangement} />
    <Text style={styles.state}>Approval was not recorded</Text>
  </View>;

  if (message.event === 'respond') {
    const title = { Accepted: 'Arrangement accepted', Declined: 'Proposal declined', 'Changes Requested': 'Changes requested' };
    return <View style={styles.card}>
      <Text style={styles.title}>{title[message.decision]}</Text>
      <Text style={styles.body}>{participant(message.senderId).name}</Text>
    </View>;
  }

  const current = thread.fulfillment?.id === message.id ? thread.fulfillment : undefined;
  const active = canCoordinate(thread);
  const person = participant(message.senderId);
  if (message.event === 'request-delivery') return <View style={styles.card}>
    <Text style={styles.title}>Seller-arranged delivery requested</Text>
    <Text style={styles.body}>Requested by {person.name}</Text>
    <Text style={styles.state}>{current && active ? 'Awaiting seller proposal' : current ? 'Closed' : 'Request updated'}</Text>
    {role === 'seller' && active && current ? <FormAction label="Propose delivery details" onPress={schedule} disabled={busy} /> : null}
  </View>;

  const authorized = responseRole(message.arrangement);
  const response = thread.messages.find((entry) => entry.type === 'system' && entry.event === 'respond' && entry.proposalId === message.id);
  const decision = response?.type === 'system' && response.event === 'respond' ? response.decision : undefined;
  const pending = current?.state === 'Proposed' && active;
  const status = decision ?? (pending ? `Awaiting ${authorized} approval` : current ? 'Closed' : 'Superseded');

  function reply(decision: Decision) {
    send({ type: 'system', event: 'respond', proposalId: message.id, decision });
  }

  return <View style={styles.card}>
    <Text style={styles.title}>{message.arrangement.method === 'Buyer pickup' ? 'Pickup proposal' : 'Delivery proposal'}</Text>
    <Text style={styles.body}>Proposed by {person.name}</Text>
    <FulfillmentDetails arrangement={message.arrangement} />
    <Text style={[styles.state, decision === 'Accepted' && styles.accepted]}>{status}</Text>
    {pending && role === authorized ? <View style={styles.actions}>
      <FormAction label="Accept arrangement" disabled={busy} onPress={() => reply('Accepted')} />
      <FormAction label="Decline" disabled={busy} onPress={() => reply('Declined')} />
      <FormAction label="Request changes" disabled={busy} onPress={() => reply('Changes Requested')} />
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { gap: 6, borderWidth: 1, borderColor: color.line, borderRadius: 12, padding: 11, backgroundColor: color.white },
  details: { gap: 3 },
  title: { color: color.ink, fontWeight: '700', fontSize: 15 },
  body: { color: color.muted, fontSize: 14, lineHeight: 20 },
  state: { color: color.red, backgroundColor: color.rose, alignSelf: 'flex-start', padding: 5, borderRadius: 6, fontWeight: '700' },
  accepted: { color: '#24523E', backgroundColor: '#E2EBE1' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 },
});
