import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Modal, FlatList } from 'react-native';
import { Card, Text, Button, Avatar, IconButton, Divider, TextInput, Chip, List } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot, collection, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '../../../../../../src/firebase';

export default function EventDetails() {
  const { groupId, eventId } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [hasLiked, setHasLiked] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);

  const userId = auth.currentUser?.uid;
  const isLeader = event?.leaderId === userId; // Assuming creator is leader for now

  // 1. Fetch Event & Check Like Status
  useEffect(() => {
    const unsubEvent = onSnapshot(doc(db, 'groups', groupId as string, 'events', eventId as string), (docSnap) => {
      if (docSnap.exists()) setEvent({ id: docSnap.id, ...docSnap.data() });
    });

    const checkLike = async () => {
      if (!userId) return;
      // Check if I liked it (can use subcollection or array - subcollection scales better)
      // For simplicity/speed here, we assume subcollection 'likes'
      // This part is simplified; in production, use a listener if you want real-time like updates
    };
    checkLike();

    return () => unsubEvent();
  }, [eventId]);

  // 2. Fetch Participants (Real-time for Tail selection)
  useEffect(() => {
    const q = collection(db, 'groups', groupId as string, 'events', eventId as string, 'participants');
    const unsub = onSnapshot(q, (snap) => {
      setParticipants(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });
    return unsub;
  }, [eventId]);

  // 3. Fetch Comments
  useEffect(() => {
    const q = query(collection(db, 'groups', groupId as string, 'events', eventId as string, 'comments'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [eventId]);

  const handleJoin = async () => {
    if (!userId) return;
    await setDoc(doc(db, 'groups', groupId as string, 'events', eventId as string, 'participants', userId), {
      name: auth.currentUser?.displayName || 'Rider',
      photoUrl: auth.currentUser?.photoURL,
      role: 'member', // Default role
      joinedAt: serverTimestamp()
    });
  };

  const handleLike = async () => {
    // Toggle like logic (simplified)
    setHasLiked(!hasLiked); 
    // In real app: write to 'likes' subcollection and increment counter via Cloud Function or transaction
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    await addDoc(collection(db, 'groups', groupId as string, 'events', eventId as string, 'comments'), {
      text: newComment,
      authorName: auth.currentUser?.displayName,
      authorPhoto: auth.currentUser?.photoURL,
      createdAt: serverTimestamp()
    });
    setNewComment('');
  };

  const assignRole = async (targetUid: string, role: 'tail' | 'member') => {
    await updateDoc(doc(db, 'groups', groupId as string, 'events', eventId as string, 'participants', targetUid), { role });
    setRoleModalVisible(false);
  };

  if (!event) return <View><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* EVENT HEADER */}
        <Card style={styles.card}>
          <Card.Cover source={{ uri: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000' }} />
          <Card.Title 
            title={event.title} 
            subtitle={`${new Date(event.date?.seconds * 1000).toLocaleString()} • ${participants.length} Riders`} 
          />
          <Card.Content>
            <View style={styles.chipRow}>
              {participants.find(p => p.role === 'tail') && (
                <Chip icon="flag-checkered" style={styles.chip}>Tail Assigned</Chip>
              )}
            </View>
            <Button mode="contained" onPress={() => router.push(`/(rides)/groups/${groupId}/events/${eventId}/live`)} style={{marginTop: 10}}>
              OPEN LIVE MAP
            </Button>
            {!participants.find(p => p.uid === userId) && (
              <Button mode="outlined" onPress={handleJoin} style={{marginTop: 10}}>
                JOIN RIDE
              </Button>
            )}
            
            {/* Leader Tools */}
            {isLeader && (
              <Button icon="account-cog" onPress={() => setRoleModalVisible(true)}>Manage Roles</Button>
            )}
          </Card.Content>
          <Card.Actions>
            <IconButton icon={hasLiked ? "heart" : "heart-outline"} color={hasLiked ? "red" : "gray"} onPress={handleLike} />
            <IconButton icon="comment-outline" />
            <IconButton icon="share-variant" />
          </Card.Actions>
        </Card>

        {/* COMMENTS SECTION */}
        <View style={styles.commentsSection}>
          <Text variant="titleMedium" style={{marginBottom: 10}}>Discussion</Text>
          <View style={styles.inputRow}>
            <TextInput 
              placeholder="Ask a question..." 
              value={newComment} 
              onChangeText={setNewComment} 
              style={{flex: 1, height: 40}} 
              mode="outlined"
            />
            <IconButton icon="send" onPress={handlePostComment} />
          </View>
          
          {comments.map(c => (
            <View key={c.id} style={styles.commentItem}>
              <Avatar.Image size={30} source={{ uri: c.authorPhoto }} />
              <View style={{marginLeft: 10}}>
                <Text style={{fontWeight: 'bold', fontSize: 12}}>{c.authorName}</Text>
                <Text variant="bodyMedium">{c.text}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* ROLE ASSIGNMENT MODAL (Leader Only) */}
      <Modal visible={roleModalVisible} animationType="slide" onRequestClose={() => setRoleModalVisible(false)}>
        <View style={styles.modal}>
          <Text variant="headlineSmall" style={{marginBottom: 20}}>Assign Tail / Sweeper</Text>
          <FlatList
            data={participants}
            keyExtractor={item => item.uid}
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                description={item.role === 'tail' ? 'Currently Tail' : 'Member'}
                left={props => <Avatar.Image {...props} size={40} source={{ uri: item.photoUrl }} />}
                right={props => (
                  <Button onPress={() => assignRole(item.uid, item.role === 'tail' ? 'member' : 'tail')}>
                    {item.role === 'tail' ? 'Remove Tail' : 'Make Tail'}
                  </Button>
                )}
              />
            )}
          />
          <Button onPress={() => setRoleModalVisible(false)}>Close</Button>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { paddingBottom: 40 },
  card: { marginBottom: 10 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip: { backgroundColor: '#e3f2fd' },
  commentsSection: { padding: 16, backgroundColor: 'white' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  commentItem: { flexDirection: 'row', marginBottom: 12 },
  modal: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: 'white' }
});
