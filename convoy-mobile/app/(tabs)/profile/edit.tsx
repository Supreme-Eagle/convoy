import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Card, TextInput } from "react-native-paper";
import { useRouter } from "expo-router";
import { subscribeMyProfile, updateMyProfile, UserProfile } from "../../../src/data/profile";

export default function EditProfile() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  useEffect(() => {
    return subscribeMyProfile((p) => {
      const data: UserProfile = p ?? {};
      setUsername((data.username ?? "").toString());
      setBloodGroup((data.bloodGroup ?? "").toString());
      setEmergencyContactName((data.emergencyContactName ?? "").toString());
      setEmergencyContactPhone((data.emergencyContactPhone ?? "").toString());
      setLoading(false);
    });
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      await updateMyProfile({
        username: username.trim() || null,
        bloodGroup: bloodGroup.trim() || null,
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyContactPhone.trim() || null,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={{ gap: 12 }}>
          <TextInput label="Username" value={username} onChangeText={setUsername} />
          <TextInput label="Blood group" value={bloodGroup} onChangeText={setBloodGroup} />
          <TextInput label="Emergency contact name" value={emergencyContactName} onChangeText={setEmergencyContactName} />
          <TextInput
            label="Emergency contact phone"
            value={emergencyContactPhone}
            onChangeText={setEmergencyContactPhone}
            keyboardType="phone-pad"
          />

          <Button mode="contained" disabled={loading || saving} loading={saving} onPress={onSave}>
            Save
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617", padding: 16 },
  card: { backgroundColor: "#0B1120", borderRadius: 18 },
});
