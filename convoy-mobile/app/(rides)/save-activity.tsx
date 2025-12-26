import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, Appbar, List, Switch, Divider } from 'react-native-paper';
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

  // Mock Map Snapshot (In real app, pass coordinates from previous screen)
  const mapSnapshot = 'https://maps.googleapis.com/maps/api/staticmap?center=19.0760,72.8777&zoom=13&size=600x300&maptype=roadmap&path=color:0xff5722|weight:5|19.0760,72.8777|19.0860,72.8877&key=YOUR_KEY';

  const handleSave = async () => {
    setLoading(true);
    try {
      // Create Post in Global Feed (or User's feed)
      await addDoc(collection(db, 'groups', 'global_riders', 'posts'), {
        author: {
          uid: auth.currentUser?.uid,
          name: auth.currentUser?.displayName || 'Rider',
          photoUrl: auth.currentUser?.photoURL
        },
        title: title || 'Afternoon Ride',
        content: desc,
        stats: {
          dist: params.dist || '12.5 km',
          time: params.time || '45m',
          elev: '120 m'
        },
        imageUrl: mapSnapshot,
        visibility,
        createdAt: serverTimestamp(),
        type: 'activity'
      });
      
      router.replace('/(tabs)/home');
    } catch (e) {
      console.error(e);
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
          
          {/* Inputs */}
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
            label="How'd it go? Share more..." 
            value={desc} 
            onChangeText={setDesc} 
            style={[s.input, {height: 80}]} 
            mode="outlined" 
            multiline
            theme={{colors:{primary:'#F97316', background:'#1c1c1e', onSurface:'#fff', outline:'#333'}}}
            textColor="#fff"
          />

          {/* Map Preview */}
          <View style={s.mediaRow}>
             <View style={s.mapPreview}>
               {/* Placeholder for map snapshot */}
               <Image source={{uri: 'https://via.placeholder.com/300x150/111/555?text=Route+Map'}} style={{width:'100%', height:'100%', opacity:0.5}} />
               <Text style={s.mapLabel}>Activity Map</Text>
             </View>
             <View style={s.photoBtn}>
               <List.Icon icon="camera" color="#F97316" />
               <Text style={{color:'#F97316', fontSize:12}}>Add Photos</Text>
             </View>
          </View>

          <Button mode="outlined" textColor="#F97316" style={{borderColor:'#F97316', marginBottom:20}}>Change Map Type</Button>

          <Divider style={{backgroundColor:'#333', marginBottom:20}} />

          {/* Details */}
          <Text style={s.sectionTitle}>Details</Text>
          <List.Item title="Activity Tag" titleStyle={{color:'#ccc'}} right={() => <List.Icon icon="chevron-down" color="#555" />} style={s.listItem} />
          <List.Item title="How did that activity feel?" titleStyle={{color:'#ccc'}} right={() => <List.Icon icon="chevron-down" color="#555" />} style={s.listItem} />
          
          <Divider style={{backgroundColor:'#333', marginVertical:20}} />

          {/* Visibility */}
          <Text style={s.sectionTitle}>Visibility</Text>
          <View style={s.visBox}>
             <Text style={{color:'#ccc'}}>Who can see</Text>
             <SegmentedButtons
               value={visibility}
               onValueChange={setVisibility}
               buttons={[
                 { value: 'everyone', label: 'Everyone' },
                 { value: 'followers', label: 'Followers' },
                 { value: 'only_me', label: 'Only Me' },
               ]}
               theme={{colors:{secondaryContainer:'#F97316', onSecondaryContainer:'#fff', outline:'#333'}}}
               style={{marginTop:10}}
             />
          </View>

          <Button mode="contained" buttonColor="#F97316" onPress={handleSave} style={s.saveBtn}>Save Activity</Button>
          <Button mode="outlined" textColor="#ff5252" style={{borderColor:'#ff5252', marginTop:10}} onPress={() => router.back()}>Discard Activity</Button>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { padding: 16 },
  input: { marginBottom: 15, backgroundColor: '#1c1c1e' },
  mediaRow: { flexDirection: 'row', height: 120, marginBottom: 15, gap: 10 },
  mapPreview: { flex: 1, backgroundColor: '#1c1c1e', borderRadius: 8, overflow: 'hidden', justifyContent:'center', alignItems:'center', borderWidth:1, borderColor:'#333' },
  photoBtn: { width: 100, backgroundColor: '#1c1c1e', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderStyle:'dashed', borderWidth:1, borderColor:'#F97316' },
  mapLabel: { position: 'absolute', color: 'white', fontWeight: 'bold', backgroundColor:'rgba(0,0,0,0.5)', padding:4, borderRadius:4 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  listItem: { backgroundColor: '#1c1c1e', borderRadius: 8, marginBottom: 10, borderWidth:1, borderColor:'#333' },
  visBox: { marginBottom: 20 },
  saveBtn: { paddingVertical: 6, borderRadius: 8 }
});
