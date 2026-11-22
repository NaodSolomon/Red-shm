import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Icon } from '@/components/marketplace/icon';
import { CategoryChip, ScreenContainer, SectionHeader } from '@/components/marketplace/primitives';
import { categoryIcons, ProductCard } from '@/components/marketplace/product-card';
import { color, serif } from '@/constants/marketplace';
import { products } from '@/data/products';
import type { Product, ProductCategory } from '@/types/marketplace';

const categories = Object.keys(categoryIcons) as ProductCategory[];
const available = products.filter((product) => product.status === 'Active');
const featured = available.filter((product) => product.category === 'Traditional wear').slice(0, 4);
const recommended = available.filter((product) => product.category !== 'Traditional wear').slice(0, 4);

function ProductSection({ title, subtitle, items }: { title: string; subtitle?: string; items: Product[] }) {
  const { width, fontScale } = useWindowDimensions();
  const columns = width / fontScale < 310 ? 1 : 2;
  const rows = Array.from({ length: Math.ceil(items.length / columns) }, (_, index) =>
    items.slice(index * columns, (index + 1) * columns));

  return (
    <View style={styles.section}>
      <SectionHeader title={title} subtitle={subtitle} />
      {rows.map((row) => (
        <View key={row[0].id} style={styles.row}>
          {row.map((product, index) => <ProductCard key={product.id} product={product} alternate={index > 0} />)}
          {row.length < columns && <View style={styles.spacer} />}
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.masthead}>
          <Text accessibilityRole="header" style={styles.wordmark}>Red-shm</Text>
          <View style={styles.location}>
            <Icon name="pin" size={16} tint={color.red} />
            <Text style={styles.city}>Addis Ababa</Text>
          </View>
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.navigate('/search')}
          style={({ pressed }) => [styles.search, pressed && styles.searchPressed]}>
          <Icon name="search" size={20} tint={color.red} />
          <Text style={styles.searchText}>Search clothes, shoes and more</Text>
          <Icon name="arrow" size={17} tint={color.red} />
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>ETHIOPIAN SECONDHAND MARKETPLACE</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>Tradition, worn again.</Text>
          <Text style={styles.heroCopy}>Find a piece for your next celebration or an everyday favorite from across Addis.</Text>
        </View>

        <View style={styles.categories}>
          <Text accessibilityRole="header" style={styles.categoryTitle}>Shop by category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {categories.map((category) => (
              <CategoryChip key={category} label={category} icon={categoryIcons[category]}
                onPress={() => router.navigate({ pathname: '/search', params: { category } })} />
            ))}
          </ScrollView>
        </View>

        <ProductSection title="Featured traditional wear" subtitle="Habesha kemis, netela and more" items={featured} />
        <ProductSection title="Recommended items" items={recommended} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 32, gap: 22 },
  masthead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  wordmark: { color: color.red, fontFamily: serif, fontSize: 35, letterSpacing: -1.7 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  city: { color: color.muted, fontSize: 13, fontWeight: '600' },
  search: { minHeight: 50, backgroundColor: color.white, borderColor: color.line, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9 },
  searchPressed: { backgroundColor: color.rose },
  searchText: { flex: 1, fontSize: 15, color: color.muted },
  hero: { borderRadius: 18, backgroundColor: color.red, paddingHorizontal: 20, paddingVertical: 20, gap: 8 },
  heroLabel: { color: '#FFE4D9', fontSize: 11, letterSpacing: 1.1, fontWeight: '700' },
  heroTitle: { fontFamily: serif, color: color.white, fontSize: 33 },
  heroCopy: { color: '#FFE4D9', fontSize: 14, lineHeight: 21, maxWidth: 330 },
  categories: { gap: 9 },
  categoryTitle: { color: color.ink, fontSize: 15, fontWeight: '700' },
  chips: { gap: 8, paddingEnd: 2 },
  section: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  spacer: { flex: 1 },
});
