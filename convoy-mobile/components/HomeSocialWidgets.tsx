import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Card, Text, Avatar, Badge, Button, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../src/firebase';

export default function HomeSocialWidgets({ groupId = 'global_riders' }) {
  const router = useRouter();
  const theme = useTheme();
  const [latestPost, setLatestPost] = useState<any>(null);
  const [nextEvent, setNextEvent] = useState<any>(null);

  useEffect(() => {
    // 1. Get Latest Post
    const qPost = query(collection(db, 'groups', groupId, 'posts'), orderBy('createdAt', 'desc'), limit(1));
    const unsubPost = onSnapshot(qPost, (snap) => {
      if (!snap.empty) setLatestPost(snap.docs[0].data());
    });

    // 2. Get Next Upcoming Event
    const qEvent = query(collection(db, 'groups', groupId, 'events'), where('date', '>=', new Date()), orderBy('date', 'asc'), limit(1));
    const unsubEvent = onSnapshot(qEvent, (snap) => {
      if (!snap.empty) setNextEvent({ id: snap.docs[0].id, ...snap.docs[0].data() });
    });

    return () => { unsubPost(); unsubEvent(); };
  }, []);

  return (
    <View style={styles.container}>
      
      {/* WIDGET 1: Active Convoy (Only shows if an event is today) */}
      {nextEvent && new Date(nextEvent.date?.seconds * 1000).toDateString() === new Date().toDateString() && (
        <Card style={[styles.card, styles.activeCard]} onPress={() => router.push(`/(rides)/groups/${groupId}/events/${nextEvent.id}/live`)}>
          <Card.Content style={styles.row}>
            <Avatar.Icon size={40} icon="motorbike" style={{ backgroundColor: '#fff' }} />
            <View style={styles.textCol}>
              <Text variant="titleSmall" style={{ color: '#fff', fontWeight: 'bold' }}>RIDE HAPPENING NOW</Text>
              <Text variant="bodySmall" style={{ color: '#fff' }}>Tap to join the pack!</Text>
            </View>
            <Badge style={{ backgroundColor: '#f44336' }}>LIVE</Badge>
          </Card.Content>
        </Card>
      )}

      {/* WIDGET 2: Social Paddock Teaser */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} onPress={() => router.push(`/(rides)/groups/${groupId}/feed`)}>
        <Card.Title 
          title="The Paddock" 
          subtitle="Latest community chatter" 
          right={(props) => <Button {...props} compact>View All</Button>} 
        />
        {latestPost ? (
          <Card.Content>
            <View style={styles.row}>
              <Avatar.Image size={30} source={{ uri: latestPost.author?.photoUrl }} />
              <Text style={[styles.postText, { color: theme.colors.onSurface }]} numberOfLines={2}>
                <Text style={{ fontWeight: 'bold' }}>{latestPost.author?.name}: </Text>
                {latestPost.content}
              </Text>
            </View>
          </Card.Content>
        ) : (
          <Card.Content><Text style={{ color: 'gray' }}>No posts yet. Be the first!</Text></Card.Content>
        )}
      </Card>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10, marginHorizontal: 12, marginTop: 10 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  activeCard: { backgroundColor: '#4CAF50' }, 
  row: { flexDirection: 'row', alignItems: 'center' },
  textCol: { flex: 1, marginLeft: 12 },
  postText: { flex: 1, marginLeft: 10, fontSize: 13 },
});
