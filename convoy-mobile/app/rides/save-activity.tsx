import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, Appbar, List, Divider } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../src/firebase';

export default function SaveActivity() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [visibility, setVisibility] = useState('everyone');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'groups', 'global_riders', 'posts'), {
        author: {
          uid: auth.currentUser?.uid,
          name: auth.currentUser?.displayName || 'Rider',
          photoUrl: auth.currentUser?.photoURL
        },
        title: title || 'New Activity',
        content: desc,
        stats: {
          dist: params.dist || '0 km',
          time: params.time || '0m',
          elev: '0 m'
        },
        imageUrl: 'https://maps.googleapis.com/maps/api/staticmap?center=19.0760,72.8777&zoom=13&size=600x300&maptype=roadmap&key=YOUR_KEY',
        visibility,
        createdAt: serverTimestamp(),
        type: 'activity'
      });
      router.replace('/(tabs)/home'); // Go back home after posting
    } catch (e) {
      console.error(e);
      alert('Error saving activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <Appbar.Header style={{backgroundColor: '#000'}}>
        <Appbar.BackAction onPress={() => router.back()} iconColor="#fff" />
        <Appbar.Content title="Save Activity" titleStyle={{color:'#fff', fontWeight:'bold'}} />
        <Button mode="text" labelStyle={{color: '#F97316', fontWeight:'bold'}} onPress={handleSave} loading={loading}>Save</Button>
      </Appbar.Header>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
        <ScrollView contentContainerStyle={s.scroll}>
          <TextInput 
            label="Title your run" 
            value={title} 
            onChangeText={setTitle} 
            style={s.input} 
            mode="outlined" 
            theme={{colors:{primary:'#F97316', background:'#1c1c1e', onSurface:'#fff', outline:'#333'}}}
            textColor="#fff"
          />
          
          <TextInput 
            label="How'd it go?" 
            value={desc} 
            onChangeText={setDesc} 
            style={[s.input, {height: 80}]} 
            mode="outlined" 
            multiline
            theme={{colors:{primary:'#F97316', background:'#1c1c1e', onSurface:'#fff', outline:'#333'}}}
            textColor="#fff"
          />

          <View style={s.mapPreview}>
             <Text style={{color:'#aaa'}}>Map Preview Here</Text>
          </View>

          <Divider style={{backgroundColor:'#333', marginVertical:20}} />

          <Text style={s.sectionTitle}>Visibility</Text>
          <SegmentedButtons
            value={visibility}
            onValueChange={setVisibility}
            buttons={[
              { value: 'everyone', label: 'Everyone' },
              { value: 'followers', label: 'Followers' },
              { value: 'only_me', label: 'Only Me' },
            ]}
            theme={{colors:{secondaryContainer:'#F97316', onSecondaryContainer:'#fff', outline:'#555'}}}
            style={{marginTop:10}}
          />

          <Button mode="contained" buttonColor="#F97316" onPress={handleSave} style={s.saveBtn}>Post Activity</Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { padding: 16 },
  input: { marginBottom: 15, backgroundColor: '#1c1c1e' },
  mapPreview: { height: 150, backgroundColor: '#1c1c1e', borderRadius: 8, justifyContent:'center', alignItems:'center', borderWidth:1, borderColor:'#333' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  saveBtn: { marginTop: 30, paddingVertical: 6, borderRadius: 8 }
});
