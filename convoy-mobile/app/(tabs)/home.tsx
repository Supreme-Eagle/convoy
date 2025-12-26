import React, { useEffect, useState, useRef } from "react";
import { View, FlatList, StyleSheet, TouchableOpacity, ScrollView, Image, RefreshControl } from "react-native";
import { Appbar, Card, Text, Avatar, Button, IconButton, FAB } from "react-native-paper";
import { useRouter } from "expo-router";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../src/firebase";
import { useAuth } from "../../src/auth/AuthProvider";
import { Ionicons } from "@expo/vector-icons";

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth(); // Auth state
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useRef(true);

  // Mock Suggested Users
  const suggestedUsers = [
    { id: '1', name: 'Adriana Moser', label: 'Fan favorite', img: 'https://i.pravatar.cc/100?img=1' },
    { id: '2', name: 'David T', label: 'Pro Cyclist', img: 'https://i.pravatar.cc/100?img=3' },
    { id: '3', name: 'Sarah L', label: 'Runner', img: 'https://i.pravatar.cc/100?img=5' },
  ];

  const loadFeed = async () => {
    // 1. STOP if no user (Logout scenario)
    if (!user) return; 

    try {
      if (isMounted.current) setRefreshing(true);
      
      const q = query(collection(db, "activities"), orderBy("createdAt", "desc"), limit(20));
      const snap = await getDocs(q);

      // 2. STOP if user logged out WHILE we were fetching
      if (!user || !isMounted.current) return;

      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(data);
    } catch (e: any) {
      // 3. SILENCE permission errors on logout (Expected behavior)
      if (e.code === 'permission-denied' && !user) {
         console.log("Feed fetch aborted due to logout.");
         return;
      }
      console.log("Feed error:", e);
    } finally {
      if (isMounted.current) setRefreshing(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    if (user) loadFeed();
    
    return () => {
      isMounted.current = false; // Cleanup on unmount/logout
    };
  }, [user]);

  const renderSuggested = () => (
    <View style={s.section}>
      <View style={s.rowBetween}>
        <Text style={s.sectionTitle}>Who to Follow</Text>
        <Text style={{color: "#F97316", fontWeight: "bold"}}>See All</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{paddingVertical: 10}}>
        {suggestedUsers.map((u) => (
          <Card key={u.id} style={s.suggestedCard}>
             <View style={{alignItems: "center", padding: 10}}>
                <Avatar.Image size={60} source={{uri: u.img}} style={{marginBottom: 10}} />
                <Text style={{fontWeight: "bold", fontSize: 16}}>{u.name}</Text>
                <Text style={{color: "gray", fontSize: 12, marginBottom: 10}}>{u.label}</Text>
                <Button mode="contained" buttonColor="#F97316" compact style={{width: "100%"}}>Follow</Button>
             </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );

  const renderStreak = () => (
    <View style={s.streakCard}>
       <View style={s.iconCircle}>
          <Ionicons name="flame" size={24} color="#F97316" />
       </View>
       <View style={{flex: 1, marginLeft: 15}}>
          <Text style={{fontWeight: "bold", fontSize: 16, color: "white"}}>Start your Streak</Text>
          <Text style={{color: "#bbb", fontSize: 13}}>There's nothing like the satisfaction of an epic Streak.</Text>
       </View>
    </View>
  );

  const renderItem = ({ item }: any) => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/(tabs)/activity/${item.id}`)}>
      <Card style={s.feedCard}>
        <View style={s.cardHeader}>
           <Avatar.Image size={40} source={{uri: item.userPhoto || "https://i.pravatar.cc/100"}} />
           <View style={{marginLeft: 10, flex: 1}}>
              <Text style={{fontWeight: "bold", fontSize: 16}}>{item.createdBy || "Athlete"}</Text>
              <Text style={{color: "gray", fontSize: 12}}>
                 {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : "Just now"} • {item.location || "Mumbai"}
              </Text>
           </View>
           <Ionicons name="ellipsis-horizontal" size={20} color="gray" />
        </View>

        <Card.Content>
           <Text style={s.activityTitle}>{item.name || "Morning Activity"}</Text>
           <View style={s.statsRow}>
              <View>
                 <Text style={s.statLabel}>Distance</Text>
                 <Text style={s.statValue}>{item.distance?.toFixed(2) || "0.00"} km</Text>
              </View>
              <View>
                 <Text style={s.statLabel}>Elev Gain</Text>
                 <Text style={s.statValue}>{item.elevation || "0"} m</Text>
              </View>
              <View>
                 <Text style={s.statLabel}>Time</Text>
                 <Text style={s.statValue}>{item.duration || "0h 0m"}</Text>
              </View>
           </View>
        </Card.Content>

        <Image 
          source={{ uri: "https://maps.googleapis.com/maps/api/staticmap?center=19.0760,72.8777&zoom=13&size=600x300&maptype=roadmap&style=feature:all|element:labels|visibility:off&key=YOUR_KEY" }} 
          style={s.mapImage} 
        />

        <View style={s.actionRow}>
           <View style={{flexDirection: "row", alignItems: "center"}}>
              <IconButton icon="thumb-up-outline" iconColor="gray" size={20} />
              <Text style={{color: "gray"}}>{item.likes || 0}</Text>
           </View>
           <View style={{flexDirection: "row", alignItems: "center", marginLeft: 20}}>
              <IconButton icon="comment-outline" iconColor="gray" size={20} />
              <Text style={{color: "gray"}}>{item.comments || 0}</Text>
           </View>
           <View style={{flex: 1, alignItems: "flex-end"}}>
              <IconButton icon="share-variant-outline" iconColor="gray" size={20} />
           </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <Appbar.Header style={{backgroundColor: "#111", elevation: 0}}>
         <Appbar.Content title="Home" titleStyle={{fontWeight: "bold", color: "white", fontSize: 24}} />
         <Appbar.Action icon="magnify" color="white" onPress={() => {}} />
         <Appbar.Action icon="bell-outline" color="white" onPress={() => {}} />
         <TouchableOpacity style={{marginRight: 10}}>
            <Avatar.Text size={30} label={(user?.email?.[0] || "U").toUpperCase()} style={{backgroundColor: "#F97316"}} />
         </TouchableOpacity>
      </Appbar.Header>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={i => i.id}
        ListHeaderComponent={
          <View>
             {renderStreak()}
             {renderSuggested()}
             <Text style={s.feedLabel}>Recent Activities</Text>
          </View>
        }
        contentContainerStyle={{paddingBottom: 80}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadFeed} colors={["#F97316"]} />}
        style={{backgroundColor: "black"}}
      />

      <FAB
        icon="plus"
        style={s.fab}
        color="white"
        onPress={() => router.push("/(tabs)/record")}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  section: { padding: 15 },
  sectionTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  streakCard: { backgroundColor: "#1c1c1e", margin: 15, padding: 15, borderRadius: 10, flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#333", justifyContent: "center", alignItems: "center" },
  suggestedCard: { backgroundColor: "#1c1c1e", marginRight: 10, width: 140, borderRadius: 10 },
  feedLabel: { color: "white", fontSize: 18, fontWeight: "bold", marginLeft: 15, marginTop: 10, marginBottom: 10 },
  feedCard: { backgroundColor: "#111", marginBottom: 10, borderRadius: 0 },
  cardHeader: { flexDirection: "row", padding: 15, alignItems: "center" },
  activityTitle: { color: "white", fontSize: 20, fontWeight: "bold", marginBottom: 15 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", paddingRight: 40, marginBottom: 15 },
  statLabel: { color: "gray", fontSize: 12 },
  statValue: { color: "white", fontSize: 18, fontWeight: "bold" },
  mapImage: { width: "100%", height: 200 },
  actionRow: { flexDirection: "row", padding: 5, alignItems: "center" },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: "#F97316", borderRadius: 30 },
});
