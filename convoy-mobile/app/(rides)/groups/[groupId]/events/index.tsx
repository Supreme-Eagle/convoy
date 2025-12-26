import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, FAB, Text, Card, Button } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../../src/firebase';

export default function EventsList() {
  const { groupId } = useLocalSearchParams();
  const router = useRouter();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, 'groups', groupId as string, 'events'),
      orderBy('date', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [groupId]);

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={i => i.id}
        renderItem={({ item }: any) => (
          <Card style={styles.card} onPress={() => router.push(`/(rides)/groups/${groupId}/events/${item.id}/live`)}>
            <Card.Title title={item.title} subtitle={new Date(item.date?.seconds * 1000).toDateString()} />
            <Card.Actions>
              <Button>Join Convoy</Button>
            </Card.Actions>
          </Card>
        )}
        ListEmptyComponent={<Text style={{padding: 20, textAlign: 'center'}}>No upcoming rides.</Text>}
      />
      <FAB
        icon="plus"
        label="Schedule Ride"
        style={styles.fab}
        onPress={() => router.push(`/(rides)/groups/${groupId}/events/create`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { margin: 10 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});
