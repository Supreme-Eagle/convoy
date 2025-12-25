import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Text, Card, Button, Chip, Avatar, TextInput, Dialog, Portal } from "react-native-paper";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/auth/AuthProvider";
import { Group, subscribeToGroups, subscribeToMyGroupIds, createGroup, joinGroupUnique } from "../../src/data/groups";

type GroupVM = Group & { isMember: boolean };

export default function GroupsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set());

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("Intermediate");
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToGroups(setGroups), []);

  useEffect(() => {
    if (!user) {
      setMyGroupIds(new Set());
      return;
    }
    return subscribeToMyGroupIds(user.uid, setMyGroupIds);
  }, [user]);

  const groupsVM: GroupVM[] = useMemo(
    () => groups.map((g) => ({ ...g, isMember: myGroupIds.has(g.id) })),
    [groups, myGroupIds]
  );

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      await createGroup(name.trim(), level, user.uid, user.email ?? user.uid);
      setName("");
      setLevel("Intermediate");
      setCreating(false);
    } finally {
      setSaving(false);
    }
  };

  const handleJoin = async (groupId: string) => {
    if (!user) return;
    await joinGroupUnique(groupId, user.uid, user.email ?? user.uid);
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text variant="headlineSmall" style={styles.heading}>Groups</Text>
          <Button mode="contained" style={styles.newGroup} onPress={() => setCreating(true)} disabled={!user}>
            New group
          </Button>
        </View>

        {groupsVM.map((g) => (
          <TouchableOpacity key={g.id} activeOpacity={0.85} onPress={() => router.push(`/group/${g.id}`)}>
            <Card style={styles.card} mode="elevated">
              <Card.Content style={styles.cardContent}>
                <Avatar.Text size={40} label={g.name[0]} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={styles.groupName}>{g.name}</Text>
                  <Text style={styles.groupMeta}>{g.memberCount} riders · {g.level}</Text>
                  <View style={styles.chipsRow}>
                    <Chip compact style={styles.chip} textStyle={styles.chipText}>Live chat</Chip>
                    <Chip compact style={styles.chip} textStyle={styles.chipText}>Routes</Chip>
                  </View>
                </View>
                <Button
                  mode={g.isMember ? "contained-tonal" : "contained"}
                  style={styles.joinButton}
                  onPress={() => handleJoin(g.id)}
                  disabled={!user || g.isMember}
                >
                  {g.isMember ? "Joined" : "Join"}
                </Button>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Portal>
        <Dialog visible={creating} onDismiss={() => setCreating(false)}>
          <Dialog.Title>Create group</Dialog.Title>
          <Dialog.Content style={{ gap: 8 }}>
            <TextInput label="Group name" value={name} onChangeText={setName} mode="outlined" />
            <TextInput label="Level (e.g. Beginner, Fast)" value={level} onChangeText={setLevel} mode="outlined" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreating(false)}>Cancel</Button>
            <Button loading={saving} onPress={handleCreate}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heading: { color: "#F9FAFB" },
  newGroup: { borderRadius: 999 },
  card: { backgroundColor: "#0B1120", borderRadius: 18, marginBottom: 8 },
  cardContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { backgroundColor: "#F97316" },
  groupName: { color: "#F9FAFB" },
  groupMeta: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  chip: { backgroundColor: "#020617", borderColor: "#1E293B", borderWidth: 1 },
  chipText: { color: "#E5E7EB", fontSize: 11 },
  joinButton: { borderRadius: 999 },
});
