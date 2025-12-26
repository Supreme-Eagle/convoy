import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, Card, Text, Avatar, IconButton, FAB, Portal, Button, Badge } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native'; // <--- KEY IMPORT
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '../../src/firebase';
import { useAuth } from '../../src/auth/AuthProvider';

// --- DUMMY DATA FOR UI ---
const SUGGESTED_PEOPLE = [
  { id: '1', name: 'Floris Van Tricht', label: 'Fan favorite', img: 'https://i.pravatar.cc/150?u=1' },
  { id: '2', name: 'Manuel Merillas', label: 'Pro Cyclist', img: 'https://i.pravatar.cc/150?u=2' },
  { id: '3', name: 'Sarah Strong', label: 'Local Guide', img: 'https://i.pravatar.cc/150?u=3' },
];

const MOCK_FEED = [
  {
    id: '101',
    author: { name: 'Frederic Funk', photoUrl: 'https://i.pravatar.cc/150?u=4' },
    createdAt: { seconds: Date.now() / 1000 },
    content: 'Morning loop around the city. Legs felt good!',
    stats: { dist: '24.5 km', elev: '150 m', time: '1h 20m' },
    imageUrl: 'https://maps.googleapis.com/maps/api/staticmap?center=19.0760,72.8777&zoom=12&size=600x300&maptype=roadmap&key=YOUR_KEY_HERE' 
  },
  {
    id: '102',
    author: { name: 'You', photoUrl: 'https://i.pravatar.cc/150?u=5' },
    createdAt: { seconds: (Date.now() / 1000) - 86400 },
    content: 'Testing the new Convoy app features.',
    stats: { dist: '12.0 km', elev: '50 m', time: '45m' },
    imageUrl: null
  }
];

