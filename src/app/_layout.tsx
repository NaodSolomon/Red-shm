import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { FavoritesProvider } from '@/components/marketplace/favorites';
import { color } from '@/constants/marketplace';

export const unstable_settings = { initialRouteName: '(tabs)' };

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors, primary: color.red, background: color.paper,
    card: color.white, text: color.ink, border: color.line,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={theme}>
      <FavoritesProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerTintColor: color.red, headerBackButtonDisplayMode: 'minimal' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="product/[id]" options={{ title: 'Listing' }} />
          <Stack.Screen name="seller/[id]" options={{ title: 'Seller profile' }} />
          <Stack.Screen name="my-listings" options={{ title: 'My Listings' }} />
          <Stack.Screen name="edit-listing/[id]" options={{ title: 'Edit listing' }} />
          <Stack.Screen name="conversation/[id]" options={{ title: 'Conversation' }} />
        </Stack>
      </FavoritesProvider>
    </ThemeProvider>
  );
}
