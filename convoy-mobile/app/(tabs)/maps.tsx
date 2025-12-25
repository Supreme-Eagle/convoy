import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Text, Card, Button, Avatar } from "react-native-paper";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/auth/AuthProvider";
import { Group, subscribeToGroups, subscribeToMyGroupIds } from "../../src/data/groups";

type GroupVM = Group & { isMember: boolean };

export default function MapTab() {
  const { user } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set());

  useEffect(() => subscribeToGroups(setGroups), []);

  useEffect(() => {
    if (!user) {
      setMyGroupIds(new Set());
      return;
    }
    return subscribeToMyGroupIds(user.uid, setMyGroupIds);
  }, [user]);

  const myGroups: GroupVM[] = useMemo(
    () => groups.map((g) => ({ ...g, isMember: myGroupIds.has(g.id) })).filter((g) => g.isMember),
    [groups, myGroupIds]
  );

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#F9FAFB" }}>Sign in to view maps.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={{ color: "#F9FAFB" }}>Maps</Text>
      <Text style={{ color: "#9CA3AF" }}>
        Select a group to see live member locations.
      </Text>

      {myGroups.map((g) => (
        <TouchableOpacity key={g.id} activeOpacity={0.85} onPress={() => router.push(`/group/${g.id}/map`)}>
          <Card style={styles.card}>
            <Card.Content style={styles.row}>
              <Avatar.Text size={40} label={g.name[0]} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#F9FAFB" }} variant="titleMedium">{g.name}</Text>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{g.memberCount} riders · {g.level}</Text>
              </View>
              <Button mode="contained" style={{ borderRadius: 999 }} onPress={() => router.push(`/group/${g.id}/map`)}>
                Open
              </Button>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      ))}

      {myGroups.length === 0 ? (
        <Text style={{ color: "#9CA3AF", marginTop: 12 }}>
          You are not in any group yet.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  center: { flex: 1, backgroundColor: "#020617", justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: "#0B1120", borderRadius: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { backgroundColor: "#F97316" },
});
