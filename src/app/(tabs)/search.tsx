import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { DiscoveryFilters, readCategory } from '@/components/marketplace/discovery-filters';
import { Icon } from '@/components/marketplace/icon';
import { ScreenContainer, SectionHeader } from '@/components/marketplace/primitives';
import { ProductRow, useGridColumns } from '@/components/marketplace/product-row';
import { color } from '@/constants/marketplace';
import { useListings } from '@/hooks/use-listings';
import { defaultFilters, discover, gridRows, type Filters } from '@/lib/discovery';

export default function SearchScreen() {
  const { category: categoryParam, entry } = useLocalSearchParams<{ category?: string; entry?: string }>();
  return <SearchResults key={entry} categoryParam={categoryParam} />;
}

function SearchResults({ categoryParam }: { categoryParam?: string }) {
  const category = readCategory(categoryParam);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const columns = useGridColumns();
  const { products } = useListings();
  const results = useMemo(() => discover(products, query, { ...filters, category }), [query, filters, category, products]);
  const rows = useMemo(() => gridRows(results, columns), [results, columns]);
  const filterCount = [category, filters.minimum.trim() || filters.maximum.trim(), filters.condition,
    filters.location, filters.size, filters.sort !== defaultFilters.sort].filter(Boolean).length;

  function applyFilters(next: Filters) {
    setFilters(next);
    router.setParams({ category: next.category });
    setShowFilters(false);
  }

  return (
    <ScreenContainer>
      <FlatList data={rows} keyExtractor={(row) => row[0].id}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        style={styles.list} contentContainerStyle={styles.content}
        renderItem={({ item }) => <ProductRow items={item} columns={columns} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <SectionHeader title="Search marketplace" />
            <View style={styles.search}>
              <Icon name="search" size={20} tint={color.red} />
              <TextInput accessibilityLabel="Search listings" placeholder="Search for kemis, netela and more"
                placeholderTextColor={color.muted} value={query} onChangeText={setQuery}
                autoCapitalize="none" returnKeyType="search" style={styles.input} />
              {query.length > 0 && (
                <Pressable accessibilityRole="button" accessibilityLabel="Clear search"
                  onPress={() => setQuery('')} style={styles.clear}>
                  <Icon name="close" size={18} tint={color.red} />
                </Pressable>
              )}
            </View>
            <View style={styles.toolbar}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: showFilters }}
                onPress={() => setShowFilters(!showFilters)} style={styles.filterButton}>
                <Icon name="filters" size={18} tint={color.red} />
                <Text style={styles.filterText}>Filters & sort{filterCount ? ` (${filterCount})` : ''}</Text>
              </Pressable>
              {filterCount > 0 && !showFilters && (
                <Pressable accessibilityRole="button" style={styles.clear} onPress={() => applyFilters(defaultFilters)}>
                  <Text style={styles.filterText}>Reset filters</Text>
                </Pressable>
              )}
            </View>
            {showFilters && <DiscoveryFilters key={category} products={products} initial={{ ...filters, category }} onApply={applyFilters} />}
            <Text accessibilityLiveRegion="polite" style={styles.summary}>
              {results.length} {results.length === 1 ? 'listing' : 'listings'}{category ? ` · ${category}` : ''}
            </Text>
          </View>}
        ListEmptyComponent={<View style={styles.empty}>
          <SectionHeader title="No listings found" subtitle="Try different search terms or adjust your filters." />
        </View>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  content: { padding: 20, paddingBottom: 26 },
  header: { gap: 12, marginBottom: 14 },
  search: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, borderColor: color.line, borderWidth: 1, borderRadius: 14, backgroundColor: color.white },
  input: { flex: 1, minHeight: 46, fontSize: 15, color: color.ink },
  clear: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  filterButton: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, backgroundColor: color.rose },
  filterText: { fontWeight: '700', color: color.red },
  summary: { fontSize: 14, color: color.muted },
  empty: { paddingVertical: 30 },
});
