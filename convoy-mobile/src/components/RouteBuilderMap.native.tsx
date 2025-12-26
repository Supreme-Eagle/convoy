import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Button, Text } from "react-native-paper";

export default function RouteBuilderMap({ onSave }: { onSave: (points: any[]) => void }) {
  const [points, setPoints] = useState<{latitude: number; longitude: number}[]>([]);

  const handlePress = (e: any) => {
    setPoints([...points, e.nativeEvent.coordinate]);
  };

  const undo = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  return (
    <View style={s.c}>
       <MapView
         provider={PROVIDER_GOOGLE}
         style={StyleSheet.absoluteFill}
         initialRegion={{ latitude: 19.0760, longitude: 72.8777, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
         onPress={handlePress}
       >
         {points.map((p, i) => (
            <Marker key={i} coordinate={p} pinColor={i===0?"green":i===points.length-1?"red":"orange"} />
         ))}
         <Polyline coordinates={points} strokeColor="#F97316" strokeWidth={3} />
       </MapView>

       <View style={s.controls}>
          <Text style={{color: "white", fontWeight: "bold", marginBottom: 10, textShadowColor: 'black', textShadowRadius: 3}}>
             Tap map to add points ({points.length})
          </Text>
          <View style={{flexDirection: "row", gap: 10}}>
             <Button mode="contained" buttonColor="#64748B" onPress={undo} disabled={points.length===0}>Undo</Button>
             <Button mode="contained" buttonColor="#F97316" onPress={() => onSave(points)} disabled={points.length < 2}>Save Route</Button>
          </View>
       </View>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1 },
  controls: { position: "absolute", bottom: 30, width: "100%", alignItems: "center" }
});
