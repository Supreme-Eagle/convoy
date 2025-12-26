import React, { useState } from "react";
import { View, StyleSheet, ImageBackground, TouchableOpacity, Text, Image, Alert } from "react-native";
import { TextInput, Button, ActivityIndicator } from "react-native-paper";
import { useRouter } from "expo-router";
import { useAuth } from "../src/auth/AuthProvider";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async () => {
    if (!email || !password) return Alert.alert("Error", "Please fill all fields");
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        // Router will auto-redirect in _layout.tsx
      } else {
        await signUp(email, password);
        // Router will auto-redirect
      }
    } catch (e: any) {
      Alert.alert("Authentication Failed", e.message);
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={{ uri: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=2670&auto=format&fit=crop" }} 
      style={s.background}
    >
      <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.9)']} style={s.overlay}>
        
        <View style={s.logoContainer}>
           <Text style={s.logoText}>STRAVIA</Text>
           <Text style={s.tagline}>Join the movement.</Text>
        </View>

        <View style={s.formContainer}>
           {/* Social Buttons Mockup */}
           <Button mode="outlined" icon="google" textColor="white" style={s.socialBtn} onPress={()=>{}}>
             Continue with Google
           </Button>
           <Button mode="outlined" icon="facebook" textColor="white" style={s.socialBtn} onPress={()=>{}}>
             Continue with Facebook
           </Button>
           
           <View style={s.divider}>
             <View style={s.line} /><Text style={{color:"gray", marginHorizontal:10}}>OR</Text><View style={s.line} />
           </View>

           <TextInput
             label="Email"
             value={email}
             onChangeText={setEmail}
             mode="outlined"
             style={s.input}
             theme={{ colors: { primary: "#F97316", onSurface: "white" } }}
             textColor="white"
             autoCapitalize="none"
           />
           <TextInput
             label="Password"
             value={password}
             onChangeText={setPassword}
             mode="outlined"
             secureTextEntry
             style={s.input}
             theme={{ colors: { primary: "#F97316", onSurface: "white" } }}
             textColor="white"
           />

           <Button 
             mode="contained" 
             onPress={handleAuth} 
             loading={loading} 
             style={s.mainBtn}
             buttonColor="#F97316"
             contentStyle={{height: 50}}
           >
             {isLogin ? "Log In" : "Sign Up"}
           </Button>

           <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{marginTop: 20}}>
             <Text style={{color: "white", textAlign: "center"}}>
               {isLogin ? "New here? Sign Up" : "Already have an account? Log In"}
             </Text>
           </TouchableOpacity>
        </View>

      </LinearGradient>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, padding: 20, justifyContent: "flex-end" },
  logoContainer: { position: "absolute", top: 80, left: 20 },
  logoText: { color: "white", fontSize: 40, fontWeight: "900", fontStyle: "italic" },
  tagline: { color: "#ddd", fontSize: 18, marginTop: 5 },
  formContainer: { width: "100%", paddingBottom: 40 },
  socialBtn: { borderColor: "white", borderWidth: 1, marginBottom: 15, borderRadius: 5 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: "gray" },
  input: { backgroundColor: "rgba(30,30,30,0.8)", marginBottom: 15 },
  mainBtn: { marginTop: 10, borderRadius: 5 }
});
