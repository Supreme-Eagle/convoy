set -euo pipefail
cd /workspaces/convoy/convoy-mobile

TS="$(date +%Y%m%d_%H%M%S)"
PATCH="/tmp/convoy_patch_$TS"
mkdir -p "$PATCH"
for f in \
  src/location/LocationTracker.tsx \
  src/data/userProfile.ts \
  app/'(tabs)'/rides/index.tsx \
  app/'(tabs)'/profile/index.tsx
do
  [ -f "$f" ] && mkdir -p "$PATCH/$(dirname "$f")" && cp "$f" "$PATCH/$f"
done
echo "Backup: $PATCH"

mkdir -p src/data app/'(tabs)'/rides/'[id]'

# --- userProfile: add setting + setter ---
cat > src/data/userProfile.ts <<'EOF'
import { db } from "../firebase";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

export type UserProfile = {
  uid: string;
  displayName: string;
  onboardingCompleted: boolean;
  termsAcceptedAt?: any;
  locationPermission?: "granted" | "denied" | "unknown";
  settings?: {
    locationSharingEnabled?: boolean;
  };
  emergencyName?: string;
  emergencyPhone?: string;
  bloodGroup?: string;
  createdAt?: any;
  updatedAt?: any;
};

export async function ensureUserProfile(uid: string, displayName: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      displayName,
      onboardingCompleted: false,
      locationPermission: "unknown",
      settings: { locationSharingEnabled: true },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as UserProfile);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function completeOnboarding(uid: string) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    onboardingCompleted: true,
    termsAcceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function setEmergencyDetails(uid: string, patch: Partial<UserProfile>) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

export async function setLocationPermission(uid: string, status: "granted" | "denied") {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { locationPermission: status, updatedAt: serverTimestamp() });
}

export async function setLocationSharingEnabled(uid: string, enabled: boolean) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    settings: { locationSharingEnabled: enabled },
    updatedAt: serverTimestamp(),
  });
}
EOF

# --- groups data layer (keeps "my groups" under users/{uid}/groups for easy listing) ---
cat > src/data/groups.ts <<'EOF'
import { auth, db } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

export type GroupDoc = {
  name: string;
  city: string;
  isPublic: boolean;
  createdBy: string;
  createdAt?: any;
};

export type GroupMemberDoc = {
  uid: string;
  role: "owner" | "member";
  joinedAt?: any;
};

export type GroupRequestDoc = {
  uid: string;
  status: "pending";
  requestedAt?: any;
};

export async function createGroup(name: string, city: string, isPublic: boolean) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const gref = await addDoc(collection(db, "groups"), {
    name: name.trim(),
    city: city.trim(),
    isPublic,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  } as GroupDoc);

  const batch = writeBatch(db);

  batch.set(doc(db, "groups", gref.id, "members", user.uid), {
    uid: user.uid,
    role: "owner",
    joinedAt: serverTimestamp(),
  } as GroupMemberDoc);

  batch.set(doc(db, "users", user.uid, "groups", gref.id), {
    groupId: gref.id,
    name: name.trim(),
    city: city.trim(),
    isPublic,
    role: "owner",
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return gref.id;
}

export function subscribeMyGroups(uid: string, cb: (rows: any[]) => void) {
  const q = query(collection(db, "users", uid, "groups"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
}

export function subscribeGroup(groupId: string, cb: (g: any | null) => void) {
  return onSnapshot(doc(db, "groups", groupId), (snap) => cb(snap.exists() ? { id: snap.id, ...(snap.data() as any) } : null));
}

export function subscribeMembers(groupId: string, cb: (rows: Array<{ id: string } & GroupMemberDoc>) => void) {
  const q = query(collection(db, "groups", groupId, "members"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as GroupMemberDoc) }))));
}

export function subscribeRequests(groupId: string, cb: (rows: Array<{ id: string } & GroupRequestDoc>) => void) {
  const q = query(collection(db, "groups", groupId, "requests"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as GroupRequestDoc) }))));
}

export async function requestToJoin(groupId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  await setDoc(doc(db, "groups", groupId, "requests", user.uid), {
    uid: user.uid,
    status: "pending",
    requestedAt: serverTimestamp(),
  } as GroupRequestDoc);
}

