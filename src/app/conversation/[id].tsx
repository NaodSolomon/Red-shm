import { Link, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { TransactionDialog } from '@/components/marketplace/chat-transaction';
import { ChatDialog, ChatThumbnail, StatusBadge, chatTime, participant } from '@/components/marketplace/conversation-ui';
import { FulfillmentCard, FulfillmentDetails } from '@/components/marketplace/fulfillment-card';
import { Choices, FormAction } from '@/components/marketplace/listing-form';
import { PriceText, PrimaryButton, ScreenContainer, SectionHeader } from '@/components/marketplace/primitives';
import { color } from '@/constants/marketplace';
import { useConversations } from '@/hooks/use-conversations';
import { useListings } from '@/hooks/use-listings';
import { defaultRole, describeMessage, type Conversation, type DraftMessage, type Message, type Role } from '@/lib/conversations';
import { photoExtension } from '@/lib/listing-photo';
import type { Product } from '@/types/marketplace';

type ChatState = ReturnType<typeof useConversations>;
type Dialog = { kind: 'transaction'; schedule?: boolean } | { kind: 'payment' }
  | { kind: 'preview'; asset: ImagePicker.ImagePickerAsset; type: 'image' | 'payment' }
  | { kind: 'enlarged'; uri: string; title: string };
const roles = ['Buyer', 'Seller'] as const;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chat = useConversations();
  const { products } = useListings();
  const thread = chat.conversations.find((entry) => entry.id === id);
  if (thread) return <Thread key={thread.id} chat={chat} thread={thread}
    product={products.find((entry) => entry.id === thread.productId)} />;
  return <ScreenContainer edges={['left', 'right', 'bottom']}>
    <View style={styles.empty}>
      <SectionHeader title={chat.error ?? (chat.ready ? 'Conversation unavailable' : 'Loading conversation…')} />
      {chat.error ? <FormAction label="Try again" onPress={chat.load} /> : null}
      <FormAction label="Back to Inbox" onPress={() => router.dismissTo('/inbox')} />
    </View>
  </ScreenContainer>;
}

