import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Vibration } from 'react-native';
import { Text, Button, Avatar, IconButton } from 'react-native-paper';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { Accelerometer } from 'expo-sensors';
import { db, auth } from '../../src/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useThemeContext } from '../../src/context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function RecordScreen() {
  const { theme } = useThemeContext();
  const mapRef = useRef<MapView>(null);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [recording, setRecording] = useState(false);
  const [stats, setStats] = useState({ time: 0, speed: 0 });
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('satellite');

  const [crashCountdown, setCrashCountdown] = useState<number | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const [showLayers, setShowLayers] = useState(false);
  const [rainRadar, setRainRadar] = useState(false);
  const [packMode, setPackMode] = useState(true);

  // LOCATION + SPEED
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc) => {
          setLocation(loc);
          if (recording) {
            setStats((s) => ({
              ...s,
              speed: Math.round((loc.coords.speed || 0) * 3.6),
            }));
          }
        }
      );
    })();
  }, [recording]);

  // TIMER
  useEffect(() => {
    let interval: any;
    if (recording) {
      interval = setInterval(
        () => setStats((s) => ({ ...s, time: s.time + 1 })),
        1000
      );
    }
    return () => clearInterval(interval);
  }, [recording]);

  // CRASH DETECTION (~5G, only while recording)
  useEffect(() => {
    if (!recording) return;
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      if (mag > 5 && crashCountdown === null && !sosActive) {
        setCrashCountdown(10);
        Vibration.vibrate([500, 500], true);
      }
    });
    return () => sub.remove();
  }, [recording, crashCountdown, sosActive]);

  // SIREN
  async function playSiren() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/siren.mp3')
      );
      setSound(sound);
      await sound.setIsLoopingAsync(true);
      await sound.playAsync();
    } catch (e) {
      Vibration.vibrate([500, 500], true);
    }
  }

  async function stopSiren() {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
    } catch {}
    Vibration.cancel();
  }

  // COUNTDOWN → SOS
  useEffect(() => {
    if (crashCountdown === null) return;

    if (crashCountdown === 0) {
      setCrashCountdown(null);
      setSosActive(true);
      playSiren();
      if (auth.currentUser) {
        updateDoc(doc(db, 'users', auth.currentUser.uid), {
          sos: true,
          lastLocation: location?.coords || null,
        }).catch(console.log);
      }
      return;
    }

    const t = setTimeout(
      () => setCrashCountdown((c) => (c !== null ? c - 1 : null)),
      1000
    );
    return () => clearTimeout(t);
  }, [crashCountdown]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        style={s.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        customMapStyle={DARK_BLUE_STYLE}
        showsUserLocation
        showsMyLocationButton={false}  // no default recenter
      />

      {/* RIGHT ACTION BUTTONS (rotate, LAYERS, recenter) */}
      <View style={s.rightStack}>
        <TouchableOpacity style={s.glassBtn}>
          <IconButton icon="sync" iconColor="#fff" size={20} />
        </TouchableOpacity>

        {/* LAYERS opens Map Style sheet */}
        <TouchableOpacity style={s.glassBtn} onPress={() => setShowLayers(true)}>
          <IconButton icon="layers-outline" iconColor="#fff" size={20} />
        </TouchableOpacity>

        {/* Custom recenter only */}
        <TouchableOpacity
          style={s.glassBtn}
          onPress={() => {
            if (location && mapRef.current) {
              mapRef.current.animateCamera({ center: location.coords, zoom: 16 });
            }
          }}
        >
          <IconButton icon="navigation" iconColor="#F97316" size={20} />
        </TouchableOpacity>
      </View>

      {/* BOTTOM STATS + START */}
      <View style={s.bottomSheet}>
        <View style={s.statsContainer}>
          <View style={s.statCol}>
            <Text style={s.label}>TIME</Text>
            <Text style={s.value}>{formatTime(stats.time)}</Text>
          </View>
          <View style={s.statCol}>
            <Text style={s.label}>SPEED</Text>
            <Text style={s.value}>{stats.speed}</Text>
          </View>
        </View>
        <Button
          mode="contained"
          style={s.orangeBtn}
          labelStyle={s.btnText}
          onPress={() => setRecording(true)}
        >
          Start Ride
        </Button>
      </View>

      {/* CRASH OVERLAY */}
      {crashCountdown !== null && (
        <View style={s.crashOverlay}>
          <View style={s.crashBox}>
            <Avatar.Icon
              size={64}
              icon="alert"
              color="#D32F2F"
              style={{ backgroundColor: '#fff' }}
            />
            <Text style={s.crashTitle}>CRASH DETECTED</Text>
            <Text style={s.crashNumber}>{crashCountdown}</Text>
            <TouchableOpacity
              style={s.whitePill}
              onPress={() => setCrashCountdown(null)}
            >
              <Text style={s.pillText}>I'M OKAY - CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* SOS ACTIVE OVERLAY */}
      {sosActive && (
        <View style={s.crashOverlay}>
          <View style={[s.crashBox, { backgroundColor: '#D32F2F' }]}>
            <Text style={s.crashTitle}>SOS ACTIVE</Text>
            <Text
              style={{
                color: '#fff',
                textAlign: 'center',
                marginVertical: 20,
              }}
            >
              Siren Playing…{'\n'}Notifying Contacts…
            </Text>
            <TouchableOpacity
              style={s.whitePill}
              onPress={async () => {
                setSosActive(false);
                await stopSiren();
                if (auth.currentUser) {
                  updateDoc(doc(db, 'users', auth.currentUser.uid), {
                    sos: false,
                  }).catch(console.log);
                }
              }}
            >
              <Text style={s.pillText}>STOP SOS</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MAP STYLE SHEET (Standard / Satellite + Rain Radar + Pack Mode) */}
      {showLayers && (
        <View style={s.sheetOverlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Map Style</Text>

            <TouchableOpacity
              style={s.radioRow}
              onPress={() => setMapType('standard')}
            >
              <IconButton
                icon={mapType === 'standard' ? 'radiobox-marked' : 'radiobox-blank'}
                iconColor={mapType === 'standard' ? '#F97316' : '#666'}
                size={18}
              />
              <Text style={s.radioLabel}>Standard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.radioRow}
              onPress={() => setMapType('satellite')}
            >
              <IconButton
                icon={mapType === 'satellite' ? 'radiobox-marked' : 'radiobox-blank'}
                iconColor={mapType === 'satellite' ? '#F97316' : '#666'}
                size={18}
              />
              <Text style={s.radioLabel}>Satellite</Text>
            </TouchableOpacity>

            <View style={s.divider} />

            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Rain Radar</Text>
              <Button
                mode={rainRadar ? 'contained' : 'outlined'}
                compact
                onPress={() => setRainRadar(!rainRadar)}
              >
                {rainRadar ? 'On' : 'Off'}
              </Button>
            </View>

            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Pack Mode (Others)</Text>
              <Button
                mode={packMode ? 'contained' : 'outlined'}
                compact
                onPress={() => setPackMode(!packMode)}
              >
                {packMode ? 'On' : 'Off'}
              </Button>
            </View>

            <Button
              mode="text"
              onPress={() => setShowLayers(false)}
              style={{ marginTop: 10 }}
            >
              Close
            </Button>
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
  glassBtn: {
    backgroundColor: 'rgba(50,50,50,0.6)',
    borderRadius: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 40,
    width: width - 40,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statCol: { alignItems: 'center' },
  label: { fontSize: 12, color: '#666', fontWeight: 'bold' },
  value: { fontSize: 32, fontWeight: 'bold', color: '#000' },
  orangeBtn: {
    backgroundColor: '#F97316',
    borderRadius: 30,
    height: 56,
    justifyContent: 'center',
  },
  btnText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  crashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  crashBox: {
    width: width * 0.85,
    backgroundColor: '#D32F2F',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  crashTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
  },
  crashNumber: {
    color: '#fff',
    fontSize: 90,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  whitePill: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 40,
    width: '100%',
    alignItems: 'center',
  },
  pillText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 18 },

  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 1100,
  },
  sheet: {
    width,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  radioLabel: { fontSize: 16 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  toggleLabel: { fontSize: 16 },
});

const DARK_BLUE_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];
