import { DefaultTheme, Tabs, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Icon, type IconName } from '@/components/marketplace/icon';
import { color } from '@/constants/marketplace';

const tabs = [
  { route: 'index', title: 'Home', icon: 'home' },
  { route: 'search', title: 'Search', icon: 'search' },
  { route: 'sell', title: 'Sell', icon: 'sell' },
  { route: 'inbox', title: 'Inbox', icon: 'inbox' },
  { route: 'profile', title: 'Profile', icon: 'profile' },
] satisfies { route: string; title: string; icon: IconName }[];

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors, primary: color.red, background: color.paper,
    card: color.white, text: color.ink, border: color.line,
  },
};

export default function TabLayout() {
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="dark" />
      <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.red,
        tabBarInactiveTintColor: color.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { backgroundColor: color.white, borderTopColor: color.line, elevation: 0 },
      }}>
        {tabs.map(({ route, title, icon }) => (
          <Tabs.Screen key={route} name={route} options={{
            title,
            tabBarIcon: ({ color: tint }) => <Icon name={icon} tint={tint} />,
          }} />
        ))}
      </Tabs>
    </ThemeProvider>
  );
}
