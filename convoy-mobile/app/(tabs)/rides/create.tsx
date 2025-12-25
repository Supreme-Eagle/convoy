import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Switch } from "react-native";
import { useRouter } from "expo-router";
import { createGroup } from "../../../src/data/groups";

export default function CreateGroup() {
  const r = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [isPublic, setIsPublic] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function onCreate() {
    setErr(null);
    try {
      const id = await createGroup(name, city, isPublic);
      r.replace({ pathname: "/(tabs)/rides/[id]", params: { id } });
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    }
  }

  return (
    <View style={s.c}>
      <Text style={s.h}>Create Group</Text>

      <TextInput style={s.i} placeholder="Group name" placeholderTextColor="#94A3B8" value={name} onChangeText={setName} />
      <TextInput style={s.i} placeholder="City (e.g., Mumbai)" placeholderTextColor="#94A3B8" value={city} onChangeText={setCity} />

      <View style={s.row}>
        <Text style={s.p}>Public group (anyone can join)</Text>
        <Switch value={isPublic} onValueChange={setIsPublic} />
      </View>

      {err ? <Text style={s.err}>{err}</Text> : null}

      <Pressable style={s.b} onPress={onCreate}>
        <Text style={s.bt}>Create</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: "#050B18", padding: 16, gap: 12 },
  h: { color: "white", fontSize: 22, fontWeight: "900" },
  i: { backgroundColor: "#0B1224", borderColor: "#1F2A44", borderWidth: 1, borderRadius: 12, padding: 12, color: "white" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  p: { color: "#94A3B8" },
  b: { backgroundColor: "#2563EB", borderRadius: 12, padding: 12, alignItems: "center" },
  bt: { color: "white", fontWeight: "900" },
  err: { color: "#FCA5A5" },
});
