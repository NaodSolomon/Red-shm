import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import type { PropsWithChildren } from 'react';

import { color } from '@/constants/marketplace';
import { sellers } from '@/data/products';
import { demoBuyer, type Status } from '@/lib/conversations';
import { demoSeller } from '@/lib/listings';
import type { Seller } from '@/types/marketplace';
import { Icon } from './icon';
import { SectionHeader } from './primitives';

export function participant(id: string): Pick<Seller, 'id' | 'name' | 'avatar'> {
  if (id === demoBuyer.id) return demoBuyer;
  if (id === demoSeller.id) return demoSeller;
  return sellers.find((seller) => seller.id === id) ?? { id, name: 'Seller unavailable' };
}

export function chatTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function StatusBadge({ status }: { status: Status }) {
  const label = status === 'Seller Confirmed Receipt' ? 'Seller confirmed receipt' : status;
  return <Text style={[styles.badge, status === 'Payment Claimed' && styles.claim]}>{label}</Text>;
}

export function ChatThumbnail({ source, avatar }: { source?: ImageSourcePropType; avatar?: boolean }) {
  const [failed, setFailed] = useState(false);
  const empty = source && typeof source === 'object' && 'uri' in source && !source.uri;
  return <View style={[styles.thumbnail, avatar && styles.avatar]}>
    {source && !failed && !empty
      ? <Image source={source} style={styles.fill} onError={() => setFailed(true)} />
      : <Icon name={avatar ? 'profile' : 'traditional'} tint={color.red} size={21} />}
  </View>;
}

export function ChatDialog({ title, onClose, busy, children }: PropsWithChildren<{
  title: string; onClose: () => void; busy?: boolean;
}>) {
  return <Modal transparent animationType="fade" onRequestClose={busy ? undefined : onClose}>
    <View style={styles.overlay}>
      <View accessibilityViewIsModal style={styles.dialog}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.dialogContent}>
          <View style={styles.dialogHeader}>
            <View style={styles.dialogTitle}><SectionHeader title={title} /></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close dialog" disabled={busy}
              onPress={onClose} style={styles.close}><Icon name="close" tint={color.red} /></Pressable>
          </View>
          {children}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  badge: { backgroundColor: color.sand, color: color.ink, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, fontWeight: '700', alignSelf: 'flex-start' },
  claim: { backgroundColor: color.rose, color: color.red },
  thumbnail: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 9, backgroundColor: color.rose },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  fill: { width: '100%', height: '100%' },
  overlay: { flex: 1, padding: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#32232099' },
  dialog: { maxHeight: '88%', width: '100%', maxWidth: 475, borderRadius: 18, backgroundColor: color.paper, overflow: 'hidden' },
  dialogContent: { padding: 18, gap: 12 },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dialogTitle: { flex: 1 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
