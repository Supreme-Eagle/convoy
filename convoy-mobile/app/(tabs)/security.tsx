import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { Appbar, TextInput, Button, useTheme, Snackbar, Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { updateEmail, updatePassword } from "firebase/auth";
import { useAuth } from "../../src/auth/AuthProvider";

export default function SecurityScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleUpdate = async () => {
    if(!user) return;
    setLoading(true);
    try {
      if (email !== user.email) {
         await updateEmail(user, email);
         setMsg("Email updated! Please verify if required.");
      }
      if (password) {
         await updatePassword(user, password);
         setMsg("Password updated!");
      }
      if (email === user.email && !password) {
         setMsg("No changes made.");
      }
    } catch(e: any) {
      if (e.code === 'auth/requires-recent-login') {
        setMsg("Security check failed. Please log out and log in again.");
      } else {
        setMsg("Error: " + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Login & Security" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 15 }}>
        <Text style={{color: "gray", marginBottom: 10}}>
          Update your login credentials. Note: You may need to re-login if you haven't recently.
        </Text>

        <TextInput 
           label="Email Address" 
           value={email} 
           onChangeText={setEmail} 
           mode="outlined" 
           autoCapitalize="none"
           style={{backgroundColor: theme.colors.surface}} 
        />
        
        <TextInput 
           label="New Password" 
           value={password} 
           onChangeText={setPassword} 
           mode="outlined" 
           secureTextEntry 
           placeholder="Leave blank to keep current"
           style={{backgroundColor: theme.colors.surface}} 
        />
        
        <Button mode="contained" onPress={handleUpdate} loading={loading} style={{marginTop: 10}} buttonColor={theme.colors.primary}>
          Update Credentials
        </Button>
      </ScrollView>

      <Snackbar visible={!!msg} onDismiss={() => setMsg("")} duration={3000}>
        {msg}
      </Snackbar>
    </View>
  );
}
