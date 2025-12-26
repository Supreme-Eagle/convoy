import React from 'react';
import { Tabs } from 'expo-router';
import { useThemeContext } from '../../src/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  const { theme } = useThemeContext();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: theme.dark ? '#000' : '#fff', 
          borderTopColor: theme.dark ? '#333' : '#e0e0e0',
          elevation: 0,
          height: 60,
          paddingBottom: 8
        },
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      {/* MAIN TABS */}
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home-variant" size={28} color={color} /> }} />
      <Tabs.Screen name="maps/index" options={{ title: 'Maps', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="map-outline" size={28} color={color} /> }} />
      <Tabs.Screen name="record" options={{ title: 'Record', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="record-circle-outline" size={28} color={color} /> }} />
      <Tabs.Screen name="groups" options={{ title: 'Groups', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-group-outline" size={28} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'You', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-circle-outline" size={28} color={color} /> }} />

      {/* HIDDEN ROUTES */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="map" options={{ href: null }} />
      <Tabs.Screen name="two" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
      <Tabs.Screen name="marketplace" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="security" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="rides" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="activity/[id]" options={{ href: null }} />
      <Tabs.Screen name="maps/create" options={{ href: null }} />
    </Tabs>
  );
}
