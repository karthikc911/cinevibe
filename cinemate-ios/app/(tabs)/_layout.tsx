import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Home, Search, Bookmark, Users, User } from 'lucide-react-native';
import { Colors } from '../../lib/constants';

export default function TabLayout() {
  // Memoize screen options to prevent re-calculation
  const screenOptions = useMemo(() => ({
    headerShown: false,
    tabBarStyle: styles.tabBar,
    tabBarActiveTintColor: Colors.primary,
    tabBarInactiveTintColor: Colors.textMuted,
    tabBarLabelStyle: styles.tabBarLabel,
    // Performance settings for production:
    animation: 'none' as const, // Instant tab switch, no animation delay
    lazy: true, // Load tabs only when visited (prevents all tabs loading at once)
    freezeOnBlur: true, // Freeze inactive tabs to prevent unnecessary re-renders
  }), []);

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color, size }) => <Bookmark color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 85,
    paddingBottom: 25,
    paddingTop: 10,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});

