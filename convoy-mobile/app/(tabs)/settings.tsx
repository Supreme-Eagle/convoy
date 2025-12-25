import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Card, RadioButton, Text, Button } from "react-native-paper";
import { useAuth } from "../../src/auth/AuthProvider";
import { LocationSharingMode, subscribeToUserSettings, setRideActive, updateLocationSharingMode } from "../../src/data/userSettings";

export default function SettingsTab() {
  const { user } = useAuth();
  const [mode, setMode] = useState<LocationSharingMode>("always");
  const [rideActive, setRideActiveState] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToUserSettings(user.uid, (s) => {
      setMode(s.locationSharingMode);
      setRideActiveState(!!s.rideActive);
    });
  }, [user]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={{ color: "#F9FAFB" }}>Sign in to change settings.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={{ color: "#F9FAFB", marginBottom: 12 }}>
        Settings
      </Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={{ color: "#F9FAFB", marginBottom: 8 }}>Location sharing</Text>

          <RadioButton.Group
            value={mode}
            onValueChange={async (v) => {
              const next = v as LocationSharingMode;
              setMode(next);
              await updateLocationSharingMode(user.uid, next);
            }}
          >
            <RadioButton.Item label="Always (default)" value="always" />
            <RadioButton.Item label="Ride only" value="rideOnly" />
            <RadioButton.Item label="Off" value="off" />
          </RadioButton.Group>

          {mode === "rideOnly" ? (
            <View style={{ marginTop: 10, gap: 8 }}>
              <Text style={{ color: "#9CA3AF" }}>
                Turn Ride Active ON only while you’re riding.
              </Text>
              <Button
                mode={rideActive ? "contained" : "outlined"}
                onPress={async () => {
                  const next = !rideActive;
                  setRideActiveState(next);
                  await setRideActive(user.uid, next);
                }}
              >
                {rideActive ? "Ride Active: ON" : "Ride Active: OFF"}
              </Button>
            </View>
          ) : null}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617", padding: 16 },
  card: { backgroundColor: "#0B1120", borderRadius: 18 },
});
