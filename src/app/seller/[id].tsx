import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/marketplace/empty-state';
import { ScreenContainer, SectionHeader } from '@/components/marketplace/primitives';
import { ProductRow, useGridColumns } from '@/components/marketplace/product-row';
import { SellerIdentity } from '@/components/marketplace/seller-preview';
import { color } from '@/constants/marketplace';
import { products, sellers } from '@/data/products';
import { gridRows } from '@/lib/discovery';

export default function SellerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const columns = useGridColumns();
  const seller = sellers.find((item) => item.id === id);
  if (!seller) return (
    <EmptyState screen="Seller profile" title="Seller unavailable" icon="profile"
      description="This seller profile could not be found." />
  );

  const listings = products.filter((product) => product.seller.id === seller.id);

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <FlatList
        data={gridRows(listings, columns)} keyExtractor={(row) => row[0].id}
        renderItem={({ item }) => <ProductRow items={item} columns={columns} />}
        style={styles.list} contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.card}>
              <SellerIdentity key={seller.id} seller={seller} />
              {seller.bio && <Text style={styles.bio}>{seller.bio}</Text>}
            </View>
            <SectionHeader title="Listings" />
          </View>
        }
        ListEmptyComponent={<Text style={styles.bio}>No listings yet.</Text>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  content: { padding: 20 },
  header: { gap: 18, marginBottom: 12 },
  card: { gap: 12, padding: 16, borderWidth: 1, borderColor: color.line, borderRadius: 14, backgroundColor: color.white },
  bio: { color: color.muted, fontSize: 15, lineHeight: 21 },
});
