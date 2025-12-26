#!/usr/bin/env bash
set -euo pipefail
cd /workspaces/convoy/convoy-mobile

cat > "app/(tabs)/maps.tsx" <<'EOF'
import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { Appbar, Searchbar, SegmentedButtons, Card, Text, FAB, ActivityIndicator } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../src/firebase";
import RideMap from "../../src/components/RideMap"; // Re-use our safe map component

export default function MapsScreen() {
  const router = useRouter();
  const [scope, setScope] = useState("routes"); // 'routes' (created by users) | 'segments'
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Auto-refresh when tab is focused (e.g. returning from Create screen)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [scope])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      // In real Strava, 'segments' are different, but for MVP we store both in 'rides' with a type field
      // or just filter 'rides' that are actually Routes (type == 'Route')
      const targetType = scope === 'routes' ? 'Route' : 'Segment';
      
      // Fetch newest first
      const q = query(
        collection(db, "rides"), 
        where("type", "==", targetType),
        orderBy("createdAt", "desc")
      );
      
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(list);
    } catch (e) {
      console.log("Error loading maps:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.c}>
      <Appbar.Header style={{ backgroundColor: "#020617" }}>
        <Appbar.Content title="Maps" titleStyle={{ color: "#F9FAFB", fontWeight: "bold" }} />
      </Appbar.Header>

      <View style={{padding: 12}}>
        <Searchbar 
          placeholder="Search..." 
          value={search} 
          onChangeText={setSearch} 
          style={{backgroundColor: "#1E293B", color: "white"}} 
          inputStyle={{color: "white"}}
          iconColor="#94A3B8"
        />
        <SegmentedButtons
          value={scope}
          onValueChange={setScope}
          buttons={[
            { value: 'routes', label: 'My Routes', checkedColor: "white", style: {backgroundColor: scope==='routes'?'#F97316':'transparent'} },
            { value: 'segments', label: 'Segments', checkedColor: "white", style: {backgroundColor: scope==='segments'?'#F97316':'transparent'} },
          ]}
          style={{marginTop: 12}}
          theme={{colors: {secondaryContainer: "transparent"}}}
        />
      </View>

      <ScrollView contentContainerStyle={{padding: 12, paddingBottom: 80}}>
        {loading ? (
           <ActivityIndicator color="#F97316" style={{marginTop: 20}} />
        ) : (
           <>
             <Text variant="titleMedium" style={{color: "white", marginBottom: 10, fontWeight: "bold"}}>
               {items.length} {scope === 'routes' ? "Routes" : "Segments"} Found
             </Text>
             
             {items.map((item) => (
                <Card key={item.id} style={s.card} onPress={() => {}}>
                  <View style={{height: 120, overflow: 'hidden', borderTopLeftRadius: 12, borderTopRightRadius: 12}}>
                     {/* Preview Map (Lite Mode) */}
                     <RideMap path={item.path} initialRegion={null} liteMode={true} />
                  </View>
                  <Card.Title 
                     title={item.title || "Untitled Route"} 
                     subtitle={`${(item.stats?.distance || 0).toFixed(1)} km • Created by ${item.createdBy}`} 
                     titleStyle={{color: "white", fontWeight: "bold"}} 
                     subtitleStyle={{color: "#94A3B8"}} 
                     right={(props) => <FAB icon={scope==='routes'?"star-outline":"trophy-outline"} small style={{backgroundColor: "transparent", elevation: 0}} color="#F97316" onPress={()=>{}} />}
                  />
                </Card>
             ))}
             
             {items.length === 0 && !loading && (
                <Text style={{textAlign: "center", color: "#64748B", marginTop: 20}}>
                   No {scope} found. Tap + to create one.
                </Text>
             )}
           </>
        )}
      </ScrollView>
      
      {/* FAB to Open Route Builder */}
      <FAB
         icon="plus"
         label="New Route"
         style={s.fab}
         color="white"
         onPress={() => router.push("/(tabs)/maps/create")}
      />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: "#020617" },
  card: { marginBottom: 12, backgroundColor: "#0B1120", borderRadius: 12 },
  fab: { position: "absolute", margin: 16, right: 0, bottom: 0, backgroundColor: "#F97316" }
});
EOF

rm -rf .expo node_modules/.cache
echo "Done. Maps list fixed. Run: npx expo start --tunnel --clear"
