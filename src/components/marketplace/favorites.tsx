import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { color } from '@/constants/marketplace';
import type { Product } from '@/types/marketplace';
import { Icon } from './icon';

const FavoritesContext = createContext<{
  ids: ReadonlySet<string>;
  toggle: (id: string) => void;
  forget: (id: string) => void;
} | null>(null);

export function FavoritesProvider({ children }: PropsWithChildren) {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());

  function toggle(id: string) {
    setIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function forget(id: string) {
    setIds((previous) => {
      if (!previous.has(id)) return previous;
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
  }

  return <FavoritesContext.Provider value={{ ids, toggle, forget }}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const favorites = useContext(FavoritesContext);
  if (!favorites) throw new Error('FavoritesProvider is required');
  return favorites;
}

export function FavoriteButton({ product }: { product: Product }) {
  const favorites = useFavorites();
  const selected = favorites.ids.has(product.id);
  return (
    <Pressable accessibilityRole="togglebutton" accessibilityState={{ checked: selected }}
      accessibilityLabel={selected ? `Remove ${product.title} from favorites` : `Favorite ${product.title}`}
      onPress={() => favorites.toggle(product.id)}
      style={({ pressed }) => [styles.button, selected && styles.selected, pressed && styles.pressed]}>
      <Icon name={selected ? 'heartFilled' : 'heart'} size={22} tint={color.red} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: color.line,
    backgroundColor: color.white, alignItems: 'center', justifyContent: 'center',
  },
  selected: { backgroundColor: color.rose, borderColor: color.red },
  pressed: { opacity: 0.8 },
});
