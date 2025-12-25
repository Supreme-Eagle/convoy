import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Divider, Text } from "react-native-paper";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useAuth } from "../../src/auth/AuthProvider";
import { subscribeMyProfile, UserProfile } from "../../src/data/profile";
import { subscribeMyNotifications, AppNotification } from "../../src/data/notifications";
import { subscribeActiveSosNear, SosEvent, triggerSos, resolveSos } from "../../src/data/sos";

export default function HomeTab() {
  const router = useRouter();
  const { user } = useAuth();

  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [sos, setSos] = useState<Array<{ id: string; data: SosEvent; distanceKm: number }>>([]);
  const [notifs, setNotifs] = useState<Array<{ id: string; data: AppNotification }>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeMyNotifications(setNotifs), []);

  useEffect(() => {
    if (!center) return;
    return subscribeActiveSosNear({
      center,
      radiusKm: 5.5,
      cb: setSos,
    });
  }, [center]);

  const myActiveSos = useMemo(() => {
    if (!user) return null;
    return sos.find((x) => x.data.uid === user.uid) ?? null;
  }, [sos, user]);

  const ensureLocation = async () => {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      const req = await Location.requestForegroundPermissionsAsync();
      if (req.status !== "granted") return null;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  };

  const onEnableNearby = async () => {
    setBusy(true);
    try {
      const c = await ensureLocation();
      if (!c) {
        Alert.alert("Location needed", "Enable location permission to view SOS within 5.5 km.");
        return;
      }
      setCenter(c);
    } finally {
      setBusy(false);
    }
  };

  const onTrigger = async () => {
    setBusy(true);
    try {
      const c = await ensureLocation();
      if (!c) {
        Alert.alert("Location needed", "SOS requires location to alert nearby riders.");
        return;
      }
      setCenter(c);
      await triggerSos(c);
    } catch (e: any) {
      Alert.alert("SOS failed", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const onResolveMine = async () => {
    if (!myActiveSos) return;
    setBusy(true);
    try {
      await resolveSos(myActiveSos.id);
    } catch (e: any) {
      Alert.alert("Resolve failed", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text variant="headlineSmall" style={{ color: "#F9FAFB", marginBottom: 12 }}>
        Home
      </Text>

      <Card style={[styles.card, myActiveSos ? styles.cardDanger : null]}>
        <Card.Content style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text variant="titleMedium" style={{ color: "#F9FAFB" }}>SOS</Text>
            <Chip compact style={{ backgroundColor: "#111827" }}>
              Nearby: {sos.length}
            </Chip>
          </View>

          <Text style={{ color: "#9CA3AF" }}>
            SOS is shown only to riders within 5.5 km.
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button mode="outlined" disabled={busy} onPress={onEnableNearby} style={{ flex: 1 }}>
              Enable nearby SOS
            </Button>

            {myActiveSos ? (
              <Button mode="contained" buttonColor="#DC2626" disabled={busy} loading={busy} onPress={onResolveMine} style={{ flex: 1 }}>
                Resolve mine
              </Button>
            ) : (
              <Button mode="contained" buttonColor="#DC2626" disabled={busy} loading={busy} onPress={onTrigger} style={{ flex: 1 }}>
                Trigger SOS
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium" style={{ color: "#F9FAFB" }}>Nearby active SOS</Text>
          <Divider />
          {!center ? (
            <Text style={{ color: "#9CA3AF" }}>Enable nearby SOS to see events around you.</Text>
          ) : sos.length === 0 ? (
            <Text style={{ color: "#9CA3AF" }}>No active SOS within 5.5 km.</Text>
          ) : (
            sos.slice(0, 6).map((x) => (
              <View key={x.id} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <Chip compact>UID: {x.data.uid.slice(0, 8)}…</Chip>
                  {x.data.username ? <Chip compact>{x.data.username}</Chip> : null}
                  {x.data.bloodGroup ? <Chip compact>BG: {x.data.bloodGroup}</Chip> : null}
                  <Chip compact>{x.distanceKm.toFixed(2)} km</Chip>
                </View>
                <Text style={{ color: "#9CA3AF" }}>
                  {x.data.createdAt?.toDate ? `Triggered: ${x.data.createdAt.toDate().toLocaleString()}` : "Triggered: just now"}
                </Text>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium" style={{ color: "#F9FAFB" }}>Notifications</Text>
          <Divider />
          {notifs.length === 0 ? (
            <Text style={{ color: "#9CA3AF" }}>No notifications yet.</Text>
          ) : (
            notifs.slice(0, 5).map((n) => (
              <View key={n.id} style={{ gap: 4 }}>
                <Text style={{ color: "#F9FAFB" }}>{n.data.message}</Text>
                <Text style={{ color: "#9CA3AF" }}>
                  {n.data.createdAt?.toDate ? n.data.createdAt.toDate().toLocaleString() : ""}
                </Text>
              </View>
            ))
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617", padding: 16 },
  card: { backgroundColor: "#0B1120", borderRadius: 18, marginBottom: 12 },
  cardDanger: { borderColor: "#DC2626", borderWidth: 1 },
});
