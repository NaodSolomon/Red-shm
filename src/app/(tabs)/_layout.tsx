import { Tabs } from 'expo-router';

import { Icon, type IconName } from '@/components/marketplace/icon';
import { color } from '@/constants/marketplace';
import { useConversations } from '@/hooks/use-conversations';
import { defaultRole } from '@/lib/conversations';

const tabs = [
  { route: 'index', title: 'Home', icon: 'home' },
  { route: 'search', title: 'Search', icon: 'search' },
  { route: 'sell', title: 'Sell', icon: 'sell' },
  { route: 'inbox', title: 'Inbox', icon: 'inbox' },
  { route: 'profile', title: 'Profile', icon: 'profile' },
] satisfies { route: string; title: string; icon: IconName }[];

export default function TabLayout() {
  const { conversations } = useConversations();
  const unread = conversations.filter((conversation) => conversation.unread[defaultRole(conversation)]).length;
  return (
    <Tabs backBehavior="history" screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: color.red,
      tabBarInactiveTintColor: color.muted,
      tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      tabBarStyle: { backgroundColor: color.white, borderTopColor: color.line, elevation: 0 },
    }}>
      {tabs.map(({ route, title, icon }) => (
        <Tabs.Screen key={route} name={route} options={{
          title,
          tabBarBadge: route === 'inbox' && unread ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: color.red, color: color.white },
          tabBarIcon: ({ color: tint }) => <Icon name={icon} tint={tint} />,
        }} />
      ))}
    </Tabs>
  );
}
