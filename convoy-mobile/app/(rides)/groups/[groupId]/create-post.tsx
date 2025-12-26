import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Button, Appbar } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../../src/firebase';

export default function CreatePost() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'groups', groupId as string, 'posts'), {
        content,
        author: {
          uid: auth.currentUser?.uid,
          name: auth.currentUser?.displayName || 'Rider',
          photoUrl: auth.currentUser?.photoURL,
        },
        createdAt: serverTimestamp(),
        type: 'status'
      });
      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="New Post" />
        <Appbar.Action icon="send" onPress={handlePost} disabled={loading || !content} />
      </Appbar.Header>
      <TextInput
        style={styles.input}
        placeholder="Share your ride, gear update, or thoughts..."
        multiline
        value={content}
        onChangeText={setContent}
        autoFocus
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  input: { flex: 1, padding: 16, fontSize: 16, textAlignVertical: 'top' },
});
