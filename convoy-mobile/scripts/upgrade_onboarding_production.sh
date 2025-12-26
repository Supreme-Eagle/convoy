#!/usr/bin/env bash
set -euo pipefail
cd /workspaces/convoy/convoy-mobile

# 1. Install Reanimated (for smooth UI)
npx expo install react-native-reanimated

# 2. UPDATE APP CONFIG (Fix Linking Warning)
# We use node to inject the 'scheme' property safely
node -e '
  const fs = require("fs");
  const content = fs.readFileSync("app.config.js", "utf8");
  if (!content.includes("scheme:")) {
    const newContent = content.replace("expo: {", "expo: {\n    scheme: \"convoy\",");
    fs.writeFileSync("app.config.js", newContent);
    console.log("Added scheme to app.config.js");
  }
'

# 3. DEFINE MISSING FUNCTIONS (Fix Crash)
mkdir -p src/data
cat > "src/data/userProfile.ts" <<'EOF'
import { doc, updateDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase";

export async function updateLocationPermission(uid: string, status: string) {
  try {
    await updateDoc(doc(db, "users", uid), {
      locationPermission: status,
      updatedAt: new Date()
    });
  } catch (e) {
    console.log("Error updating perm:", e);
  }
}

export async function searchUsers(term: string) {
  if (!term || term.length < 3) return [];
  const q = query(
     collection(db, "users"), 
     where("displayName", ">=", term),
     where("displayName", "<=", term + '\uf8ff'),
     limit(5)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
EOF

# 4. REWRITE ONBOARDING (Production Grade UI)
cat > "app/onboarding.tsx" <<'EOF'
import React, { useState, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Image, Platform, FlatList } from "react-native";
import { Text, TextInput, Button, ProgressBar, Avatar, Searchbar } from "react-native-paper";
import PagerView from "react-native-pager-view";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../src/firebase";
import { useAuth } from "../src/auth/AuthProvider";
import { searchUsers } from "../src/data/userProfile";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const pagerRef = useRef<PagerView>(null);
  const [step, setStep] = useState(0);
  
  // Data State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState("");
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState("");
  
  // Search State
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [following, setFollowing] = useState<string[]>([]);

  const totalSteps = 6; // Added Search Step

  const nextStep = () => {
    if (step < totalSteps - 1) {
       pagerRef.current?.setPage(step + 1);
       setStep(s => s + 1);
    } else {
       finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
     if (!user) return;
     try {
       await setDoc(doc(db, "users", user.uid), {
         firstName, lastName, 
         birthday: birthday.toISOString(), 
         gender, level, goal,
         following,
         onboardingComplete: true,
         displayName: `${firstName} ${lastName}`.trim(),
         photoURL: "https://i.pravatar.cc/300" // Default avatar
       }, { merge: true });
       router.replace("/(tabs)/home");
     } catch(e) { console.log(e); }
  };

  const handleSearch = async (q: string) => {
     setSearchQ(q);
     if (q.length > 2) {
        const res = await searchUsers(q);
        setSearchResults(res);
     }
  };

  const toggleFollow = (id: string) => {
     if (following.includes(id)) setFollowing(following.filter(f => f !== id));
     else setFollowing([...following, id]);
  };

  const StepLayout = ({ title, subtitle, children, icon }: any) => (
    <View style={s.page}>
       <View>
          {icon && <MaterialCommunityIcons name={icon} size={60} color="#F97316" style={{marginBottom: 20}} />}
          <Text variant="displaySmall" style={s.title}>{title}</Text>
          <Text style={s.subtitle}>{subtitle}</Text>
       </View>
       <View style={s.content}>{children}</View>
       <Button mode="contained" onPress={nextStep} style={s.btn} buttonColor="#F97316" contentStyle={{height: 50}}>
         Continue
       </Button>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.progressContainer}>
         <ProgressBar progress={(step + 1) / totalSteps} color="#F97316" style={{height: 6, borderRadius: 3}} />
      </View>

      <PagerView style={s.pager} initialPage={0} ref={pagerRef} scrollEnabled={false} onPageSelected={e => setStep(e.nativeEvent.position)}>
         
         {/* 1. NAME */}
         <View key="1">
            <StepLayout title="Let's get started" subtitle="What's your name?" icon="account-circle">
               <TextInput label="First Name" value={firstName} onChangeText={setFirstName} mode="outlined" style={s.input} theme={{colors:{primary:"#F97316"}}} />
               <TextInput label="Last Name" value={lastName} onChangeText={setLastName} mode="outlined" style={s.input} theme={{colors:{primary:"#F97316"}}} />
            </StepLayout>
         </View>

         {/* 2. BIRTHDAY */}
         <View key="2">
            <StepLayout title="When's your birthday?" subtitle="We use this to calculate age categories." icon="cake-variant">
               <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                 <View pointerEvents="none">
                   <TextInput label="Birthday" value={birthday.toLocaleDateString()} mode="outlined" style={s.input} right={<TextInput.Icon icon="calendar" />} theme={{colors:{primary:"#F97316"}}} />
                 </View>
               </TouchableOpacity>
               {showDatePicker && (
                 <DateTimePicker value={birthday} mode="date" display="spinner" onChange={(e, d) => { setShowDatePicker(Platform.OS === 'ios'); if(d) setBirthday(d); }} maximumDate={new Date()} />
               )}
            </StepLayout>
         </View>

         {/* 3. GENDER */}
         <View key="3">
            <StepLayout title="Gender" subtitle="For accurate calorie burn stats." icon="gender-male-female">
               {["Man", "Woman", "Non-binary", "Prefer not to say"].map(g => (
                 <TouchableOpacity key={g} onPress={() => setGender(g)} style={[s.optionBtn, gender===g && s.optionBtnSelected]}>
                    <Text style={[s.optionText, gender===g && s.optionTextSelected]}>{g}</Text>
                    {gender===g && <MaterialCommunityIcons name="check-circle" size={24} color="#F97316" />}
                 </TouchableOpacity>
               ))}
            </StepLayout>
         </View>

         {/* 4. LEVEL */}
         <View key="4">
            <StepLayout title="Experience Level" subtitle="Help us tailor your routes." icon="speedometer">
               {[
                 {l: "Beginner", d: "Just starting out"},
                 {l: "Intermediate", d: "Exercise regularly"},
                 {l: "Advanced", d: "Training for events"},
                 {l: "Pro", d: "Competitive athlete"}
               ].map(x => (
                 <TouchableOpacity key={x.l} onPress={() => setLevel(x.l)} style={[s.optionBtn, level===x.l && s.optionBtnSelected]}>
                    <View>
                       <Text style={[s.optionText, level===x.l && s.optionTextSelected]}>{x.l}</Text>
                       <Text style={{color: "gray", fontSize: 12}}>{x.d}</Text>
                    </View>
                    {level===x.l && <MaterialCommunityIcons name="check-circle" size={24} color="#F97316" />}
                 </TouchableOpacity>
               ))}
            </StepLayout>
         </View>

         {/* 5. GOAL */}
         <View key="5">
            <StepLayout title="Main Goal" subtitle="What motivates you?" icon="flag-checkered">
               {["Build a habit", "Lose weight", "Train for event", "Socialize", "Explore"].map(x => (
                 <TouchableOpacity key={x} onPress={() => setGoal(x)} style={[s.optionBtn, goal===x && s.optionBtnSelected]}>
                    <Text style={[s.optionText, goal===x && s.optionTextSelected]}>{x}</Text>
                 </TouchableOpacity>
               ))}
            </StepLayout>
         </View>

         {/* 6. SEARCH FRIENDS (New Feature) */}
         <View key="6">
            <View style={s.page}>
               <View>
                  <Text variant="displaySmall" style={s.title}>Find Friends</Text>
                  <Text style={s.subtitle}>It's better together.</Text>
                  <Searchbar placeholder="Search name" value={searchQ} onChangeText={handleSearch} style={{backgroundColor: "#1c1c1e", marginBottom: 20}} iconColor="gray" inputStyle={{color: "white"}} />
               </View>

               <FlatList
                 data={searchResults}
                 keyExtractor={i => i.id}
                 renderItem={({item}) => (
                    <View style={s.userRow}>
                       <Avatar.Text size={40} label={item.displayName?.[0]} style={{backgroundColor: "#F97316"}} />
                       <View style={{flex: 1, marginLeft: 12}}>
                          <Text style={{color: "white", fontWeight: "bold"}}>{item.displayName}</Text>
                          <Text style={{color: "gray", fontSize: 12}}>{item.level || "Athlete"}</Text>
                       </View>
                       <Button 
                         mode={following.includes(item.id) ? "outlined" : "contained"} 
                         compact 
                         onPress={() => toggleFollow(item.id)}
                         buttonColor={following.includes(item.id) ? "transparent" : "#F97316"}
                         textColor={following.includes(item.id) ? "#F97316" : "white"}
                       >
                         {following.includes(item.id) ? "Following" : "Follow"}
                       </Button>
                    </View>
                 )}
                 ListEmptyComponent={<Text style={{textAlign:"center", color:"gray", marginTop: 40}}>Search for friends to follow</Text>}
               />

               <Button mode="contained" onPress={finishOnboarding} style={s.btn} buttonColor="#F97316" contentStyle={{height: 50}}>
                 Finish
               </Button>
            </View>
         </View>

      </PagerView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  pager: { flex: 1 },
  progressContainer: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10 },
  page: { flex: 1, padding: 24, justifyContent: "space-between" },
  title: { color: "white", fontWeight: "900", marginBottom: 10 },
  subtitle: { color: "gray", fontSize: 18, marginBottom: 30 },
  content: { flex: 1 },
  input: { backgroundColor: "#1c1c1e", marginBottom: 15, fontSize: 18 },
  btn: { borderRadius: 8, marginBottom: 20 },
  optionBtn: { padding: 20, backgroundColor: "#1c1c1e", borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#333", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionBtnSelected: { borderColor: "#F97316", backgroundColor: "rgba(249, 115, 22, 0.1)" },
  optionText: { color: "white", fontSize: 18, fontWeight: "600" },
  optionTextSelected: { color: "#F97316" },
  userRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, backgroundColor: "#111", padding: 10, borderRadius: 10 }
});
EOF

rm -rf .expo node_modules/.cache
echo "Done. Onboarding Upgraded. Run: npx expo start --tunnel --clear"
