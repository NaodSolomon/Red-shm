import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import type { ColorValue } from 'react-native';

import { color } from '@/constants/marketplace';

const symbols = {
  home: { ios: 'house', android: 'home', web: 'home' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  sell: { ios: 'plus.app', android: 'add_box', web: 'add_box' },
  inbox: { ios: 'bubble.left', android: 'chat_bubble_outline', web: 'chat_bubble_outline' },
  profile: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  pin: { ios: 'mappin', android: 'location_on', web: 'location_on' },
  traditional: { ios: 'tshirt', android: 'checkroom', web: 'checkroom' },
  accessories: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  everyday: { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' },
  goods: { ios: 'lamp.desk', android: 'chair', web: 'chair' },
  arrow: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
} satisfies Record<string, SymbolViewProps['name']>;

export type IconName = keyof typeof symbols;

export function Icon({ name, size = 22, tint = color.ink }: {
  name: IconName;
  size?: number;
  tint?: ColorValue;
}) {
  return <SymbolView name={symbols[name]} size={size} tintColor={tint} accessible={false} />;
}
