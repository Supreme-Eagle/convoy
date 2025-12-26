#!/usr/bin/env bash
set -euo pipefail
cd /workspaces/convoy/convoy-mobile

# Dependencies:
# - expo-image-picker for selecting images [Expo SDK]
# - react-native-view-shot for optional masked capture [Expo supported]
# - masked-view for optional circular export
npx expo install expo-image-picker react-native-view-shot @react-native-masked-view/masked-view

mkdir -p src/hooks src/data app/settings

# 1) Firestore user-doc hook (single source of truth)
cat > src/hooks/useUserDoc.ts <<'EOF'
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export type UserDoc = {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  photoURL?: string;
  level?: string;
  goal?: string;
  gender?: string;
  birthday?: string;
  location?: {
    displayName?: string;
    lat?: number;
    lon?: number;
    city?: string;
    state?: string;
    country?: string;
  };
};

export function useUserDoc(uid?: string | null) {
  const [data, setData] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setData(null);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        setData((snap.data() as UserDoc) ?? null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [uid]);

  return { data, loading };
}
EOF

# 2) Nominatim autocomplete helper [web:691]
cat > src/data/locationSearch.ts <<'EOF'
export type LocationSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
};

export async function searchLocations(q: string): Promise<LocationSuggestion[]> {
  if (!q || q.trim().length < 2) return [];
  const url =
    "https://nominatim.openstreetmap.org/search" +
    "?format=json&addressdetails=1&limit=6" +
    "&q=" + encodeURIComponent(q.trim());

  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "Accept-Language": "en",
    },
  });

  if (!res.ok) return [];
  return (await res.json()) as LocationSuggestion[];
}
EOF

# 3) Personal Information screen (Settings > Personal Information)
# NOTE: You may need to adjust route path to match your existing settings layout.
cat > app/settings/personal-information.tsx <<'EOF'
import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Button, Text, TextInput, List } from "react-native-paper";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../src/firebase";
import { useAuth } from "../../src/auth/AuthProvider";
import { useUserDoc } from "../../src/hooks/useUserDoc";
import { searchLocations } from "../../src/data/locationSearch";

export default function PersonalInformationScreen() {
  const { user } = useAuth();
  const { data } = useUserDoc(user?.uid);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [locationText, setLocationText] = useState("");
  const [locResults, setLocResults] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setFirstName(data.firstName ?? "");
    setLastName(data.lastName ?? "");
    setLocationText(data.location?.displayName ?? "");
  }, [data]);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const r = await searchLocations(locationText);
      if (alive) setLocResults(r);
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [locationText]);

  const selectedLocation = useMemo(() => {
    // If locationText matches exactly a suggestion display_name, treat as selected
    return locResults.find(r => r.display_name === locationText);
  }, [locResults, locationText]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const displayName = `${firstName} ${lastName}`.trim();

      const loc = selectedLocation
        ? {
            displayName: selectedLocation.display_name,
            lat: Number(selectedLocation.lat),
            lon: Number(selectedLocation.lon),
            city: selectedLocation.address?.city || selectedLocation.address?.town || selectedLocation.address?.village,
            state: selectedLocation.address?.state,
            country: selectedLocation.address?.country,
          }
        : { displayName: locationText };

      await updateDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        displayName,
        location: loc,
        updatedAt: new Date(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.container}>
      <Text variant="titleLarge" style={s.title}>Personal information</Text>

      <TextInput label="First name" value={firstName} onChangeText={setFirstName} mode="outlined" style={s.input} />
      <TextInput label="Last name" value={lastName} onChangeText={setLastName} mode="outlined" style={s.input} />

      <TextInput
        label="Location"
        value={locationText}
        onChangeText={setLocationText}
        mode="outlined"
        style={s.input}
        placeholder="e.g. Pune"
      />

      {locResults.length > 0 && (
        <List.Section style={s.dropdown}>
          {locResults.map((r) => (
            <List.Item
              key={`${r.lat},${r.lon},${r.display_name}`}
              title={r.display_name}
              onPress={() => setLocationText(r.display_name)}
              titleNumberOfLines={2}
            />
          ))}
        </List.Section>
      )}

      <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={{ marginTop: 16 }}>
        Save
      </Button>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#000" },
  title: { color: "white", marginBottom: 16 },
  input: { marginBottom: 12, backgroundColor: "#111" },
  dropdown: { backgroundColor: "#111", borderRadius: 12, overflow: "hidden" },
});
EOF

echo "Done. Next: update Profile screen to read from Firestore via useUserDoc(), and update onboarding to collect photo + location."
echo "If you share your current Profile and Settings routes/filenames, the exact patch can be applied to your existing files."
