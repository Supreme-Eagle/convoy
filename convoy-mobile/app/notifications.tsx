import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { AppNotification, markNotificationRead, subscribeMyNotifications } from "../src/data/notifications";

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Array<{ id: string; data: AppNotification }>>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => subscribeMyNotifications(setItems), []);

  const unread = useMemo(
    () => items.filter((x) => !x.data.readAt).length,
    [items]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text variant="headlineSmall" style={{ color: "#F9FAFB" }}>Notifications</Text>
        <Chip compact style={{ backgroundColor: "#111827" }}>Unread: {unread}</Chip>
      </View>

      {items.length === 0 ? (
        <Card style={styles.card}><Card.Content><Text style={{ color: "#9CA3AF" }}>No notifications yet.</Text></Card.Content></Card>
      ) : null}

      {items.map((n) => (
        <Card key={n.id} style={[styles.card, !n.data.readAt ? styles.unreadCard : null]}>
          <Card.Content style={{ gap: 10 }}>
            <Text style={{ color: "#F9FAFB" }}>{n.data.message}</Text>

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Chip compact>{n.data.type}</Chip>
              {!n.data.readAt ? <Chip compact>Unread</Chip> : <Chip compact>Read</Chip>}
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              {!n.data.readAt ? (
                <Button
                  mode="contained"
                  disabled={!!busyId}
                  loading={busyId === n.id}
                  onPress={async () => {
                    setBusyId(n.id);
                    try { await markNotificationRead(n.id); } finally { setBusyId(null); }
                  }}
                  style={{ flex: 1 }}
                >
                  Mark read
                </Button>
              ) : null}

              {n.data.eventId ? (
                <Button
                  mode="outlined"
                  onPress={() => router.push(`/(tabs)/rides/${n.data.eventId}`)}
                  style={{ flex: 1 }}
                >
                  Open ride
                </Button>
              ) : null}
            </View>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617", padding: 16 },
  card: { backgroundColor: "#0B1120", borderRadius: 18, marginBottom: 12 },
  unreadCard: { borderColor: "#38BDF8", borderWidth: 1 },
});
