#!/usr/bin/env bash
set -euo pipefail

cat > "app/(tabs)/record.tsx" <<'EOF'
import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Alert, Vibration } from "react-native";
import { Text, Button, Portal, Modal, RadioButton, Switch, Divider } from "react-native-paper";
import MapView, { Polyline, PROVIDER_GOOGLE, MapType, UrlTile } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { Accelerometer } from 'expo-sensors';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { useThemeContext } from "../../src/context/ThemeContext";
import { doc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../src/firebase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function RecordScreen() {
  const { theme, isDark } = useThemeContext();
  const router = useRouter();
  const { routeId } = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  
  // UI State
  const [mapType, setMapType] = useState<MapType>("standard");
  const [showMapMenu, setShowMapMenu] = useState(false);
  const [gloveMode, setGloveMode] = useState(false);
  const [followUser, setFollowUser] = useState(true);
  const [showRain, setShowRain] = useState(false);
  const [rainTimestamp, setRainTimestamp] = useState<number | null>(null);
  
  // Ride State
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0); 
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [path, setPath] = useState<any[]>([]);
  const [ghostPath, setGhostPath] = useState<any[]>([]);
  const [rideDocId, setRideDocId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);

  // Crash / SOS State
  const [crashDetected, setCrashDetected] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(10);
  const [sosActive, setSosActive] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Battery State
  const [batteryLevel, setBatteryLevel] = useState(1.0);
  const [permission, requestPermission] = useCameraPermissions();

  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const accelerometerSub = useRef<any>(null);
  const sosInterval = useRef<any>(null);
  const strobeInterval = useRef<any>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      await requestPermission();
      const level = await Battery.getBatteryLevelAsync();
      setBatteryLevel(level);
      
      const loc = await Location.getCurrentPositionAsync({});
      setCurrentLocation(loc);
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: loc.coords.latitude, longitude: loc.coords.longitude,
          latitudeDelta: 0.005, longitudeDelta: 0.005
        }, 1000);
      }
      
      fetch('https://api.rainviewer.com/public/weather-maps.json')
        .then(r => r.json())
        .then(d => { if(d.radar?.past?.length) setRainTimestamp(d.radar.past[d.radar.past.length-1].time); });
    })();
    
    return () => {
      stopTracking();
      if(sound) sound.unloadAsync();
    };
  }, []);

  const startTracking = async () => {
    let accuracy = Location.Accuracy.BestForNavigation;
    let timeInt = 500; let distInt = 1;

    if (batteryLevel < 0.12) { accuracy = Location.Accuracy.High; timeInt = 2000; distInt = 4; }
    else if (batteryLevel < 0.36) { accuracy = Location.Accuracy.High; timeInt = 1000; distInt = 2; }

    if (!locationSub.current) {
      locationSub.current = await Location.watchPositionAsync(
        { accuracy, timeInterval: timeInt, distanceInterval: distInt }, 
        (loc) => {
          const { latitude, longitude, speed } = loc.coords;
          setCurrentLocation(loc);
          const speedKmh = speed && speed > 0 ? speed * 3.6 : 0;
          setCurrentSpeed(Math.max(0, speedKmh));
          if (speedKmh > maxSpeed) setMaxSpeed(speedKmh);
          setPath(prev => [...prev, { latitude, longitude, speed: speedKmh }]);
          if (followUser && mapRef.current) mapRef.current.animateToRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500);
        }
      );
    }

    if (!accelerometerSub.current) {
      Accelerometer.setUpdateInterval(100); 
      accelerometerSub.current = Accelerometer.addListener(data => {
        const totalForce = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
        if (totalForce > 4.0 && !crashDetected && !sosActive) { 
           triggerCrashSequence();
        }
      });
    }
  };

  const stopTracking = () => {
    if (locationSub.current) { locationSub.current.remove(); locationSub.current = null; }
    if (accelerometerSub.current) { accelerometerSub.current.remove(); accelerometerSub.current = null; }
    setCurrentSpeed(0);
  };
  
  const handleRecenter = async () => {
    setFollowUser(true);
    if (currentLocation && mapRef.current) {
       mapRef.current.animateToRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.005, longitudeDelta: 0.005
       }, 500);
    } else {
       const loc = await Location.getCurrentPositionAsync({});
       setCurrentLocation(loc);
       mapRef.current?.animateToRegion({
          latitude: loc.coords.latitude, longitude: loc.coords.longitude,
          latitudeDelta: 0.005, longitudeDelta: 0.005
       }, 500);
    }
  };

  const triggerCrashSequence = async () => {
    setCrashDetected(true);
    setSosCountdown(10);
    setSosActive(false);
    Vibration.vibrate([0, 500, 200, 500], true); 

    if (sosInterval.current) clearInterval(sosInterval.current);

    sosInterval.current = setInterval(() => {
       setSosCountdown(prev => {
          if (prev <= 1) {
             executeSOS();
             return 0; 
          }
          return prev - 1;
       });
    }, 1000);
  };

  const executeSOS = async () => {
    clearInterval(sosInterval.current);
    setSosActive(true);
    
    // Play Local Siren - UPDATED FILENAME
    try {
      const { sound: playbackObject } = await Audio.Sound.createAsync(
         require('../../assets/sounds/siren.mp3'),
         { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      setSound(playbackObject);
    } catch (e) { console.log("Audio Error:", e); }

    if (batteryLevel > 0.36) {
       strobeInterval.current = setInterval(() => {
          setFlashOn(prev => !prev);
       }, 200);
    }
  };

  const cancelCrash = async () => {
    setCrashDetected(false);
    setSosActive(false);
    setSosCountdown(10);
    setFlashOn(false);
    
    clearInterval(sosInterval.current);
    if (strobeInterval.current) clearInterval(strobeInterval.current);
    Vibration.cancel();
    
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
  };

  useEffect(() => {
    if (recording && !paused) startTracking();
    else stopTracking();
  }, [recording, paused]);

  useEffect(() => {
    let interval: any;
    if (recording && !paused) interval = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, [recording, paused]);

  const handleStart = async () => {
    setRecording(true);
    setPaused(false);
    setPath([]);
    setDuration(0);
    try {
      const docRef = await addDoc(collection(db, "active_rides"), { userId: auth.currentUser?.uid, startTime: serverTimestamp(), status: "active" });
      setRideDocId(docRef.id);
    } catch (e) {}
  };

  const handleFinish = async () => {
    setRecording(false);
    if (rideDocId) {
       try {
        await addDoc(collection(db, "routes"), {
          userId: auth.currentUser?.uid,
          name: `Moto Ride ${new Date().toLocaleDateString()}`,
          points: path,
          duration: duration,
          maxSpeed: maxSpeed,
          distance: (path.length * 0.005), 
          createdAt: serverTimestamp(),
          type: "Motorcycle"
        });
       } catch(e) {}
    }
    router.replace("/(tabs)/maps");
  };

  const btnStyle = { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderWidth: 0.5 };

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      {crashDetected && permission?.granted && (
         <CameraView style={{width: 1, height: 1, opacity: 0}} facing="back" enableTorch={flashOn} />
      )}

      <MapView
        ref={mapRef}
        key={mapType} 
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        showsMyLocationButton={false} 
        onPanDrag={() => setFollowUser(false)}
        mapType={mapType}
        userInterfaceStyle={isDark ? "dark" : "light"}
        customMapStyle={isDark && mapType === "standard" ? darkMapStyle : []}
      >
         {ghostPath.length > 0 && <Polyline coordinates={ghostPath} strokeColor="rgba(255,255,255,0.5)" strokeWidth={5} />}
         <Polyline coordinates={path} strokeColor="#F97316" strokeWidth={5} />
         {showRain && rainTimestamp && <UrlTile urlTemplate={`https://tile.rainviewer.com/${rainTimestamp}/256/{z}/{x}/{y}/2/1_1.png`} zIndex={1} opacity={0.7} />}
      </MapView>

      <Portal>
         <Modal visible={crashDetected} dismissable={false} contentContainerStyle={[s.alertBox, {backgroundColor: theme.colors.error}]}>
            <MaterialCommunityIcons name={sosActive ? "alarm-light" : "alert-octagon"} size={60} color="white" />
            
            {!sosActive ? (
               <>
                 <Text variant="displaySmall" style={{color:"white", fontWeight:"bold", marginVertical:10}}>CRASH DETECTED</Text>
                 <Text variant="displayLarge" style={{color:"white", fontWeight:"bold", marginBottom:20}}>{sosCountdown}</Text>
                 <Text style={{color:"white", textAlign:"center", marginBottom:20}}>Sending SOS + Siren in {sosCountdown}s</Text>
               </>
            ) : (
               <>
                 <Text variant="displaySmall" style={{color:"white", fontWeight:"bold", marginVertical:10}}>SOS ACTIVE</Text>
                 <Text style={{color:"white", textAlign:"center", marginBottom:20}}>Siren Playing... Flash Strobing...</Text>
                 <Text style={{color:"white", textAlign:"center", marginBottom:20}}>Help is on the way.</Text>
               </>
            )}

            <Button mode="contained" buttonColor="white" textColor="red" contentStyle={{height: 60}} labelStyle={{fontSize: 20}} onPress={cancelCrash}>
               {sosActive ? "STOP SOS" : "I'M OKAY - CANCEL"}
            </Button>
         </Modal>
      </Portal>

      <View style={s.controlsContainer}>
        <TouchableOpacity style={[s.controlBtn, btnStyle]} onPress={() => setShowMapMenu(true)}>
          <Ionicons name="layers-outline" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <View style={{height: 10}} />
        <TouchableOpacity style={[s.controlBtn, btnStyle]} onPress={handleRecenter}>
          <Ionicons name={followUser ? "navigate" : "navigate-outline"} size={24} color={followUser ? theme.colors.primary : theme.colors.onSurface} />
        </TouchableOpacity>
        <View style={{height: 10}} />
        <TouchableOpacity style={[s.controlBtn, btnStyle, gloveMode && {backgroundColor: theme.colors.primary}]} onPress={() => setGloveMode(!gloveMode)}>
          <MaterialCommunityIcons name="hand-back-right" size={24} color={gloveMode ? "white" : theme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      <Portal>
        <Modal visible={showMapMenu} onDismiss={() => setShowMapMenu(false)} contentContainerStyle={[s.modal, {backgroundColor: theme.colors.surface}]}>
          <Text variant="titleMedium" style={{marginBottom: 10}}>Map Style</Text>
          <RadioButton.Group onValueChange={val => setMapType(val as MapType)} value={mapType}>
             <View style={s.radioRow}><RadioButton value="standard" /><Text>Standard</Text></View>
             <View style={s.radioRow}><RadioButton value="satellite" /><Text>Satellite</Text></View>
             <View style={s.radioRow}><RadioButton value="terrain" /><Text>Terrain</Text></View>
          </RadioButton.Group>
          <Divider style={{marginVertical: 15}} />
          <View style={s.switchRow}><Text>Rain Radar</Text><Switch value={showRain} onValueChange={setShowRain} color="#F97316" /></View>
        </Modal>
      </Portal>

      <View style={s.overlay}>
         <View style={[s.statCard, { backgroundColor: isDark ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)' }]}> 
            <View style={s.statItem}>
                <Text style={[s.statLabel, {color: "gray"}]}>Time</Text>
                <Text style={[s.statValue, {color: theme.colors.onSurface}, gloveMode && {fontSize: 32}]}>{formatTime(duration)}</Text>
            </View>
            <View style={s.statItem}>
                <Text style={[s.statLabel, {color: "gray"}]}>Speed</Text>
                <Text style={[s.statValue, {color: theme.colors.primary}, gloveMode && {fontSize: 48}]}>{currentSpeed.toFixed(0)}</Text>
                <Text style={{fontSize: 10, color: "gray"}}>km/h</Text>
            </View>
            <View style={s.statItem}>
                <Text style={[s.statLabel, {color: "gray"}]}>Max</Text>
                <Text style={[s.statValue, {color: theme.colors.onSurface}, gloveMode && {fontSize: 32}]}>{maxSpeed.toFixed(0)}</Text>
            </View>
         </View>

         <View style={s.controls}>
             {!recording ? (
               <Button mode="contained" onPress={handleStart} style={s.startBtn} contentStyle={{height: gloveMode ? 100 : 80}} labelStyle={{fontSize: gloveMode?24:20, fontWeight: "bold"}} buttonColor="#F97316">
                 Start Ride
               </Button>
             ) : (
               <View style={{flexDirection:"row", gap: 20}}>
                  {paused ? (
                     <Button mode="contained" onPress={() => setPaused(false)} style={s.pauseBtn} buttonColor="#F97316">Resume</Button>
                  ) : (
                     <Button mode="contained" onPress={() => setPaused(true)} style={s.pauseBtn} buttonColor="#EF4444">Pause</Button>
                  )}
                  <Button mode="contained" onPress={handleFinish} style={s.pauseBtn} buttonColor="gray">Finish</Button>
               </View>
             )}
         </View>
      </View>
    </View>
  );
}

const darkMapStyle = [{ "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] }];
const s = StyleSheet.create({
  container: { flex: 1 },
  controlsContainer: { position: 'absolute', top: 50, right: 20, alignItems: 'center' },
  controlBtn: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  modal: { padding: 20, margin: 40, borderRadius: 15 },
  alertBox: { padding: 20, margin: 20, borderRadius: 15, alignItems: 'center', justifyContent: 'center', elevation: 20 },
  radioRow: { flexDirection: 'row', alignItems: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  overlay: { position: "absolute", bottom: 0, width: "100%", padding: 20, alignItems: "center" },
  statCard: { flexDirection: "row", justifyContent: "space-around", width: "100%", padding: 20, borderRadius: 20, marginBottom: 30, elevation: 5 },
  statItem: { alignItems: "center" },
  statLabel: { fontSize: 12, textTransform: "uppercase", marginBottom: 5 },
  statValue: { fontSize: 28, fontWeight: "bold" },
  controls: { alignItems: "center", width: "100%" },
  startBtn: { borderRadius: 50, width: "90%", justifyContent: "center", elevation: 5 },
  pauseBtn: { borderRadius: 30, width: 120, height: 60, justifyContent: "center", elevation: 5 }
});
EOF

echo "✅ Import path updated to '../../assets/sounds/siren.mp3'"
