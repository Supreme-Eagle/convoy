import React, { useEffect, useLayoutEffect, useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Text, Appbar, Avatar, Menu, ActivityIndicator, Dialog, Portal, Button } from "react-native-paper";
import { useAuth } from "../../src/auth/AuthProvider";
import { Group, GroupMember, subscribeToGroups, subscribeToMembers, isUserMember, leaveGroup, setMemberStatus, disbandGroup } from "../../src/data/groups";

export default function GroupDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = id as string;

  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [menuVisible, setMenuVisible] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDisband, setConfirmDisband] = useState(false);
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (!user || !groupId) return;

    let unsubGroup: () => void = () => {};
    let unsubMembers: () => void = () => {};

    (async () => {
      const member = await isUserMember(groupId, user.uid);
      if (!member) {
        router.replace("/(tabs)/groups");
        return;
      }

      unsubGroup = subscribeToGroups((groups) => {
        const g = groups.find((x) => x.id === groupId) || null;
        setGroup(g);
      });

      unsubMembers = subscribeToMembers(groupId, setMembers);

      setLoading(false);

      await setMemberStatus(groupId, user.uid, "online", user.email ?? user.uid);
    })();

    return () => {
      unsubGroup();
      unsubMembers();
      setMemberStatus(groupId, user.uid, "offline", user.email ?? user.uid).catch(() => {});
    };
  }, [user, groupId, router]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#F9FAFB" }}>Sign in to view group details.</Text>
      </View>
    );
  }

  if (loading || !group) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  const currentMember = members.find((m) => m.id === user.uid);
  const isLeader = currentMember?.role === "leader";
  const leaderCount = members.filter((m) => m.role === "leader").length;

  const showDisband = !!isLeader && leaderCount === 1;
  const showLeave = !isLeader || leaderCount > 1;
  const showMenu = showDisband || showLeave;

  const doLeave = async () => {
    setBusy(true);
    try {
      await leaveGroup(groupId, user.uid);
      router.replace("/(tabs)/groups");
    } finally {
      setBusy(false);
      setConfirmLeave(false);
      setMenuVisible(false);
    }
  };

  const doDisband = async () => {
    setBusy(true);
    try {
      await disbandGroup(groupId);
      router.replace("/(tabs)/groups");
    } finally {
      setBusy(false);
      setConfirmDisband(false);
      setMenuVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: "#020617" }}>
        <Appbar.BackAction color="#F9FAFB" onPress={() => router.back()} />
        <Appbar.Content
          title={group.name}
          titleStyle={{ color: "#F9FAFB" }}
          subtitle={`${group.memberCount} riders · ${group.level}`}
        />

        <Appbar.Action icon="map-outline" color="#F9FAFB" onPress={() => router.push(`/group/${groupId}/map`)} />

        {showMenu ? (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<Appbar.Action icon="dots-vertical" color="#F9FAFB" onPress={() => setMenuVisible(true)} />}
          >
            {showDisband ? <Menu.Item onPress={() => setConfirmDisband(true)} title="Disband group" leadingIcon="delete-outline" /> : null}
            {showLeave ? <Menu.Item onPress={() => setConfirmLeave(true)} title="Leave group" leadingIcon="logout" /> : null}
          </Menu>
        ) : null}
      </Appbar.Header>

      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Members</Text>

        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.7}>
              <View style={styles.memberRow}>
                <View style={styles.avatarWrap}>
                  <Avatar.Text
                    size={40}
                    label={(item.displayName || "?")[0].toUpperCase()}
                    style={{ backgroundColor: "#F97316" }}
                  />
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: item.status === "online" ? "#22C55E" : "#4B5563" },
                    ]}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{item.displayName || "Member"}</Text>
                  <Text style={styles.memberMeta}>{item.role === "leader" ? "Leader" : "Member"}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      <Portal>
        <Dialog visible={confirmLeave} onDismiss={() => setConfirmLeave(false)}>
          <Dialog.Title>Leave group?</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setConfirmLeave(false)} disabled={busy}>Cancel</Button>
            <Button onPress={doLeave} loading={busy} disabled={busy}>Leave</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={confirmDisband} onDismiss={() => setConfirmDisband(false)}>
          <Dialog.Title>Disband group?</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDisband(false)} disabled={busy}>Cancel</Button>
            <Button onPress={doDisband} loading={busy} disabled={busy}>Disband</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  center: { flex: 1, backgroundColor: "#020617", justifyContent: "center", alignItems: "center" },
  content: { flex: 1, padding: 16, gap: 12 },
  sectionTitle: { color: "#F9FAFB", marginBottom: 8 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#0B1120", padding: 10, borderRadius: 14 },
  avatarWrap: { position: "relative" },
  statusDot: { position: "absolute", bottom: 2, right: 2, width: 10, height: 10, borderRadius: 999, borderWidth: 1, borderColor: "#020617" },
  memberName: { color: "#F9FAFB" },
  memberMeta: { color: "#9CA3AF", fontSize: 12 },
});
