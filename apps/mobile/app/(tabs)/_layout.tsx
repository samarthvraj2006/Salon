import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../../src/theme';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const map: Record<string, string> = {
    Home: '⌂',
    Search: '⌕',
    Bookings: '▣',
    Favorites: '♡',
    Profile: '○',
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 21, lineHeight: 24, color: focused ? colors.primary : colors.textSecondary }}>
        {map[label]}
      </Text>
      <Text style={{ fontSize: 11, color: focused ? colors.primary : colors.textSecondary, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () =>
          Platform.OS !== 'web' ? (
            <BlurView intensity={42} tint="light" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassStrong }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Search" focused={focused} /> }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Bookings" focused={focused} /> }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Favorites" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 68,
    borderRadius: 24,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'transparent',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
});
