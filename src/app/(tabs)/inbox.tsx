import { Link, router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChatThumbnail, StatusBadge, chatTime, participant } from '@/components/marketplace/conversation-ui';
import { Choices, FormAction } from '@/components/marketplace/listing-form';
import { ScreenContainer, SectionHeader } from '@/components/marketplace/primitives';
import { color } from '@/constants/marketplace';
import { useConversations } from '@/hooks/use-conversations';
import { useListings } from '@/hooks/use-listings';
import { defaultRole, describeMessage } from '@/lib/conversations';

const filters = ['All', 'Buying', 'Selling'] as const;

export default function InboxScreen() {
  const [filter, setFilter] = useState<typeof filters[number]>('All');
  const { conversations, ready, error, load } = useConversations();
  const { products } = useListings();
  const rows = conversations
    .filter((thread) => filter === 'All' || defaultRole(thread) === (filter === 'Buying' ? 'buyer' : 'seller'))
    .sort((left, right) => Date.parse(right.lastActivity) - Date.parse(left.lastActivity));

  return (
    <ScreenContainer>
      <FlatList data={rows} keyExtractor={(thread) => thread.id} style={styles.list} contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.header}>
          <SectionHeader title="Inbox" subtitle="Demo mode — simulated conversation" />
          <Choices options={filters} value={filter} onChange={setFilter} />
        </View>}
        ListEmptyComponent={<View style={styles.empty}>
          <SectionHeader title={error ?? (!ready ? 'Loading conversations…' : 'No conversations yet')}
            subtitle={ready ? filter === 'Selling' ? 'Open one of your listings to start a demo selling chat.'
              : 'Find something you love and start chatting with a seller.' : undefined} />
          {error ? <FormAction label="Try again" onPress={load} /> : ready
            ? <FormAction label={filter === 'Selling' ? 'My Listings' : 'Browse listings'}
              onPress={() => router.navigate(filter === 'Selling' ? '/my-listings' : '/')} /> : null}
        </View>}
        renderItem={({ item: thread }) => {
          const role = defaultRole(thread);
          const unread = thread.unread[role];
          const person = participant(role === 'buyer' ? thread.sellerId : thread.buyerId);
          const product = products.find((entry) => entry.id === thread.productId);
          const last = thread.messages.at(-1);
          return <Link href={{ pathname: '/conversation/[id]', params: { id: thread.id } }} asChild>
            <Pressable accessibilityLabel={`${person.name}, ${product?.title ?? 'Listing unavailable'}${unread ? ', unread' : ''}`}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              <ChatThumbnail avatar source={person.avatar} />
              <View style={styles.info}>
                <View style={styles.meta}>
                  <Text numberOfLines={1} style={styles.name}>{person.name}</Text>
                  <Text style={styles.time}>{chatTime(thread.lastActivity)}</Text>
                </View>
                <Text numberOfLines={1} style={styles.title}>{product?.title ?? 'Listing unavailable'}</Text>
                <Text numberOfLines={1} style={[styles.preview, unread && styles.unread]}>
                  {unread ? 'Unread · ' : ''}{last ? describeMessage(last) : 'Conversation started'}
                </Text>
                <StatusBadge status={thread.status} />
              </View>
              <ChatThumbnail source={product?.images[0]} />
            </Pressable>
          </Link>;
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  content: { padding: 20, paddingBottom: 28 },
  header: { gap: 12, marginBottom: 15 },
  empty: { paddingVertical: 24, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, marginBottom: 9,
    borderRadius: 13, borderColor: color.line, borderWidth: 1, backgroundColor: color.white },
  pressed: { backgroundColor: color.rose },
  info: { flex: 1, minWidth: 0, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  name: { flexShrink: 1, color: color.ink, fontWeight: '700', fontSize: 15 },
  title: { color: color.ink, fontSize: 13 },
  time: { color: color.muted, fontSize: 11 },
  preview: { color: color.muted, fontSize: 13 },
  unread: { fontWeight: '700', color: color.red },
});
