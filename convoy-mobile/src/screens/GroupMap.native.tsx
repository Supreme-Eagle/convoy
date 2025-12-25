import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { Appbar, Text } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { useAuth } from "../auth/AuthProvider";
import { subscribeToGroupLocations, updateMyGroupLocation, GroupLocationMember } from "../data/groupLocation";

export default function GroupMapScreenNative() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = id as string;

  const { user } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<GroupLocationMember[]>([]);
  const [region, setRegion] = useState<Region | null>(null);
  const [error, setError] = useState<string>("");

  const watchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!groupId) return;
    return subscribeToGroupLocations(groupId, setMembers);
  }, [groupId]);

  useEffect(() => {
    if (!user || !groupId) return;

    (async () => {
      setError("");

      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setError("Location permission denied.");
        return;
      }

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 10 },
        async (pos) => {
          const { latitude, longitude, heading, speed, accuracy } = pos.coords;

          if (!region) {
            setRegion({ latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
          }

          try {
            await updateMyGroupLocation({
              groupId,
              userId: user.uid,
              latitude,
              longitude,
              heading,
              speed,
              accuracy,
            });
          } catch {
            // ignore (e.g. user left)
          }
        }
      );
    })();

    return () => {
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [user, groupId, region]);

  const markers = useMemo(() => members.filter((m) => !!m.location), [members]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#F9FAFB" }}>Sign in to view map.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: "#020617" }}>
        <Appbar.BackAction color="#F9FAFB" onPress={() => router.back()} />
        <Appbar.Content title="Live map" titleStyle={{ color: "#F9FAFB" }} />
      </Appbar.Header>

      {error ? (
        <View style={styles.center}>
          <Text style={{ color: "#FCA5A5" }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <MapView
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={
            region ?? {
              latitude: 19.076,
              longitude: 72.8777,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }
          }
        >
          {markers.map((m) => (
            <Marker
              key={m.id}
              coordinate={m.location!}
              title={m.displayName || "Member"}
              description={m.role === "leader" ? "Leader" : "Member"}
            />
          ))}
        </MapView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
