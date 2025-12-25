import React from "react";
import { Stack } from "expo-router";
export default function ExploreLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerTitleAlign: "center" }}>
      <Stack.Screen name="index" options={{ title: "Explore" }} />
    </Stack>
  );
}
