import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../src/firebase'; 
import PostCard from '../../../../components/social/PostCard';

export default function GroupFeed() {
  const { groupId } = useLocalSearchParams();
  const router = useRouter();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (!groupId) return;
    const q = query(
      collection(db, 'groups', groupId as string, 'posts'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [groupId]);

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} author={item.author} />}
        contentContainerStyle={styles.list}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        label="New Post"
        onPress={() => router.push(`/(rides)/groups/${groupId}/create-post`)}
      />
      <FAB
        icon="bike"
        style={styles.rideFab}
        label="Events"
        onPress={() => router.push(`/(rides)/groups/${groupId}/events`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { paddingTop: 16 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
  rideFab: { position: 'absolute', margin: 16, right: 0, bottom: 70, backgroundColor: '#ff9800' },
});
