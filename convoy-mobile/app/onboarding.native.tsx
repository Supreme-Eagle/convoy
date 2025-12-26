import React, { useState, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Text, TextInput, Button, ProgressBar } from "react-native-paper";
import PagerView from "react-native-pager-view";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../src/firebase";
import { useAuth } from "../src/auth/AuthProvider";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const StepLayout = ({ title, subtitle, children, icon, onNext }: any) => (
  <View style={s.page}>
     <View>
        {icon && <MaterialCommunityIcons name={icon} size={60} color="#F97316" style={{marginBottom: 20}} />}
        <Text variant="displaySmall" style={s.title}>{title}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>
     </View>
     <View style={s.content}>{children}</View>
     <Button mode="contained" onPress={onNext} style={s.btn} buttonColor="#F97316" contentStyle={{height: 50}}>
       Continue
     </Button>
  </View>
);

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

  const totalSteps = 3;

  const nextStep = async () => {
    if (step < totalSteps - 1) {
       pagerRef.current?.setPage(step + 1);
       setStep(s => s + 1);
    } else {
       await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
     if (!user) return;
     try {
       await setDoc(doc(db, "users", user.uid), {
         firstName, lastName, 
         birthday: birthday.toISOString(), 
         gender,
         onboardingComplete: true,
         displayName: `${firstName} ${lastName}`.trim(),
         photoURL: "https://i.pravatar.cc/300?u=" + user.uid
       }, { merge: true });
       
       router.replace("/(tabs)/home");
     } catch(e) { 
        console.log("Error saving profile:", e);
     }
  };

  return (
    <View style={s.container}>
      <View style={s.progressContainer}>
         <ProgressBar progress={(step + 1) / totalSteps} color="#F97316" style={{height: 6, borderRadius: 3}} />
      </View>

      <PagerView style={s.pager} initialPage={0} ref={pagerRef} scrollEnabled={false} onPageSelected={e => setStep(e.nativeEvent.position)}>
         
         {/* Step 1: Name */}
         <View key="1">
            <StepLayout title="Let's get started" subtitle="What's your name?" icon="account-circle" onNext={nextStep}>
               <TextInput label="First Name" value={firstName} onChangeText={setFirstName} mode="outlined" style={s.input} theme={{colors:{primary:"#F97316"}}} />
               <TextInput label="Last Name" value={lastName} onChangeText={setLastName} mode="outlined" style={s.input} theme={{colors:{primary:"#F97316"}}} />
            </StepLayout>
         </View>

         {/* Step 2: Birthday */}
         <View key="2">
            <StepLayout title="When's your birthday?" subtitle="Used for age categories." icon="cake-variant" onNext={nextStep}>
               <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                 <View pointerEvents="none">
                   <TextInput label="Birthday" value={birthday.toLocaleDateString()} mode="outlined" style={s.input} right={<TextInput.Icon icon="calendar" />} theme={{colors:{primary:"#F97316"}}} />
                 </View>
               </TouchableOpacity>
               {showDatePicker && (
                 <DateTimePicker value={birthday} mode="date" display="spinner" onChange={(e, d) => { setShowDatePicker(false); if(d) setBirthday(d); }} maximumDate={new Date()} />
               )}
            </StepLayout>
         </View>

         {/* Step 3: Gender */}
         <View key="3">
            <StepLayout title="Gender" subtitle="For accurate calorie stats." icon="gender-male-female" onNext={nextStep}>
               {["Man", "Woman", "Non-binary", "Prefer not to say"].map(g => (
                 <TouchableOpacity key={g} onPress={() => setGender(g)} style={[s.optionBtn, gender===g && s.optionBtnSelected]}>
                    <Text style={[s.optionText, gender===g && s.optionTextSelected]}>{g}</Text>
                    {gender===g && <MaterialCommunityIcons name="check-circle" size={24} color="#F97316" />}
                 </TouchableOpacity>
               ))}
            </StepLayout>
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
});
