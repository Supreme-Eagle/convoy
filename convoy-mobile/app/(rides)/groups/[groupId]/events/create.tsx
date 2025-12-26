import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, Appbar, SegmentedButtons } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../../../src/firebase';
import SafeDatePicker from '../../../../../components/SafeDatePicker';

export default function CreateEvent() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams();
  
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [location, setLocation] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title || !location) return;
    setLoading(true);
    
    // Combine Date and Time
    const eventDate = new Date(date);
    eventDate.setHours(time.getHours());
    eventDate.setMinutes(time.getMinutes());

    try {
      const docRef = await addDoc(collection(db, 'groups', groupId as string, 'events'), {
        title,
        date: eventDate,
        location,
        privacy,
        leaderId: auth.currentUser?.uid,
        participants: [auth.currentUser?.uid], // Leader auto-joins
        createdAt: serverTimestamp()
      });

      // Auto-add leader to subcollection
      // (Ideally do this in a batch or cloud function, but this works for MVP)
      router.replace(`/(rides)/groups/${groupId}/events/${docRef.id}`);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Plan a Ride" />
      </Appbar.Header>
      
      <ScrollView contentContainerStyle={styles.scroll}>
        <TextInput
          label="Event Title (e.g. Sunday Morning Run)"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          mode="outlined"
        />
        
        <TextInput
          label="Start Location / Meeting Point"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          mode="outlined"
          left={<TextInput.Icon icon="map-marker" />}
        />

        <View style={styles.row}>
          <View style={{flex: 1, marginRight: 8}}>
            <SafeDatePicker label="Date" value={date} onChange={setDate} mode="date" />
          </View>
          <View style={{flex: 1, marginLeft: 8}}>
            <SafeDatePicker label="Time" value={time} onChange={setTime} mode="time" />
          </View>
        </View>

        <Text variant="titleMedium" style={{marginTop: 10, marginBottom: 10}}>Privacy</Text>
        <SegmentedButtons
          value={privacy}
          onValueChange={setPrivacy}
          buttons={[
            { value: 'public', label: 'Public', icon: 'earth' },
            { value: 'private', label: 'Members Only', icon: 'account-group' },
          ]}
          style={{marginBottom: 20}}
        />

        <Button 
          mode="contained" 
          onPress={handleCreate} 
          style={styles.btn} 
          loading={loading}
          disabled={loading || !title || !location}
        >
          Schedule Ride
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 16 },
  input: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  btn: { marginTop: 10, paddingVertical: 6 }
});
