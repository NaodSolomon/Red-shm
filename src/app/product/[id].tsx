import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/marketplace/empty-state';
import { FavoriteButton } from '@/components/marketplace/favorites';
import { PriceText, PrimaryButton, ScreenContainer, SectionHeader } from '@/components/marketplace/primitives';
import { ProductGallery } from '@/components/marketplace/product-gallery';
import { SellerPreview } from '@/components/marketplace/seller-preview';
import { color } from '@/constants/marketplace';
import { useListings } from '@/hooks/use-listings';
import type { Product } from '@/types/marketplace';

export default function ProductScreen() {
  const { id, published } = useLocalSearchParams<{ id: string; published?: string }>();
  const { products, ready, error } = useListings();
  const product = products.find((item) => item.id === id);
  if (!product && id?.startsWith('LOCAL-') && !ready) return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <View style={styles.content}><SectionHeader title={error ?? 'Loading listing…'} /></View>
    </ScreenContainer>
  );
  if (!product) return (
    <EmptyState screen="Listing" title="Listing unavailable" icon="traditional"
      description="This listing could not be found." />
  );

  return <Listing key={product.id} product={product} published={published === 'yes'} />;
}

function Listing({ product, published }: { product: Product; published: boolean }) {
  const facts = [
    { label: 'Condition', value: product.condition },
    ...(product.size ? [{ label: 'Size', value: product.size }] : []),
    { label: 'Category', value: product.subcategory ?? product.category },
    { label: 'Location', value: product.location },
    ...(product.fulfillment ? [{ label: 'Fulfillment', value: product.fulfillment }] : []),
  ];

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {published && product.local && <Text accessibilityLiveRegion="polite" style={styles.badge}>Listing published on this device.</Text>}
        <ProductGallery product={product} />
        <View style={styles.overview}>
          <View style={styles.info}>
            <SectionHeader title={product.title} />
            <PriceText amount={product.price} />
          </View>
          <FavoriteButton product={product} />
        </View>
        <View style={styles.badges}>
          <Text style={[styles.badge, product.status !== 'Active' && styles.unavailable]}>{product.status}</Text>
          {product.sponsored && <Text style={styles.badge}>Sponsored</Text>}
          {product.local && <Text style={styles.badge}>Local demo</Text>}
        </View>
        <View style={styles.section}>
          <SectionHeader title="About this listing" />
          <Text style={styles.description}>{product.description}</Text>
          <View style={styles.facts}>
            {facts.map(({ label, value }) => (
              <View key={label} style={styles.fact}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <SectionHeader title="Meet the seller" />
          <SellerPreview seller={product.seller} />
        </View>
        {product.local ? (
          <PrimaryButton label="My Listings" onPress={() => router.push('/my-listings')} />
        ) : product.status === 'Active' && (
          <PrimaryButton label="Chat with seller" onPress={() => router.dismissTo('/inbox')} />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 550, alignSelf: 'center', padding: 20, paddingBottom: 28, gap: 17 },
  overview: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  info: { flex: 1, gap: 7 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  badge: { borderRadius: 7, paddingVertical: 4, paddingHorizontal: 9, backgroundColor: color.sand, color: color.ink, fontWeight: '700' },
  unavailable: { backgroundColor: color.rose, color: color.red },
  section: { gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: color.line },
  description: { color: color.ink, fontSize: 16, lineHeight: 23 },
  facts: { gap: 8, paddingVertical: 4 },
  fact: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 2 },
  label: { minWidth: 79, color: color.muted, fontSize: 14 },
  value: { flexShrink: 1, color: color.ink, fontSize: 14, fontWeight: '600' },
});
