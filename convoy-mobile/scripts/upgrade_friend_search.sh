#!/usr/bin/env bash
set -euo pipefail
cd /workspaces/convoy/convoy-mobile

# 1. UPDATE DATA LOGIC (userProfile.ts)
cat > "src/data/userProfile.ts" <<'EOF'
import { doc, updateDoc, collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export async function updateLocationPermission(uid: string, status: string) {
  try {
    await updateDoc(doc(db, "users", uid), {
      locationPermission: status,
      updatedAt: new Date()
    });
  } catch (e) { console.log("Error updating perm:", e); }
}

// 1. Search by Name (Prefix Search)
export async function searchUsers(term: string) {
  if (!term || term.length < 2) return [];
  
  // Firestore trick for "starts with":
  // name >= term AND name <= term + '\uf8ff'
  const end = term + '\uf8ff';
  
  try {
    const q = query(
      collection(db, "users"), 
      where("displayName", ">=", term),
      where("displayName", "<=", end),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.log("Search error", e);
    return [];
  }
}

// 2. Get Suggested Users (Mocking "Smart" Logic)
export async function getSuggestedUsers(myLevel: string) {
  try {
    // Strategy A: Popular Users (if followerCount exists)
    // For now, just getting recent users to populate list
    const q1 = query(collection(db, "users"), limit(5));
    const snap1 = await getDocs(q1);
    let users = snap1.docs.map(d => ({ id: d.id, reason: "Popular near you", ...d.data() }));

    // Strategy B: Same Level (e.g. "Beginner")
    if (myLevel) {
       const q2 = query(collection(db, "users"), where("level", "==", myLevel), limit(5));
       const snap2 = await getDocs(q2);
       const levelUsers = snap2.docs.map(d => ({ id: d.id, reason: "Similar level", ...d.data() }));
       
       // Merge lists uniquely
       const all = [...users, ...levelUsers];
       // basic dedupe
       const unique = all.filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i);
       return unique.slice(0, 5); // Return top 5
    }

    return users;
  } catch (e) {
    console.log("Suggestion error", e);
    return [];
  }
}
EOF

# 2. UPDATE ONBOARDING UI TO SHOW SUGGESTIONS
cat > "app/onboarding.tsx" <<'EOF'
import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, FlatList, Platform } from "react-native";
import { Text, TextInput, Button, ProgressBar, Avatar, Searchbar, Chip } from "react-native-paper";
import PagerView from "react-native-pager-view";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../src/firebase";
import { useAuth } from "../src/auth/AuthProvider";
import { searchUsers, getSuggestedUsers } from "../src/data/userProfile";
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
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [following, setFollowing] = useState<string[]>([]);

  const totalSteps = 6;

  // Load suggestions when reaching the search step
  useEffect(() => {
    if (step === 5) {
       getSuggestedUsers(level).then(setSuggestions);
    }
  }, [step]);

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
         photoURL: "https://i.pravatar.cc/300" 
       }, { merge: true });
       router.replace("/(tabs)/home");
     } catch(e) { console.log(e); }
  };

  const handleSearch = async (q: string) => {
     setSearchQ(q);
     if (q.length > 1) {
        const res = await searchUsers(q);
        setSearchResults(res);
     } else {
        setSearchResults([]);
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

  const renderUser = ({item}: any) => (
    <View style={s.userRow}>
       <Avatar.Text size={40} label={(item.displayName?.[0] || "U").toUpperCase()} style={{backgroundColor: "#F97316"}} />
       <View style={{flex: 1, marginLeft: 12}}>
          <Text style={{color: "white", fontWeight: "bold"}}>{item.displayName}</Text>
          <Text style={{color: "gray", fontSize: 12}}>{item.reason || item.level || "Athlete"}</Text>
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
  );

  return (
    <View style={s.container}>
      <View style={s.progressContainer}>
         <ProgressBar progress={(step + 1) / totalSteps} color="#F97316" style={{height: 6, borderRadius: 3}} />
      </View>

      <PagerView style={s.pager} initialPage={0} ref={pagerRef} scrollEnabled={false} onPageSelected={e => setStep(e.nativeEvent.position)}>
         
         <View key="1">
            <StepLayout title="Let's get started" subtitle="What's your name?" icon="account-circle">
               <TextInput label="First Name" value={firstName} onChangeText={setFirstName} mode="outlined" style={s.input} theme={{colors:{primary:"#F97316"}}} />
               <TextInput label="Last Name" value={lastName} onChangeText={setLastName} mode="outlined" style={s.input} theme={{colors:{primary:"#F97316"}}} />
            </StepLayout>
         </View>

         <View key="2">
            <StepLayout title="When's your birthday?" subtitle="Used for age categories." icon="cake-variant">
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

         <View key="3">
            <StepLayout title="Gender" subtitle="For accurate calorie stats." icon="gender-male-female">
               {["Man", "Woman", "Non-binary", "Prefer not to say"].map(g => (
                 <TouchableOpacity key={g} onPress={() => setGender(g)} style={[s.optionBtn, gender===g && s.optionBtnSelected]}>
                    <Text style={[s.optionText, gender===g && s.optionTextSelected]}>{g}</Text>
                    {gender===g && <MaterialCommunityIcons name="check-circle" size={24} color="#F97316" />}
                 </TouchableOpacity>
               ))}
            </StepLayout>
         </View>

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

         <View key="5">
            <StepLayout title="Main Goal" subtitle="What motivates you?" icon="flag-checkered">
               {["Build a habit", "Lose weight", "Train for event", "Socialize", "Explore"].map(x => (
                 <TouchableOpacity key={x} onPress={() => setGoal(x)} style={[s.optionBtn, goal===x && s.optionBtnSelected]}>
                    <Text style={[s.optionText, goal===x && s.optionTextSelected]}>{x}</Text>
                 </TouchableOpacity>
               ))}
            </StepLayout>
         </View>

         <View key="6">
            <View style={s.page}>
               <View>
                  <Text variant="displaySmall" style={s.title}>Find Friends</Text>
                  <Text style={s.subtitle}>Follow athletes like you.</Text>
                  <Searchbar placeholder="Search name" value={searchQ} onChangeText={handleSearch} style={{backgroundColor: "#1c1c1e", marginBottom: 20}} iconColor="gray" inputStyle={{color: "white"}} />
               </View>

               <FlatList
                 data={searchQ.length > 1 ? searchResults : suggestions}
                 keyExtractor={i => i.id}
                 renderItem={renderUser}
                 ListHeaderComponent={() => (
                    !searchQ && suggestions.length > 0 ? <Text style={{color:"gray", marginBottom: 10}}>Suggested for you</Text> : null
                 )}
                 ListEmptyComponent={<Text style={{textAlign:"center", color:"gray", marginTop: 40}}>No users found</Text>}
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
echo "Done. Friend search fixed and Suggestions added. Run: npx expo start --tunnel --clear"
