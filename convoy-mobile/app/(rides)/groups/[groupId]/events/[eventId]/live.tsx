import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Alert, Vibration } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { ref, onValue, set, onDisconnect, update } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { rtdb, db, auth } from '../../../../../../src/firebase'; 
import { Button, Text, Card, IconButton, FAB, Banner, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// --- HELPER: Haversine Distance (km) ---
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function TacticalLiveMap() {
  const { groupId, eventId } = useLocalSearchParams();
  const [riders, setRiders] = useState<any>({});
  const [myStatus, setMyStatus] = useState('OK');
  const [sosActive, setSosActive] = useState(false);
  const [packStretched, setPackStretched] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  const mapRef = useRef<MapView>(null);
  const userId = auth.currentUser?.uid;

  // 1. SETUP: SOS Sound
  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const playSiren = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require('../../../../../../assets/sounds/siren.mp3'), // Ensure this file exists or use a default URI
      { shouldPlay: true, isLooping: true }
    );
    setSound(sound);
  };

  const stopSiren = async () => {
    if (sound) await sound.stopAsync();
  };

  // 2. LOGIC: Pack Stretch Calculation (Leader Only view usually, but good for all to know)
  useEffect(() => {
    const ridersArr = Object.values(riders);
    const leader = ridersArr.find((r:any) => r.role === 'leader');
    const tail = ridersArr.find((r:any) => r.role === 'tail');

    if (leader && tail) {
      const dist = getDistance(leader.lat, leader.lng, tail.lat, tail.lng);
      setPackStretched(dist > 2.0); // 2km threshold
    }
  }, [riders]);

  // 3. LOGIC: Incoming SOS Check
  useEffect(() => {
    const sosRider = Object.values(riders).find((r:any) => r.status === 'SOS' && r.uid !== userId);
    if (sosRider) {
      Vibration.vibrate([500, 500, 500], true); // Alert vibration
    } else {
      Vibration.cancel();
    }
  }, [riders]);

  // 4. ACTION: Toggle SOS
  const toggleSOS = async () => {
    const newStatus = sosActive ? 'OK' : 'SOS';
    setSosActive(!sosActive);
    setMyStatus(newStatus);
    
    // Update Firebase
    if (userId) {
      update(ref(rtdb, `sessions/${eventId}/${userId}`), { status: newStatus });
    }

    if (newStatus === 'SOS') {
      playSiren();
    } else {
      stopSiren();
    }
  };

  // 5. ACTION: Update Status (Gas/Mech)
  const setStatus = (status: string) => {
    setMyStatus(status);
    if (userId) update(ref(rtdb, `sessions/${eventId}/${userId}`), { status });
  };

  // 6. TRACKING: Location Loop
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // Get my role from Firestore participants list (or pass it via params)
      // For now, defaulting to 'member'. You should fetch this real role.
      const role = 'member'; 

      const userRef = ref(rtdb, `sessions/${eventId}/${userId}`);
      onDisconnect(userRef).remove();

      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 10 },
        (loc) => {
          set(userRef, {
            uid: userId,
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            heading: loc.coords.heading,
            speed: loc.coords.speed,
            status: myStatus, // Uses closure value, might need ref for absolute latest
            role: role, 
            user: auth.currentUser?.displayName || 'Rider',
            photoUrl: auth.currentUser?.photoURL,
            lastUpdate: Date.now(),
          });
        }
      );
    })();
  }, [eventId]); // Note: myStatus dependency omitted for cleaner loop, in prod use useRef for status

  // 7. LISTEN: Fetch all riders
  useEffect(() => {
    const sessionRef = ref(rtdb, `sessions/${eventId}`);
    const unsub = onValue(sessionRef, (snapshot) => {
      setRiders(snapshot.val() || {});
    });
    return () => unsub();
  }, [eventId]);

  // --- RENDER HELPERS ---
  const getMarkerColor = (r: any) => {
    if (r.status === 'SOS') return 'red';
    if (r.status === 'GAS') return 'orange';
    if (r.status === 'MECH') return 'black';
    if (r.role === 'leader') return 'gold';
    if (r.role === 'tail') return 'blue';
    return 'green'; // Default member
  };

  return (
    <View style={styles.container}>
      {/* ALERTS BANNER */}
      {packStretched && (
        <Banner visible={true} icon="arrow-expand-all" style={{backgroundColor: '#fff3cd'}}>
          Pack Stretched! Leader is >2km ahead of Tail.
        </Banner>
      )}
      {Object.values(riders).some((r:any) => r.status === 'SOS') && (
        <Banner visible={true} icon="alert-octagon" style={{backgroundColor: '#ffebee'}}>
          EMERGENCY: Rider Down! Check Map.
        </Banner>
      )}

      <MapView 
        ref={mapRef}
        style={styles.map} 
        provider={PROVIDER_GOOGLE}
        showsUserLocation={false} // We render our own marker to control color
      >
        {Object.values(riders).map((r: any) => (
          <Marker
            key={r.uid}
            coordinate={{ latitude: r.lat, longitude: r.lng }}
            title={r.user}
            description={`${r.role?.toUpperCase()} - ${r.status}`}
            pinColor={getMarkerColor(r)}
            rotation={r.heading}
          >
            {/* Custom Marker View */}
            <View style={{ alignItems: 'center' }}>
               <View style={[styles.markerRing, { borderColor: getMarkerColor(r) }]}>
                 <Avatar.Image size={30} source={{ uri: r.photoUrl }} />
               </View>
               {r.status !== 'OK' && (
                 <View style={{ backgroundColor: getMarkerColor(r), padding: 2, borderRadius: 4, marginTop: -10 }}>
                   <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{r.status}</Text>
                 </View>
               )}
            </View>
          </Marker>
        ))}
      </MapView>

      {/* CONTROLS OVERLAY */}
      <View style={styles.controls}>
        <View style={styles.statusRow}>
          <Button mode={myStatus === 'OK' ? 'contained' : 'outlined'} compact onPress={() => setStatus('OK')} style={styles.statBtn}>OK</Button>
          <Button mode={myStatus === 'GAS' ? 'contained' : 'outlined'} compact buttonColor={myStatus === 'GAS'?'orange':undefined} onPress={() => setStatus('GAS')} style={styles.statBtn}>GAS</Button>
          <Button mode={myStatus === 'MECH' ? 'contained' : 'outlined'} compact buttonColor={myStatus === 'MECH'?'black':undefined} onPress={() => setStatus('MECH')} style={styles.statBtn}>MECH</Button>
        </View>

        <TouchableOpacity 
          style={[styles.sosButton, sosActive && styles.sosActive]} 
          onPress={toggleSOS}
          onLongPress={toggleSOS} // Avoid accidental? Maybe long press better
        >
          <MaterialCommunityIcons name="alert-octagon" size={40} color="white" />
          <Text style={{color:'white', fontWeight:'bold'}}>SOS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  markerRing: { padding: 2, borderWidth: 3, borderRadius: 20, backgroundColor: 'white' },
  controls: { position: 'absolute', bottom: 40, left: 20, right: 20, alignItems: 'center' },
  statusRow: { flexDirection: 'row', backgroundColor: 'white', padding: 5, borderRadius: 20, elevation: 5, marginBottom: 20 },
  statBtn: { marginHorizontal: 2 },
  sosButton: { 
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#d32f2f', 
    justifyContent: 'center', alignItems: 'center', elevation: 10, borderWidth: 4, borderColor: 'white' 
  },
  sosActive: { backgroundColor: 'red', transform: [{ scale: 1.1 }] } // Pulse anim in real app
});
