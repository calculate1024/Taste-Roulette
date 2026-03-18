import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/theme';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.bgCard,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textHint,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.today'),
          tabBarIcon: ({ color }) => <Ionicons name="musical-notes" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: t('tabs.journey'),
          tabBarIcon: ({ color }) => <Ionicons name="compass" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
