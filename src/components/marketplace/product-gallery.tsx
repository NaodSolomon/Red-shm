import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { color } from '@/constants/marketplace';
import type { Product } from '@/types/marketplace';
import { Icon } from './icon';
import { ProductMedia } from './product-media';

export function ProductGallery({ product }: { product: Product }) {
  const [width, setWidth] = useState(0);
  const count = product.images.length;

  return (
    <View style={styles.gallery} onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
      {count > 1 && width > 0
        ? <GalleryPages key={width} product={product} width={width} />
        : <ProductMedia product={product} />}
    </View>
  );
}

function GalleryPages({ product, width }: { product: Product; width: number }) {
  const count = product.images.length;
  const [page, setPage] = useState(0);
  const list = useRef<FlatList>(null);

  function goTo(index: number) {
    list.current?.scrollToOffset({ offset: index * width, animated: true });
  }

  return (
    <>
      <FlatList ref={list} horizontal pagingEnabled snapToInterval={width} decelerationRate="fast"
        showsHorizontalScrollIndicator={false} data={product.images}
        keyExtractor={(_, index) => String(index)}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onScroll={({ nativeEvent }) => setPage(Math.max(0, Math.min(count - 1, Math.round(nativeEvent.contentOffset.x / width))))}
        scrollEventThrottle={32}
        renderItem={({ index }) => <View style={{ width }}><ProductMedia product={product} index={index} /></View>}
      />
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous photo" disabled={page === 0}
          onPress={() => goTo(page - 1)} style={[styles.control, page === 0 && styles.disabled]}>
          <Icon name="previous" size={18} />
        </Pressable>
        <Text style={styles.count} accessibilityLiveRegion="polite">{page + 1} of {count}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next photo" disabled={page === count - 1}
          onPress={() => goTo(page + 1)} style={[styles.control, page === count - 1 && styles.disabled]}>
          <Icon name="next" size={18} />
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  gallery: { borderRadius: 16, overflow: 'hidden', backgroundColor: color.white, borderWidth: 1, borderColor: color.line },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  control: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  count: { color: color.ink, fontSize: 13, fontWeight: '600' },
});
