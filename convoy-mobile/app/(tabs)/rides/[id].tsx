import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, TextInput } from "react-native";
import { useLocalSearchParams, Link } from "expo-router";
import { useAuth } from "../../../src/auth/AuthProvider";
import { approveRequest, joinPublicGroup, leaveGroup, requestToJoin, subscribeGroup, subscribeMembers, subscribeRequests } from "../../../src/data/groups";

export default function GroupDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [group, setGroup] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [joinId, setJoinId] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const u1 = subscribeGroup(String(id), setGroup);
    const u2 = subscribeMembers(String(id), setMembers);
    const u3 = subscribeRequests(String(id), setRequests);
    return () => { u1(); u2(); u3(); };
  }, [id]);

  const myRole = useMemo(() => members.find((m) => m.uid === user?.uid)?.role ?? null, [members, user?.uid]);
  const isMember = !!members.find((m) => m.uid === user?.uid);

  async function joinOrRequest() {
    setErr(null);
    try {
      if (!group) return;
      if (group.isPublic) await joinPublicGroup(String(id));
      else await requestToJoin(String(id));
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    }
  }

  async function approve(uid: string) {
    setErr(null);
    try {
      await approveRequest(String(id), uid);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    }
  }

  async function leave() {
    setErr(null);
    try {
      await leaveGroup(String(id));
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    }
  }

  return (
    <View style={s.c}>
      <Text style={s.h}>{group?.name ?? "Group"}</Text>
      <Text style={s.p}>{group?.city ?? ""} • {group?.isPublic ? "Public" : "Private"}</Text>

      {err ? <Text style={s.err}>{err}</Text> : null}

      <View style={s.row}>
        <Link href={{ pathname: "/(tabs)/rides/[id]/members", params: { id: String(id) } }} asChild>
          <Pressable style={s.b2}><Text style={s.bt}>Members</Text></Pressable>
        </Link>

        {isMember ? (
          <Pressable style={[s.b2, { backgroundColor: "#111C35" }]} onPress={leave}>
            <Text style={s.bt}>Leave</Text>
          </Pressable>
        ) : (
          <Pressable style={s.b2} onPress={joinOrRequest}>
            <Text style={s.bt}>{group?.isPublic ? "Join" : "Request"}</Text>
          </Pressable>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.t}>Quick join by Group ID</Text>
        <TextInput style={s.i} placeholder="Paste group id..." placeholderTextColor="#94A3B8" value={joinId} onChangeText={setJoinId} />
        <Link href={{ pathname: "/(tabs)/rides/[id]", params: { id: joinId || "" } }} asChild>
          <Pressable style={s.b}><Text style={s.bt}>Open</Text></Pressable>
        </Link>
      </View>

      {myRole === "owner" ? (
        <>
          <Text style={s.sec}>Pending requests</Text>
          <FlatList
            data={requests}
            keyExtractor={(i) => i.id}
            ListEmptyComponent={<Text style={s.p}>No requests.</Text>}
            renderItem={({ item }) => (
              <View style={s.card}>
                <Text style={s.t}>UID: {item.uid}</Text>
                <Pressable style={s.b} onPress={() => approve(item.uid)}>
                  <Text style={s.bt}>Approve</Text>
                </Pressable>
              </View>
            )}
          />
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: "#050B18", padding: 16, gap: 12 },
  h: { color: "white", fontSize: 22, fontWeight: "900" },
  p: { color: "#94A3B8" },
  sec: { color: "white", fontSize: 16, fontWeight: "800", marginTop: 8 },
  row: { flexDirection: "row", gap: 10 },
  b2: { backgroundColor: "#2563EB", borderRadius: 12, padding: 12, alignItems: "center" },
  b: { backgroundColor: "#2563EB", borderRadius: 12, padding: 12, alignItems: "center", marginTop: 8 },
  bt: { color: "white", fontWeight: "900" },
  card: { backgroundColor: "#0B1224", borderColor: "#1F2A44", borderWidth: 1, borderRadius: 14, padding: 14, gap: 8, marginTop: 8 },
  t: { color: "white", fontWeight: "900" },
  i: { backgroundColor: "#0B1224", borderColor: "#1F2A44", borderWidth: 1, borderRadius: 12, padding: 12, color: "white" },
  err: { color: "#FCA5A5" },
});
