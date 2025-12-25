import React from "react";
import { Stack } from "expo-router";
export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerTitleAlign: "center" }}>
      <Stack.Screen name="index" options={{ title: "Profile" }} />
      <Stack.Screen name="edit" options={{ title: "Edit profile" }} />
    </Stack>
  );
}
