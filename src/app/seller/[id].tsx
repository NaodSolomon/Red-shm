import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/marketplace/empty-state';
import { ScreenContainer, SectionHeader } from '@/components/marketplace/primitives';
import { SellerIdentity } from '@/components/marketplace/seller-preview';
import { color } from '@/constants/marketplace';
import { products } from '@/data/products';

export default function SellerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const seller = products.find((product) => product.seller.id === id)?.seller;
  if (!seller) return (
    <EmptyState screen="Seller profile" title="Seller unavailable" icon="profile"
      description="This seller profile could not be found." />
  );

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title="Marketplace seller" />
        <View style={styles.card}><SellerIdentity seller={seller} /></View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 550, alignSelf: 'center', padding: 20, gap: 16 },
  card: { padding: 16, borderWidth: 1, borderColor: color.line, borderRadius: 14, backgroundColor: color.white },
});
