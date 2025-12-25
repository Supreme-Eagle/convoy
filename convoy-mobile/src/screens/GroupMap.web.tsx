import React from "react";
import { View, StyleSheet } from "react-native";
import { Appbar, Text, Button } from "react-native-paper";
import { useRouter } from "expo-router";

export default function GroupMapScreenWeb() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: "#020617" }}>
        <Appbar.BackAction color="#F9FAFB" onPress={() => router.back()} />
        <Appbar.Content title="Live map" titleStyle={{ color: "#F9FAFB" }} />
      </Appbar.Header>

      <View style={styles.center}>
        <Text style={{ color: "#F9FAFB", marginBottom: 8 }}>
          Live map is available on Android/iOS only.
        </Text>
        <Button mode="contained" onPress={() => router.back()} style={{ borderRadius: 999 }}>
          Go back
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
});
