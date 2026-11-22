import { Image, StyleSheet, Text, View } from 'react-native';

import { color } from '@/constants/marketplace';
import type { Product, ProductCategory } from '@/types/marketplace';
import { Icon, type IconName } from './icon';
import { PriceText } from './primitives';

export const categoryIcons: Record<ProductCategory, IconName> = {
  'Traditional wear': 'traditional',
  Accessories: 'accessories',
  'Everyday fashion': 'everyday',
  'Home & tech': 'goods',
};

export function ProductCard({ product, alternate }: { product: Product; alternate?: boolean }) {
  const [photo] = product.images;

  return (
    <View style={styles.card}>
      <View style={[styles.media, alternate && styles.alternate]}>
        {photo ? (
          <Image source={photo} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.frame}>
              <View style={styles.icon}>
                <Icon name={categoryIcons[product.category]} size={32} tint={color.red} />
              </View>
            </View>
            <Text style={styles.placeholderText}>Photo unavailable</Text>
          </View>
        )}
        {product.sponsored && <Text style={styles.sponsored}>Sponsored</Text>}
      </View>
      <View style={styles.details}>
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.condition}>{[product.size, product.condition].filter(Boolean).join(' · ')}</Text>
        <PriceText amount={product.price} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: color.line, borderRadius: 16, overflow: 'hidden', backgroundColor: color.white },
  media: { minHeight: 148, backgroundColor: color.rose, justifyContent: 'center', overflow: 'hidden' },
  alternate: { backgroundColor: color.sand },
  image: { width: '100%', aspectRatio: 1.15 },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 8, paddingTop: 38, paddingBottom: 14 },
  frame: { width: 55, height: 55, transform: [{ rotate: '45deg' }], borderWidth: 1, borderColor: '#AD7480', alignItems: 'center', justifyContent: 'center' },
  icon: { transform: [{ rotate: '-45deg' }] },
  placeholderText: { color: color.muted, fontSize: 12, textAlign: 'center' },
  sponsored: { position: 'absolute', top: 8, left: 8, maxWidth: '90%', backgroundColor: color.white, color: color.ink, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 11, fontWeight: '600' },
  details: { padding: 11, gap: 5 },
  title: { color: color.ink, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  condition: { color: color.muted, fontSize: 13, lineHeight: 17 },
});
