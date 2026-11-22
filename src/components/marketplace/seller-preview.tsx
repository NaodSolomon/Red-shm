import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color } from '@/constants/marketplace';
import type { Seller } from '@/types/marketplace';
import { Icon } from './icon';

export function SellerIdentity({ seller }: { seller: Seller }) {
  return (
    <View style={styles.identity}>
      <View style={styles.avatar}><Icon name="profile" size={28} tint={color.red} /></View>
      <View style={styles.info}>
        <Text style={styles.name}>{seller.name || 'Marketplace seller'}</Text>
        <Text style={styles.area}>{seller.neighborhood ? `${seller.neighborhood}, Addis Ababa` : 'Area unavailable'}</Text>
      </View>
    </View>
  );
}

export function SellerPreview({ seller }: { seller: Seller }) {
  return (
    <Link href={{ pathname: '/seller/[id]', params: { id: seller.id } }} asChild>
      <Pressable accessibilityLabel={`View seller profile for ${seller.name}`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.info}><SellerIdentity seller={seller} /></View>
        <Icon name="next" size={18} tint={color.red} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 66, borderWidth: 1, borderColor: color.line, backgroundColor: color.white, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { backgroundColor: color.rose },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: color.rose },
  info: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: color.ink, fontWeight: '700', fontSize: 16 },
  area: { color: color.muted, fontSize: 14 },
});
