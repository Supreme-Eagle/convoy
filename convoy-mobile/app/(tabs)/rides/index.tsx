import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../../src/auth/AuthProvider";
import { subscribeMyGroups } from "../../../src/data/groups";

export default function RidesIndex() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeMyGroups(user.uid, setRows);
  }, [user?.uid]);

  return (
    <View style={s.c}>
      <View style={s.row}>
        <Text style={s.h}>My Groups</Text>
        <Link href="/(tabs)/rides/create" asChild>
          <Pressable style={s.b}><Text style={s.bt}>Create</Text></Pressable>
        </Link>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<Text style={s.p}>No groups yet. Create one.</Text>}
        renderItem={({ item }) => (
          <Link href={{ pathname: "/(tabs)/rides/[id]", params: { id: item.id } }} asChild>
            <Pressable style={s.card}>
              <Text style={s.t}>{item.name}</Text>
              <Text style={s.p}>{item.city} • {item.isPublic ? "Public" : "Private"} • {item.role}</Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: "#050B18", padding: 16, gap: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  h: { color: "white", fontSize: 22, fontWeight: "900" },
  b: { backgroundColor: "#2563EB", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  bt: { color: "white", fontWeight: "900" },
  card: { backgroundColor: "#0B1224", borderColor: "#1F2A44", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6, marginBottom: 10 },
  t: { color: "white", fontWeight: "900" },
  p: { color: "#94A3B8" },
});
