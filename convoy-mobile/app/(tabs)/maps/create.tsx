import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Appbar } from 'react-native-paper';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';

export default function CreateRouteScreen() {
  const router = useRouter();

  const handleSaveRoute = () => {
    // NAVIGATE TO SAVE SCREEN
    router.push({
      pathname: '/rides/save-activity',
      params: { 
        dist: '10.5 km', 
        time: '0m',
        type: 'route'
      }
    });
  };

  return (
    <View style={s.container}>
      <Appbar.Header style={{backgroundColor:'#000'}}>
         <Appbar.BackAction onPress={() => router.back()} iconColor="#fff"/>
         <Appbar.Content title="Route Builder" titleStyle={{color:'#fff'}}/>
         <Button mode="contained" buttonColor="#F97316" compact onPress={handleSaveRoute}>Save</Button>
      </Appbar.Header>

      <MapView style={{flex:1}} provider={PROVIDER_GOOGLE} />
      
      <View style={s.overlay}>
        <Text style={{color:'#fff'}}>Tap map to plot points...</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', bottom: 40, alignSelf:'center', backgroundColor:'rgba(0,0,0,0.7)', padding: 10, borderRadius: 20 }
});
