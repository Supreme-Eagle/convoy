import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Switch } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../../src/firebase";
import { useAuth } from "../../../src/auth/AuthProvider";
import { getUserProfile, setEmergencyDetails, setLocationSharingEnabled } from "../../../src/data/userProfile";

export default function Profile() {
  const { user } = useAuth();
  const [bloodGroup, setBloodGroup] = useState("");
  const [emName, setEmName] = useState("");
  const [emPhone, setEmPhone] = useState("");
  const [sharing, setSharing] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!user) return;
      const p = await getUserProfile(user.uid);
      if (!alive || !p) return;
      setBloodGroup(p.bloodGroup ?? "");
      setEmName(p.emergencyName ?? "");
      setEmPhone(p.emergencyPhone ?? "");
      setSharing(p.settings?.locationSharingEnabled !== false);
    }
    load();
    return () => { alive = false; };
  }, [user?.uid]);

  async function saveEmergency() {
    if (!user) return;
    setSaved(null);
    await setEmergencyDetails(user.uid, { bloodGroup, emergencyName: emName, emergencyPhone: emPhone });
    setSaved("Saved");
    setTimeout(() => setSaved(null), 1200);
  }

  async function toggleSharing(v: boolean) {
    if (!user) return;
    setSharing(v);
    await setLocationSharingEnabled(user.uid, v);
  }

  return (
    <View style={s.c}>
      <Text style={s.h}>Profile</Text>

      <View style={s.card}>
        <Text style={s.t}>Privacy</Text>
        <View style={s.row}>
          <Text style={s.p}>Location sharing</Text>
          <Switch value={sharing} onValueChange={toggleSharing} />
        </View>
        <Text style={s.p}>If OFF, your live location won’t be published while the app is running.</Text>
      </View>

      <View style={s.card}>
        <Text style={s.t}>Emergency details (optional)</Text>
        <TextInput style={s.i} placeholder="Blood group" placeholderTextColor="#94A3B8" value={bloodGroup} onChangeText={setBloodGroup} />
        <TextInput style={s.i} placeholder="Emergency contact name" placeholderTextColor="#94A3B8" value={emName} onChangeText={setEmName} />
        <TextInput style={s.i} placeholder="Emergency phone" placeholderTextColor="#94A3B8" value={emPhone} onChangeText={setEmPhone} />
        <Pressable style={s.b} onPress={saveEmergency}>
          <Text style={s.bt}>Save</Text>
        </Pressable>
        {saved ? <Text style={s.ok}>{saved}</Text> : null}
      </View>

      <Pressable style={[s.b, { backgroundColor: "#111C35" }]} onPress={() => signOut(auth)}>
        <Text style={s.bt}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: "#050B18", padding: 16, gap: 12 },
  h: { color: "white", fontSize: 22, fontWeight: "900" },
  card: { backgroundColor: "#0B1224", borderColor: "#1F2A44", borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  t: { color: "white", fontWeight: "800" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  i: { backgroundColor: "#0B1224", borderColor: "#1F2A44", borderWidth: 1, borderRadius: 12, padding: 12, color: "white" },
  p: { color: "#94A3B8" },
  b: { backgroundColor: "#2563EB", borderRadius: 12, padding: 12, alignItems: "center", marginTop: 6 },
  bt: { color: "white", fontWeight: "900" },
  ok: { color: "#86EFAC" },
});
