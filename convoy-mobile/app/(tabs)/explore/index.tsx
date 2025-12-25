import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Divider, Text } from "react-native-paper";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { joinPublicRide, requestJoin, RideEvent, subscribeNearbyRides } from "../../../src/data/rides";

type Filter = "all" | "today" | "weekend";

export default function Explore() {
  const router = useRouter();
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<Array<{ id: string; data: RideEvent; distanceKm: number }>>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const ensureLocation = async () => {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      const req = await Location.requestForegroundPermissionsAsync();
      if (req.status !== "granted") return null;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  };

  const onEnable = async () => {
    const c = await ensureLocation();
    if (!c) {
      Alert.alert("Location needed", "Enable location permission to view rides within 30 km.");
      return;
    }
    setCenter(c);
  };

  useEffect(() => {
    if (!center) return;
    return subscribeNearbyRides({ center, radiusKm: 30, cb: setItems });
  }, [center]);

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;

    const isWeekend = (d: Date) => {
      const day = d.getDay(); // 0 Sun, 6 Sat
      return day === 0 || day === 6;
    };

    return items.filter((x) => {
      const t = x.data.startAt?.toMillis?.() ?? 0;
      if (t === 0) return true;
      const dt = new Date(t);

      if (filter === "today") return t >= startOfToday && t < startOfTomorrow;
      if (filter === "weekend") return isWeekend(dt);
      return true;
    });
  }, [items, filter]);

  const quickJoin = async (id: string, ride: RideEvent) => {
    setBusyId(id);
    try {
      if (ride.isPublic) await joinPublicRide(id);
      else await requestJoin(id);
      Alert.alert("Done", ride.isPublic ? "Joined ride." : "Join request sent.");
    } catch (e: any) {
      Alert.alert("Action failed", e?.message ?? "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Card style={styles.card}>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium" style={{ color: "#F9FAFB" }}>Rides near you</Text>
          <Text style={{ color: "#9CA3AF" }}>Shows rides within 30 km (requires location).</Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button mode="outlined" onPress={onEnable} style={{ flex: 1 }}>
              Enable near me
            </Button>
            <Button mode="contained" onPress={() => router.push("/(tabs)/rides/create")} style={{ flex: 1 }}>
              Create ride
            </Button>
          </View>

          <Divider />

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Chip selected={filter === "all"} onPress={() => setFilter("all")}>All</Chip>
            <Chip selected={filter === "today"} onPress={() => setFilter("today")}>Today</Chip>
            <Chip selected={filter === "weekend"} onPress={() => setFilter("weekend")}>Weekend</Chip>
          </View>
        </Card.Content>
      </Card>

      {!center ? (
        <Card style={styles.card}>
          <Card.Content><Text style={{ color: "#9CA3AF" }}>Enable “Near me” to load rides around you.</Text></Card.Content>
        </Card>
      ) : filtered.length === 0 ? (
        <Card style={styles.card}>
          <Card.Content><Text style={{ color: "#9CA3AF" }}>No rides found for this filter.</Text></Card.Content>
        </Card>
      ) : null}

      {filtered.map((x) => (
        <Card key={x.id} style={styles.card} onPress={() => router.push(`/(tabs)/rides/${x.id}`)}>
          <Card.Content style={{ gap: 10 }}>
            <Text variant="titleMedium" style={{ color: "#F9FAFB" }}>{x.data.title}</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Chip compact>{x.data.isPublic ? "Public" : "Private"}</Chip>
              <Chip compact>{x.distanceKm.toFixed(1)} km</Chip>
              <Chip compact>{new Date(x.data.startAt.toMillis()).toLocaleString()}</Chip>
              <Chip compact>{x.data.memberCount ?? 0} members</Chip>
            </View>

            <Button
              mode="contained"
              disabled={!!busyId}
              loading={busyId === x.id}
              onPress={() => quickJoin(x.id, x.data)}
            >
              {x.data.isPublic ? "Join" : "Request to join"}
            </Button>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617", padding: 16 },
  card: { backgroundColor: "#0B1120", borderRadius: 18, marginBottom: 12 },
});
