import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../src/auth/AuthProvider";
import { PaperProvider } from "react-native-paper";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { checkOnboardingStatus } from "../src/data/userProfile";

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [checkingOnboard, setCheckingOnboard] = useState(false);

  useEffect(() => {
    if (loading || checkingOnboard) return;

    const inAuthGroup = segments[0] === "auth";
    const inTabsGroup = segments[0] === "(tabs)";

    const verifyRoute = async () => {
      if (!user) {
        // Not logged in? Go to /auth
        if (!inAuthGroup) {
          router.replace("/auth");
        }
      } else {
        // Logged in? Check Onboarding
        if (inAuthGroup) {
          setCheckingOnboard(true);
          const needsOnboard = await checkOnboardingStatus(user.uid);
          setCheckingOnboard(false);

          if (needsOnboard) {
            router.replace("/onboarding");
          } else {
            router.replace("/(tabs)/home");
          }
        }
      }
    };
    verifyRoute();
  }, [user, loading, segments]);

  if (loading || checkingOnboard) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <PaperProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Simple 'auth' route (mapped to app/auth.tsx) */}
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
