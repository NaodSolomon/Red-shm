import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/marketplace/icon';
import { CategoryChip, ScreenContainer, SectionHeader } from '@/components/marketplace/primitives';
import { categoryIcons } from '@/components/marketplace/product-media';
import { ProductRow, useGridColumns } from '@/components/marketplace/product-row';
import { color, serif } from '@/constants/marketplace';
import { useListings } from '@/hooks/use-listings';
import { gridRows, newestFirst } from '@/lib/discovery';
import { categories } from '@/lib/listings';
import type { Product, ProductCategory } from '@/types/marketplace';

function discoverySections(products: Product[]) {
  const active = products.filter((product) => product.status === 'Active');
  const organic = active.filter((product) => !product.sponsored);
  return [
    { title: 'Featured traditional wear', subtitle: 'Habesha kemis, netela and more',
      items: organic.filter((product) => product.category === 'Traditional wear').slice(0, 4) },
    { title: 'Recommended for you', items: organic.filter((product) => product.category !== 'Traditional wear').slice(0, 4) },
    { title: 'Recently listed', items: organic.filter((product) => Number.isFinite(Date.parse(product.createdAt ?? ''))).sort(newestFirst).slice(0, 6) },
    { title: 'Sponsored listing', items: active.filter((product) => product.sponsored) },
  ].filter((section) => section.items.length > 0);
}

function openSearch(category: ProductCategory | '' = '') {
  router.navigate({ pathname: '/search', params: { category, entry: String(Date.now()) } });
}

function HomeHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.masthead}>
        <Text accessibilityRole="header" style={styles.wordmark}>Red-shm</Text>
        <View style={styles.location}>
          <Icon name="pin" size={16} tint={color.red} />
          <Text style={styles.city}>Addis Ababa</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={() => openSearch()}
        style={({ pressed }) => [styles.search, pressed && styles.searchPressed]}>
        <Icon name="search" size={20} tint={color.red} />
        <Text style={styles.searchText}>Search clothes, shoes and more</Text>
        <Icon name="arrow" size={17} tint={color.red} />
      </Pressable>
      <View style={styles.categories}>
        <Text accessibilityRole="header" style={styles.categoryTitle}>Shop by category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {categories.map((category) => (
            <CategoryChip key={category} label={category} icon={categoryIcons[category]}
              onPress={() => openSearch(category)} />
          ))}
        </ScrollView>
      </View>
      <View style={styles.hero}>
        <Text accessibilityRole="header" style={styles.heroTitle}>Tradition, worn again.</Text>
        <Text style={styles.heroCopy}>Find a piece for your next celebration or an everyday favorite from across Addis.</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const columns = useGridColumns();
  const { products } = useListings();
  const feed = useMemo(() => discoverySections(products).map((section) => ({
    ...section, key: section.title, data: gridRows(section.items, columns),
  })), [columns, products]);

  return (
    <ScreenContainer>
      <SectionList sections={feed} stickySectionHeadersEnabled={false}
        style={styles.list} contentContainerStyle={styles.content} ListHeaderComponent={HomeHeader}
        keyExtractor={(row) => row[0].id}
        renderSectionHeader={({ section }) => (
          <View style={styles.section}>
            <SectionHeader title={section.title} subtitle={section.subtitle} />
          </View>
        )}
        renderItem={({ item }) => <ProductRow items={item} columns={columns} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  content: { padding: 20, paddingBottom: 28 },
  header: { gap: 16 },
  masthead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  wordmark: { color: color.red, fontFamily: serif, fontSize: 35, letterSpacing: -1.3 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  city: { color: color.muted, fontSize: 13, fontWeight: '600' },
  search: { minHeight: 50, backgroundColor: color.white, borderColor: color.line, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9 },
  searchPressed: { backgroundColor: color.rose },
  searchText: { flex: 1, fontSize: 15, color: color.muted },
  hero: { borderRadius: 18, backgroundColor: color.red, padding: 20, gap: 8 },
  heroTitle: { fontFamily: serif, color: color.white, fontSize: 33 },
  heroCopy: { color: '#FFE4D9', fontSize: 14, lineHeight: 21, maxWidth: 330 },
  categories: { gap: 7 },
  categoryTitle: { color: color.ink, fontSize: 15, fontWeight: '700' },
  chips: { gap: 8, paddingEnd: 2 },
  section: { marginTop: 18, marginBottom: 10 },
});