export async function joinPublicGroup(groupId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const g = await getDoc(doc(db, "groups", groupId));
  if (!g.exists()) throw new Error("Group not found");
  const data = g.data() as GroupDoc;
  if (!data.isPublic) throw new Error("Group is private, request to join");

  const batch = writeBatch(db);
  batch.set(doc(db, "groups", groupId, "members", user.uid), {
    uid: user.uid,
    role: "member",
    joinedAt: serverTimestamp(),
  } as GroupMemberDoc);

  batch.set(doc(db, "users", user.uid, "groups", groupId), {
    groupId,
    name: data.name,
    city: data.city,
    isPublic: data.isPublic,
    role: "member",
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function approveRequest(groupId: string, requesterUid: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const ownerSnap = await getDoc(doc(db, "groups", groupId, "members", user.uid));
  if (!ownerSnap.exists() || (ownerSnap.data() as GroupMemberDoc).role !== "owner") {
    throw new Error("Only owner can approve");
  }

  const g = await getDoc(doc(db, "groups", groupId));
  if (!g.exists()) throw new Error("Group not found");
  const data = g.data() as GroupDoc;

  const batch = writeBatch(db);
  batch.set(doc(db, "groups", groupId, "members", requesterUid), {
    uid: requesterUid,
    role: "member",
    joinedAt: serverTimestamp(),
  } as GroupMemberDoc);

  batch.set(doc(db, "users", requesterUid, "groups", groupId), {
    groupId,
    name: data.name,
    city: data.city,
    isPublic: data.isPublic,
    role: "member",
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  batch.delete(doc(db, "groups", groupId, "requests", requesterUid));
  await batch.commit();
}

export async function leaveGroup(groupId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const batch = writeBatch(db);
  batch.delete(doc(db, "groups", groupId, "members", user.uid));
  batch.delete(doc(db, "users", user.uid, "groups", groupId));
  await batch.commit();
}

export async function setGroupName(groupId: string, name: string) {
  await updateDoc(doc(db, "groups", groupId), { name: name.trim() });
}
EOF

# --- tracker: honor profile settings.locationSharingEnabled ---
cat > src/location/LocationTracker.tsx <<'EOF'
import React, { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import { geohashForLocation } from "geofire-common";

export function LocationTracker() {
  const { user } = useAuth();
  const locSub = useRef<Location.LocationSubscription | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const d: any = snap.data();
      const v = d?.settings?.locationSharingEnabled;
      setEnabled(v !== false); // default ON
    });
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    let alive = true;

    async function stop() {
      locSub.current?.remove();
      locSub.current = null;
    }

    async function start() {
      if (!user) return;

      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== "granted") return;

      await stop();
      locSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
        async (pos) => {
          if (!alive) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const geohash = geohashForLocation([lat, lng]);
          await updateDoc(doc(db, "users", user.uid), {
            lastLocation: { lat, lng, geohash, updatedAt: serverTimestamp() },
            updatedAt: serverTimestamp(),
          });
        }
      );
    }

    if (enabled) start();
    else stop();

    return () => {
      alive = false;
      stop();
    };
  }, [user?.uid, enabled]);

  return null;
}
EOF

# --- rides tab: groups UI ---
cat > app/'(tabs)'/rides/_layout.tsx <<'EOF'
import React from "react";
import { Stack } from "expo-router";

export default function RidesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#050B18" },
        headerTintColor: "white",
      }}
    />
  );
}
EOF

cat > app/'(tabs)'/rides/index.tsx <<'EOF'
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
EOF

cat > app/'(tabs)'/rides/create.tsx <<'EOF'
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
EOF

cat > app/'(tabs)'/rides/'[id]'.tsx <<'EOF'
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
EOF

cat > app/'(tabs)'/rides/'[id]'/members.tsx <<'EOF'
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
EOF

# --- Profile: add toggle for location sharing ---
cat > app/'(tabs)'/profile/index.tsx <<'EOF'
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
EOF

rm -rf .expo node_modules/.cache
npx expo start --tunnel --clear
