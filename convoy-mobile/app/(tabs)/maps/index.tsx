import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Vibration, Animated } from 'react-native';
import { Text, Button, Avatar, IconButton } from 'react-native-paper';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { Accelerometer } from 'expo-sensors';
import { doc, updateDoc, db, auth } from '../../../src/firebase';
import { useThemeContext } from '../../../src/context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function MapsIndex() {
  const router = useRouter();
  const { theme } = useThemeContext();
  const mapRef = useRef<MapView>(null);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [recording, setRecording] = useState(false);
  const [stats, setStats] = useState({ time: 0, speed: 0 });
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('satellite');
  const [crashCountdown, setCrashCountdown] = useState<number | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Crash detection threshold (~5G)
  useEffect(() => {
    if (!recording) return;
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x*x + y*y + z*z);
      if (mag > 5 && crashCountdown === null && !sosActive) {
        setCrashCountdown(10);
        Vibration.vibrate([500, 500], true);
      }
    });
    return () => sub.remove();
  }, [recording, crashCountdown, sosActive]);

  async function playSiren() {
    try {
      const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/siren.mp3'));
      setSound(sound);
      await sound.setIsLoopingAsync(true);
      await sound.playAsync();
    } catch (e) {
      Vibration.vibrate([500, 500], true);
    }
  }

  useEffect(() => {
    if (crashCountdown === 0) {
      setCrashCountdown(null);
      setSosActive(true);
      playSiren();
    } else if (crashCountdown !== null && crashCountdown > 0) {
      const t = setTimeout(() => setCrashCountdown(crashCountdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [crashCountdown]);

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        style={s.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        customMapStyle={DARK_BLUE_STYLE}
        showsUserLocation
      />

      {/* --- RIGHT ACTION BUTTONS --- */}
      <View style={s.rightStack}>
        <TouchableOpacity style={s.glassBtn}><IconButton icon="sync" iconColor="#fff" size={20} /></TouchableOpacity>
        <TouchableOpacity style={s.glassBtn}><IconButton icon="layers-outline" iconColor="#fff" size={20} /></TouchableOpacity>
        <TouchableOpacity style={s.glassBtn}><IconButton icon="navigation" iconColor="#F97316" size={20} /></TouchableOpacity>
      </View>

      {/* --- BOTTOM STATS CARD --- */}
      <View style={s.bottomSheet}>
        <View style={s.statsContainer}>
          <View style={s.statCol}>
            <Text style={s.label}>TIME</Text>
            <Text style={s.value}>0:00</Text>
          </View>
          <View style={s.statCol}>
            <Text style={s.label}>SPEED</Text>
            <Text style={s.value}>0</Text>
          </View>
        </View>
        <Button mode="contained" style={s.orangeBtn} labelStyle={s.btnText} onPress={() => setRecording(true)}>
          Start Ride
        </Button>
      </View>

      {/* --- CRASH OVERLAY (PIXEL PERFECT) --- */}
      {crashCountdown !== null && (
        <View style={s.crashOverlay}>
          <View style={s.crashBox}>
            <Avatar.Icon size={64} icon="alert" color="#D32F2F" style={{backgroundColor: '#fff'}} />
            <Text style={s.crashTitle}>CRASH DETECTED</Text>
            <Text style={s.crashNumber}>{crashCountdown}</Text>
            <TouchableOpacity style={s.whitePill} onPress={() => setCrashCountdown(null)}>
              <Text style={s.pillText}>I'M OKAY - CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  map: { width, height },
  rightStack: { position: 'absolute', top: 40, right: 15, gap: 8 },
  glassBtn: { backgroundColor: 'rgba(50,50,50,0.6)', borderRadius: 10, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  bottomSheet: { position: 'absolute', bottom: 40, width: width - 40, left: 20, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 24, padding: 20 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statCol: { alignItems: 'center' },
  label: { fontSize: 12, color: '#666', fontWeight: 'bold' },
  value: { fontSize: 32, fontWeight: 'bold', color: '#000' },
  orangeBtn: { backgroundColor: '#F97316', borderRadius: 30, height: 56, justifyContent: 'center' },
  btnText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  crashOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  crashBox: { width: width * 0.85, backgroundColor: '#D32F2F', borderRadius: 20, padding: 30, alignItems: 'center' },
  crashTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 15, textAlign: 'center' },
  crashNumber: { color: '#fff', fontSize: 90, fontWeight: 'bold', marginVertical: 10 },
  whitePill: { backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 40, width: '100%', alignItems: 'center' },
  pillText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 18 }
});

const DARK_BLUE_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
];
