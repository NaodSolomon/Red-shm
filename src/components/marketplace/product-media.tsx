import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { color } from '@/constants/marketplace';
import type { Product, ProductCategory } from '@/types/marketplace';
import { Icon, type IconName } from './icon';

export const categoryIcons: Record<ProductCategory, IconName> = {
  'Traditional wear': 'traditional',
  Accessories: 'accessories',
  'Everyday fashion': 'everyday',
  'Home & tech': 'goods',
};

export function ProductMedia({ product, index = 0 }: { product: Product; index?: number }) {
  const source = product.images[index];
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showPhoto = source && !failed;
  const traditional = product.category === 'Traditional wear';

  return (
    <View style={[styles.media, traditional ? styles.traditional : styles.everyday]}>
      {showPhoto ? (
        <>
          {!loaded && <ActivityIndicator color={color.red} />}
          <Image accessibilityLabel={`${product.title}, photo ${index + 1}`} source={source}
            style={styles.image} resizeMode="cover" onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)} />
        </>
      ) : (
        <View style={styles.placeholder}>
          <View style={styles.frame}>
            <View style={styles.icon}>
              <Icon name={categoryIcons[product.category]} size={28} tint={color.red} />
            </View>
          </View>
          <Text style={styles.label}>Photo unavailable</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  media: { width: '100%', aspectRatio: 1, justifyContent: 'center', overflow: 'hidden' },
  traditional: { backgroundColor: color.rose },
  everyday: { backgroundColor: color.sand },
  image: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', gap: 12, padding: 8 },
  frame: {
    width: 44, height: 44, transform: [{ rotate: '45deg' }], borderWidth: 1,
    borderColor: '#AD7480', alignItems: 'center', justifyContent: 'center',
  },
  icon: { transform: [{ rotate: '-45deg' }] },
  label: { color: color.muted, fontSize: 12, textAlign: 'center' },
});
