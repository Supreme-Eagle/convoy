import React from "react";
import { Stack } from "expo-router";
import LocationTracker from "../src/location/LocationTracker";
import { PaperProvider, MD3DarkTheme } from "react-native-paper";
import { AuthProvider } from "../src/auth/AuthProvider";

const theme = {
  ...MD3DarkTheme,
  roundness: 16,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#F97316",
    secondary: "#22C55E",
    tertiary: "#38BDF8",
    background: "#020617",
    surface: "#020617",
    surfaceVariant: "#0B1120",
    onSurface: "#F9FAFB",
    onSurfaceVariant: "#9CA3AF",
    outline: "#1E293B",
    error: "#F97373",
  },
};

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </PaperProvider>
  );
}
