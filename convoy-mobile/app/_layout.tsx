import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { ThemeProvider } from '../src/context/ThemeContext';
import { View, ActivityIndicator } from 'react-native';

// Separate component to handle Auth Navigation Logic
function RootNavigation() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';
    
    // If not logged in & not in auth/onboarding -> Go to Auth
    if (!user && !inAuthGroup) {
      router.replace('/auth');
    } 
    // If logged in & in auth -> Go to Home
    else if (user && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      {/* Remove explicit (rides) screen if it causes warning, Expo finds it automatically */}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <PaperProvider>
          <RootNavigation />
        </PaperProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
