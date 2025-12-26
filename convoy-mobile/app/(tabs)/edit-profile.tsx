import React, { useState, useEffect } from "react";
import { View, ScrollView } from "react-native";
import { Appbar, TextInput, Button, useTheme, Snackbar } from "react-native-paper";
import { useRouter } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../src/firebase";
import { useAuth } from "../../src/auth/AuthProvider";

export default function EditProfileScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  
  const [bio, setBio] = useState("");
  const [weight, setWeight] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if(!user) return;
    getDoc(doc(db, "users", user.uid)).then(snap => {
      if(snap.exists()) {
        const d = snap.data();
        setBio(d.bio || "");
        setWeight(d.weight || "");
        setEmergencyName(d.emergencyName || "");
        setEmergencyPhone(d.emergencyPhone || "");
      }
    });
  }, [user]);

  const handleSave = async () => {
    if(!user) return;
    setLoading(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        bio, weight, emergencyName, emergencyPhone,
        updatedAt: new Date()
      }, { merge: true });
      setMsg("Profile updated!");
    } catch(e) {
      setMsg("Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Edit Personal Info" />
        <Appbar.Action icon="check" onPress={handleSave} disabled={loading} color={theme.colors.primary} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 15 }}>
        <TextInput 
           label="Bio" 
           value={bio} 
           onChangeText={setBio} 
           multiline 
           mode="outlined" 
           style={{backgroundColor: theme.colors.surface}} 
        />
        <TextInput 
           label="Weight (kg)" 
           value={weight} 
           onChangeText={setWeight} 
           keyboardType="numeric" 
           mode="outlined" 
           style={{backgroundColor: theme.colors.surface}} 
        />
        
        <TextInput 
           label="Emergency Contact Name" 
           value={emergencyName} 
           onChangeText={setEmergencyName} 
           mode="outlined" 
           style={{backgroundColor: theme.colors.surface}} 
        />
        <TextInput 
           label="Emergency Phone" 
           value={emergencyPhone} 
           onChangeText={setEmergencyPhone} 
           keyboardType="phone-pad" 
           mode="outlined" 
           style={{backgroundColor: theme.colors.surface}} 
        />
        
        <Button mode="contained" onPress={handleSave} loading={loading} style={{marginTop: 10}} buttonColor={theme.colors.primary}>
          Save Changes
        </Button>
      </ScrollView>

      <Snackbar visible={!!msg} onDismiss={() => setMsg("")} duration={3000}>
        {msg}
      </Snackbar>
    </View>
  );
}
