import { Tabs } from 'expo-router/tabs';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, typography } from '../../src/theme';

/**
 * Main navigation of the app (SPEC 15.1).
 *
 * The AI chat is intentionally not a tab: it is reachable from Treinos and
 * Evolução.
 */
export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.accent,
        headerShadowVisible: false,
        headerTitleStyle: { ...typography.heading, color: colors.text },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.backgroundElevated,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { ...typography.label, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="home-outline"
              size={22}
              color={focused ? colors.accent : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="treinos"
        options={{
          title: 'Treinos',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="barbell-outline"
              size={22}
              color={focused ? colors.accent : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="comecar"
        options={{
          title: 'Começar',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="play-circle-outline"
              size={22}
              color={focused ? colors.accent : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="evolucao"
        options={{
          title: 'Evolução',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="trending-up-outline"
              size={22}
              color={focused ? colors.accent : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="person-outline"
              size={22}
              color={focused ? colors.accent : colors.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
