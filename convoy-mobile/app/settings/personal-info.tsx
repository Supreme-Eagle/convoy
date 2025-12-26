import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Image, Alert } from "react-native";
import { Text, TextInput, Button, Avatar } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../src/firebase";
import { useUserDoc } from "../../src/hooks/useUserDoc";
import { searchLocations } from "../../src/data/locationSearch";
import { Stack, useRouter } from "expo-router";

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { data: user, user: authUser } = useUserDoc();
  
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [locName, setLocName] = useState("");
  const [locResults, setLocResults] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
      setPhoto(user.photoURL || null);
      setLocName(user.location?.name || user.location || "");
    }
  }, [user]);

  const save = async () => {
    if (!authUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", authUser.uid), {
         displayName: name,
         photoURL: photo,
         location: locName, // Storing as string for simplicity to avoid permission/type errors
         updatedAt: new Date()
      });
      Alert.alert("Success", "Profile updated!");
      router.back();
    } catch(e) {
      Alert.alert("Error", "Could not save profile.");
    }
    setSaving(false);
  };

  const pickImage = async () => {
    let r = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true, aspect: [1,1], base64: true, quality: 0.5
    });
    if (!r.canceled) setPhoto("data:image/jpeg;base64," + r.assets[0].base64);
  };

  const searchLoc = async (t: string) => {
    setLocName(t);
    if(t.length > 2) setLocResults(await searchLocations(t));
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: "Personal Info", headerStyle:{backgroundColor:"#000"}, headerTintColor:"#fff" }} />
      
      <View style={{alignItems:"center", marginVertical: 20}}>
         <TouchableOpacity onPress={pickImage}>
           {photo ? <Image source={{uri: photo}} style={s.avatar} /> : <Avatar.Text label="U" size={100} style={{backgroundColor:"#F97316"}}/>}
         </TouchableOpacity>
         <Text style={{color:"#F97316", marginTop: 10}}>Change Photo</Text>
      </View>

      <TextInput label="Full Name" value={name} onChangeText={setName} mode="outlined" style={s.input} theme={{colors:{primary:"#F97316"}}} />
      
      <View>
        <TextInput label="Location" value={locName} onChangeText={searchLoc} mode="outlined" style={s.input} theme={{colors:{primary:"#F97316"}}} />
        {locResults.length > 0 && (
           <View style={s.dropdown}>
             {locResults.map((x,i) => (
                <TouchableOpacity key={i} onPress={()=>{setLocName(x.display_name); setLocResults([]);}} style={{padding:15, borderBottomWidth:1, borderColor:"#333"}}>
                   <Text style={{color:"white"}}>{x.display_name}</Text>
                </TouchableOpacity>
             ))}
           </View>
        )}
      </View>

      <Button mode="contained" onPress={save} loading={saving} style={{marginTop: 20}} buttonColor="#F97316">
        Save Changes
      </Button>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  input: { backgroundColor: "#1c1c1e", marginBottom: 15 },
  dropdown: { backgroundColor: "#1c1c1e", borderRadius: 8, marginTop: -10, marginBottom: 15 }
});
