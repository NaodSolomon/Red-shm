import { Link } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color } from '@/constants/marketplace';
import type { Product } from '@/types/marketplace';
import { FavoriteButton } from './favorites';
import { PriceText } from './primitives';
import { ProductMedia } from './product-media';

export const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  return (
    <View style={styles.card}>
      <Link href={{ pathname: '/product/[id]', params: { id: product.id } }} asChild>
        <Pressable style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
          <ProductMedia product={product} />
          <View style={styles.details}>
            <View style={styles.badges}>
              {product.sponsored && <Text style={styles.sponsored}>Sponsored</Text>}
              {product.local && <Text style={styles.sponsored}>Local demo</Text>}
              {product.status !== 'Active' && <Text style={styles.status}>{product.status}</Text>}
            </View>
            <Text style={styles.title}>{product.title}</Text>
            <PriceText amount={product.price} />
            <Text style={styles.meta}>{[product.size, product.condition].filter(Boolean).join(' · ')}</Text>
            <Text style={styles.meta}>{product.location}</Text>
          </View>
        </Pressable>
      </Link>
      <View style={styles.favorite} pointerEvents="box-none"><FavoriteButton product={product} /></View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: color.line, borderRadius: 16, overflow: 'hidden', backgroundColor: color.white },
  link: { flex: 1 },
  pressed: { opacity: 0.78 },
  favorite: { position: 'absolute', top: 7, right: 7 },
  details: { padding: 11, gap: 5 },
  title: { color: color.ink, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  meta: { color: color.muted, fontSize: 12, lineHeight: 16 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  sponsored: { backgroundColor: color.sand, color: color.ink, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, fontSize: 11, fontWeight: '600' },
  status: { backgroundColor: color.rose, color: color.red, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, fontSize: 11, fontWeight: '700' },
});
