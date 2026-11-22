import { StyleSheet, View, useWindowDimensions } from 'react-native';

import type { Product } from '@/types/marketplace';
import { ProductCard } from './product-card';

export function useGridColumns() {
  const { width, fontScale } = useWindowDimensions();
  const availableWidth = Math.min(width, 760) / fontScale;
  if (availableWidth < 345) return 1;
  if (availableWidth >= 620) return 3;
  return 2;
}

export function ProductRow({ items, columns }: { items: Product[]; columns: number }) {
  return (
    <View style={styles.row}>
      {items.map((product) => <ProductCard key={product.id} product={product} />)}
      {Array.from({ length: columns - items.length }, (_, index) => <View key={index} style={styles.spacer} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  spacer: { flex: 1 },
});