export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused(); // <--- TRUE ONLY WHEN ON HOME TAB
  const { user } = useAuth();
  const [fabOpen, setFabOpen] = useState(false);
  const [items, setItems] = useState<any[]>(MOCK_FEED);

  // --- RENDERERS ---

  const renderSuggestedPerson = ({ item }: any) => (
    <Card style={s.suggestedCard}>
      <View style={{ alignItems: 'center', padding: 10 }}>
        <View>
          <Avatar.Image size={60} source={{ uri: item.img }} />
          <Badge size={16} style={s.verifiedBadge}>✓</Badge>
        </View>
        <Text style={s.suggestedName} numberOfLines={1}>{item.name}</Text>
        <Text style={s.suggestedLabel}>{item.label}</Text>
        <Button mode="contained" compact style={s.followBtn} labelStyle={{fontSize: 10, lineHeight: 12}}>Follow</Button>
      </View>
    </Card>
  );

  const renderFeedItem = ({ item }: any) => (
    <View style={s.feedContainer}>
      <View style={s.feedHeader}>
        <Avatar.Image size={40} source={{ uri: item.author?.photoUrl }} />
        <View style={{ marginLeft: 10 }}>
          <Text style={s.feedAuthor}>{item.author?.name || 'Rider'} <Badge size={14} style={s.proBadge}>PRO</Badge></Text>
          <Text style={s.feedTime}>Yesterday • Mumbai, IN</Text>
        </View>
        <IconButton icon="dots-horizontal" iconColor="#aaa" style={{marginLeft: 'auto'}} />
      </View>

      <Text style={s.feedContent}>{item.content}</Text>

      <View style={s.statsRow}>
        <View>
          <Text style={s.statLabel}>Distance</Text>
          <Text style={s.statValue}>{item.stats?.dist || '0 km'}</Text>
        </View>
        <View>
          <Text style={s.statLabel}>Elev Gain</Text>
          <Text style={s.statValue}>{item.stats?.elev || '0 m'}</Text>
        </View>
        <View>
          <Text style={s.statLabel}>Time</Text>
          <Text style={s.statValue}>{item.stats?.time || '0m'}</Text>
        </View>
      </View>

      {/* Map / Image Placeholder */}
      <View style={s.mapPlaceholder}>
         <IconButton icon="map-marker-path" size={40} iconColor="#555" />
         <Text style={{color:'#555'}}>Map Snapshot</Text>
      </View>

      {/* Actions */}
      <View style={s.actionRow}>
        <IconButton icon="thumb-up-outline" iconColor="#aaa" />
        <IconButton icon="comment-outline" iconColor="#aaa" />
        <IconButton icon="share-variant-outline" iconColor="#aaa" style={{marginLeft: 'auto'}} />
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <Appbar.Header style={s.header}>
        <Appbar.Content title="Home" titleStyle={{fontWeight:'bold', fontSize: 24}} />
        <Appbar.Action icon="magnify" onPress={() => {}} />
        <Appbar.Action icon="bell-outline" onPress={() => {}} />
        <Avatar.Image size={30} source={{uri: user?.photoURL}} style={{marginRight: 10}} />
      </Appbar.Header>

      <FlatList
        data={items}
        renderItem={renderFeedItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <>
             {/* Streak Card */}
             <Card style={s.streakCard}>
               <View style={{flexDirection:'row', alignItems:'center'}}>
                 <View style={{backgroundColor:'rgba(249, 115, 22, 0.2)', padding:10, borderRadius:50}}>
                    <IconButton icon="fire" iconColor="#F97316" size={24} style={{margin:0}} />
                 </View>
                 <View style={{marginLeft: 15}}>
                   <Text style={{color:'#fff', fontWeight:'bold', fontSize:16}}>Start your streak</Text>
                   <Text style={{color:'#aaa', fontSize:12}}>Subscribe to track your progress</Text>
                 </View>
                 <Button mode="text" textColor="#F97316" style={{marginLeft:'auto'}}>Subscribe</Button>
               </View>
             </Card>

             {/* Who to follow */}
             <View style={s.sectionHeader}>
               <Text style={s.sectionTitle}>Who to follow</Text>
               <Text style={s.seeAll}>See All</Text>
             </View>
             <FlatList 
               horizontal 
               data={SUGGESTED_PEOPLE} 
               renderItem={renderSuggestedPerson} 
               showsHorizontalScrollIndicator={false}
               style={{marginBottom: 20}}
               contentContainerStyle={{paddingLeft: 15}}
             />
             
             <Text style={[s.sectionTitle, {marginLeft: 15, marginBottom: 10}]}>Recent Activity</Text>
          </>
        }
      />

      {/* FAB: ONLY RENDER IF FOCUSED */}
      {isFocused && (
        <Portal>
          <FAB.Group
            open={fabOpen}
            visible
            icon={fabOpen ? 'close' : 'plus'}
            actions={[
              { icon: 'calendar-plus', label: 'Create Event', onPress: () => console.log('Create Event') },
              { icon: 'map-marker-path', label: 'Record Activity', onPress: () => router.push('/(tabs)/record') },
              { icon: 'pencil', label: 'Post', onPress: () => console.log('Post') },
            ]}
            onStateChange={({ open }) => setFabOpen(open)}
            fabStyle={{ backgroundColor: '#F97316' }} 
            color="white"
          />
        </Portal>
      )}

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { backgroundColor: '#000' },
  streakCard: { backgroundColor: '#1c1c1e', margin: 15, padding: 10, borderRadius: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, marginBottom: 10 },
  sectionTitle: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  seeAll: { color: '#F97316', fontWeight: 'bold' },
  suggestedCard: { backgroundColor: '#1c1c1e', marginRight: 10, width: 140, borderRadius: 12 },
  suggestedName: { color: '#fff', fontWeight: 'bold', marginTop: 5, fontSize: 13 },
  suggestedLabel: { color: '#aaa', fontSize: 11, marginBottom: 10 },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#F97316' },
  followBtn: { backgroundColor: '#F97316', width: '100%', height: 30, marginTop: 5 },
  
  feedContainer: { backgroundColor: '#000', marginBottom: 20 },
  feedHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginBottom: 10 },
  feedAuthor: { color: '#fff', fontWeight: 'bold' },
  proBadge: { backgroundColor: '#F97316', color: '#fff', fontSize: 10 },
  feedTime: { color: '#aaa', fontSize: 12 },
  feedContent: { color: '#fff', paddingHorizontal: 15, marginBottom: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, marginBottom: 15, maxWidth: 300 },
  statLabel: { color: '#aaa', fontSize: 11 },
  statValue: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  mapPlaceholder: { height: 200, backgroundColor: '#1c1c1e', marginHorizontal: 15, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  actionRow: { flexDirection: 'row', paddingHorizontal: 5, marginTop: 5 },
});
