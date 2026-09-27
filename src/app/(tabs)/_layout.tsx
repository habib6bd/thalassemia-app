import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

import { useUnreadCount } from "@/features/notifications/api";
import { useProfile } from "@/features/profile/api";
import { useAppStore } from "@/stores/useAppStore";

export default function TabsLayout() {
  const { t } = useTranslation();
  const session = useAppStore((state) => state.session);
  const sessionLoaded = useAppStore((state) => state.sessionLoaded);
  const profileQuery = useProfile(session?.user.id);
  const unreadCount = useUnreadCount();

  if (sessionLoaded && !session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (session && profileQuery.isSuccess && !profileQuery.data?.onboarded_at) {
    return <Redirect href="/(onboarding)" />;
  }

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.home"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: t("nav.patients"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-heart"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: t("nav.network"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-group"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: t("nav.requests"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="water" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t("nav.notifications"),
          headerShown: false,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bell" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("nav.profile"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-circle"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
