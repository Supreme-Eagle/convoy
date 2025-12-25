import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { subscribeMembers } from "../../../../src/data/groups";
import { db } from "../../../../src/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Members() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [members, setMembers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!id) return;
    return subscribeMembers(String(id), setMembers);
  }, [id]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const out: Record<string, any> = {};
      for (const m of members) {
        const s = await getDoc(doc(db, "users", m.uid));
        out[m.uid] = s.exists() ? s.data() : null;
      }
      if (alive) setProfiles(out);
    }
    if (members.length) load();
    return () => { alive = false; };
  }, [members.map((m) => m.uid).join("|")]);

  const rows = useMemo(() => {
    return members.map((m) => {
      const u = profiles[m.uid] || {};
      const ll = u.lastLocation;
      return {
        ...m,
        displayName: u.displayName || m.uid,
        last: ll ? `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}` : "No location yet",
        updatedAt: ll?.updatedAt ? "Updated" : "",
      };
    });
  }, [members, profiles]);

  return (
    <View style={s.c}>
      <Text style={s.h}>Members</Text>
      <Text style={s.p}>Shows each member’s last published location (if sharing is enabled).</Text>

      <FlatList
        data={rows}
        keyExtractor={(i) => i.uid}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.t}>{item.displayName}</Text>
            <Text style={s.p}>Role: {item.role}</Text>
            <Text style={s.p}>Last: {item.last}</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: "#050B18", padding: 16, gap: 12 },
  h: { color: "white", fontSize: 22, fontWeight: "900" },
  p: { color: "#94A3B8" },
  card: { backgroundColor: "#0B1224", borderColor: "#1F2A44", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6, marginBottom: 10 },
  t: { color: "white", fontWeight: "900" },
});
