import React, { useEffect, useState } from "react";
import { Tabs, Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../src/auth/AuthProvider";
import { ensureUserProfileDoc, needsOnboarding, subscribeToUserProfile, UserProfile } from "../../src/data/userProfile";

export default function TabsLayout() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let unsub: undefined | (() => void);

    (async () => {
      if (!user) {
        setLoaded(true);
        return;
      }
      setLoaded(false);
      await ensureUserProfileDoc(user.uid);
      unsub = subscribeToUserProfile(user.uid, (p) => {
        setProfile(p);
        setLoaded(true);
      });
    })().catch(() => setLoaded(true));

    return () => unsub?.();
  }, [user]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#020617", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (user && needsOnboarding(profile)) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs initialRouteName="home" screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="rides" options={{ title: "Rides" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="marketplace" options={{ title: "Marketplace" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
      <Tabs.Screen name="groups" options={{ href: null }} />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="map" options={{ href: null }} />
      <Tabs.Screen name="map.web" options={{ href: null }} />
      <Tabs.Screen name="maps" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
