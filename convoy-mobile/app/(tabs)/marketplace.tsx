import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Card } from "react-native-paper";

export default function MarketplaceTab() {
  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={{ color: "#F9FAFB" }}>Marketplace</Text>
      <Card style={styles.card}><Card.Content><Text style={{ color: "#9CA3AF" }}>City-filtered listings + chat interest will go here.</Text></Card.Content></Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617", padding: 16, gap: 12 },
  card: { backgroundColor: "#0B1120", borderRadius: 18 },
});