function Thread({ chat, thread, product }: { chat: ChatState; thread: Conversation; product?: Product }) {
  const [role, setRole] = useState<Role>(() => defaultRole(thread));
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialog>();
  const [error, setError] = useState('');
  const locked = useRef(false);
  const list = useRef<FlatList<Message>>(null);
  const wasNearEnd = useRef(true);
  const senderId = role === 'buyer' ? thread.buyerId : thread.sellerId;
  const other = participant(role === 'buyer' ? thread.sellerId : thread.buyerId);
  const { markRead } = chat;
  const unread = thread.unread[role];

  useFocusEffect(useCallback(() => {
    if (unread) void markRead(thread.id, senderId).catch(() => { /* Remains unread when it cannot be saved. */ });
  }, [markRead, senderId, thread.id, unread]));

  async function run(action: () => Promise<void>) {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
      return true;
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'This change could not be saved.');
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  function send(draft: Extract<DraftMessage, { type: 'text' | 'system' }>) {
    return run(async () => {
      await chat.send(thread.id, senderId, draft);
      list.current?.scrollToEnd({ animated: false });
    });
  }

  function pick(type: 'image' | 'payment') {
    void run(async () => {
      if (Platform.OS !== 'web') Keyboard.dismiss();
      let result: ImagePicker.ImagePickerResult;
      try {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'], quality: 1,
          preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        });
      } catch {
        throw new Error('Could not open your photos. Check photo access and try again.');
      }
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) throw new Error('The library did not return a photo. Choose it again.');
      photoExtension(asset);
      setDialog({ kind: 'preview', asset, type });
    });
  }

  function show(next?: Dialog) {
    setError('');
    setDialog(next);
  }

  const preview = <>
    <ChatThumbnail source={product?.images[0]} />
    <View style={styles.grow}>
      <Text style={styles.name} numberOfLines={2}>{product?.title ?? 'Listing unavailable'}</Text>
      <Text style={styles.muted}>{product?.status ?? 'This listing is no longer available.'}</Text>
    </View>
    {product ? <PriceText amount={product.price} /> : null}
  </>;

  return <ScreenContainer edges={['left', 'right', 'bottom']}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <FlatList ref={list} data={thread.messages} keyExtractor={(message) => message.id}
        keyboardShouldPersistTaps="handled" style={styles.list} contentContainerStyle={styles.history}
        onContentSizeChange={() => { if (wasNearEnd.current) list.current?.scrollToEnd({ animated: false }); }}
        scrollEventThrottle={50} onScroll={({ nativeEvent }) => {
          wasNearEnd.current = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y < 120;
        }}
        ListHeaderComponent={<View style={styles.header}>
          <View style={styles.identity}>
            <ChatThumbnail key={other.id} avatar source={other.avatar} />
            <View style={styles.grow}>
              <Text accessibilityRole="header" style={styles.name}>{other.name}</Text>
              <Text style={styles.muted}>Demo mode — simulated conversation</Text>
            </View>
            <StatusBadge status={thread.status} />
          </View>
          {product ? <Link href={{ pathname: '/product/[id]', params: { id: product.id } }} asChild>
            <Pressable style={styles.product}>{preview}</Pressable>
          </Link> : <View style={styles.product}>{preview}</View>}
          <Choices label="Demo perspective" options={roles} value={role === 'buyer' ? 'Buyer' : 'Seller'}
            onChange={(next) => { if (!locked.current) setRole(next === 'Buyer' ? 'buyer' : 'seller'); }} />
          <FormAction label="Transaction summary" disabled={busy} onPress={() => show({ kind: 'transaction' })} />
          {thread.arrangement ? <View style={styles.product}>
            <View style={styles.grow}>
              <Text style={styles.name}>Accepted · {thread.arrangement.method}</Text>
              <FulfillmentDetails arrangement={thread.arrangement} />
            </View>
          </View> : null}
        </View>}
        ListEmptyComponent={<Text style={styles.emptyText}>Start with a question about the item or its availability.</Text>}
        renderItem={({ item, index }) => {
          const outgoing = item.senderId === senderId;
          const timestamp = new Date(item.timestamp);
          const previous = thread.messages[index - 1];
          const divider = !previous || new Date(previous.timestamp).toDateString() !== timestamp.toDateString();
          const uri = item.type === 'image' || item.type === 'payment' ? chat.attachments.get(item.attachment) : undefined;
          const fulfillment = item.type === 'system' && (item.event === 'arrange' || item.event === 'request-delivery'
            || item.event === 'propose' || item.event === 'respond') ? item : undefined;
          return <View>
            {divider ? <Text style={styles.day}>{timestamp.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</Text> : null}
            {fulfillment ? <View style={styles.fulfillment}>
              <FulfillmentCard message={fulfillment} thread={thread} role={role} busy={busy}
                send={(event) => { void send(event); }} schedule={() => show({ kind: 'transaction', schedule: true })} />
              <Text style={styles.timestamp}>{chatTime(item.timestamp)}</Text>
            </View> : <View style={[styles.bubble, outgoing && styles.outgoing, item.type === 'system' && styles.event]}>
              {item.type === 'image' || item.type === 'payment' ? <>
                <Text style={styles.name}>{describeMessage(item)}</Text>
                {uri ? <Pressable accessibilityRole="button" accessibilityLabel="Enlarge attachment"
                  onPress={() => show({ kind: 'enlarged', uri, title: describeMessage(item) })}>
                  <ChatImage key={uri} uri={uri} />
                </Pressable> : <Text style={styles.muted}>Attachment unavailable</Text>}
                {item.type === 'payment' ? <Text style={styles.muted}>A screenshot does not verify payment.</Text> : null}
              </> : <Text style={styles.message}>{describeMessage(item)}</Text>}
              <Text style={styles.timestamp}>{chatTime(item.timestamp)}</Text>
            </View>}
          </View>;
        }}
      />
      {!dialog && error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <View style={styles.composer}>
        <FormAction label="Photo" accessibilityLabel="Attach photo" disabled={busy} onPress={() => pick('image')} />
        <TextInput accessibilityLabel="Message" placeholder="Write a message" placeholderTextColor={color.muted}
          value={text} onChangeText={setText} multiline maxLength={2000} editable={!busy} style={styles.input} />
        <PrimaryButton label="Send" disabled={busy || !text.trim()}
          onPress={async () => { if (await send({ type: 'text', text })) setText(''); }} />
      </View>
    </KeyboardAvoidingView>
    {dialog?.kind === 'transaction' ? <TransactionDialog thread={thread} product={product} role={role} busy={busy}
      error={error} startScheduling={dialog.schedule} onClose={() => show()} send={send}
      choosePayment={() => show({ kind: 'payment' })} /> : null}
    {dialog?.kind === 'payment' ? <ChatDialog title="Submit payment screenshot" busy={busy} onClose={() => show({ kind: 'transaction' })}>
      <Text style={styles.message}>Payment happens outside Red-shm. A screenshot records your claim and does not verify payment. This demo stores the image on this device and provides no escrow or payment protection.</Text>
      <Text style={styles.muted}>Use a demo screenshot with private account details removed.</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Choose screenshot" disabled={busy} onPress={() => pick('payment')} />
    </ChatDialog> : null}
    {dialog?.kind === 'preview' ? <ChatDialog title={dialog.type === 'payment' ? 'Review payment screenshot' : 'Review photo'}
      busy={busy} onClose={() => show()}>
      <ChatImage key={dialog.asset.uri} uri={dialog.asset.uri} large />
      {dialog.type === 'payment' ? <Text style={styles.muted}>Submitting this screenshot records a payment claim only.</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <PrimaryButton label={dialog.type === 'payment' ? 'Submit screenshot' : 'Send photo'} disabled={busy}
        onPress={async () => {
          if (await run(() => chat.attach(thread.id, senderId, dialog.type, dialog.asset))) {
            show();
            list.current?.scrollToEnd({ animated: false });
          }
        }} />
      <FormAction label="Cancel" disabled={busy} onPress={() => show()} />
    </ChatDialog> : null}
    {dialog?.kind === 'enlarged' ? <ChatDialog title={dialog.title} onClose={() => show()}>
      <ChatImage key={dialog.uri} uri={dialog.uri} large />
    </ChatDialog> : null}
  </ScreenContainer>;
}

function ChatImage({ uri, large }: { uri: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Text style={styles.muted}>Attachment unavailable</Text>;
  return <Image accessibilityLabel="Conversation attachment" source={{ uri }} resizeMode={large ? 'contain' : 'cover'}
    style={[styles.attachment, large && styles.large]} onError={() => setFailed(true)} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: 720 },
  list: { flex: 1 },
  history: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  header: { gap: 10, marginBottom: 12 },
  identity: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  grow: { flex: 1, minWidth: 100, gap: 3 },
  name: { fontWeight: '700', fontSize: 15, color: color.ink },
  muted: { color: color.muted, fontSize: 13, lineHeight: 19 },
  product: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9, padding: 9,
    borderRadius: 12, backgroundColor: color.white, borderWidth: 1, borderColor: color.line },
  empty: { padding: 20, gap: 14 },
  emptyText: { color: color.muted, paddingVertical: 15, textAlign: 'center' },
  day: { alignSelf: 'center', color: color.muted, fontSize: 12, paddingVertical: 8 },
  bubble: { maxWidth: '86%', minWidth: 76, alignSelf: 'flex-start', borderRadius: 13, padding: 9, gap: 4,
    marginBottom: 7, backgroundColor: color.white, borderWidth: 1, borderColor: color.line },
  outgoing: { alignSelf: 'flex-end', backgroundColor: color.rose },
  event: { alignSelf: 'center', backgroundColor: color.sand },
  fulfillment: { gap: 4, marginBottom: 10 },
  message: { fontSize: 15, lineHeight: 21, color: color.ink },
  timestamp: { fontSize: 11, color: color.muted, alignSelf: 'flex-end' },
  attachment: { width: 160, maxWidth: '100%', height: 120, borderRadius: 8, backgroundColor: color.sand },
  large: { width: '100%', height: 290 },
  composer: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 6, borderTopWidth: 1,
    borderColor: color.line, backgroundColor: color.paper },
  input: { flex: 1, minHeight: 46, maxHeight: 108, minWidth: 0, paddingHorizontal: 9, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1, borderColor: color.line, backgroundColor: color.white, fontSize: 16, color: color.ink },
  error: { color: color.red, padding: 6 },
});
