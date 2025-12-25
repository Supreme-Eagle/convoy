import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { Button, Card, Checkbox, Text, TextInput, ActivityIndicator } from "react-native-paper";
import { Redirect, useRouter } from "expo-router";
import * as Location from "expo-location";
import { useAuth } from "../src/auth/AuthProvider";
import {
  completeOnboarding,
  ensureUserProfileDoc,
  needsOnboarding,
  subscribeToUserProfile,
  updateLocationPermission,
  UserProfile,
} from "../src/data/userProfile";

type Step = 0 | 1 | 2 | 3;

export default function OnboardingScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [step, setStep] = useState<Step>(0);
  const [finishing, setFinishing] = useState(false);

  const [username, setUsername] = useState("");
  const [age, setAge] = useState<string>("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [bikeType, setBikeType] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [locStatus, setLocStatus] = useState<"granted" | "denied" | "undetermined">("undetermined");

  // Step transition animation
  const anim = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;

  const runStepAnim = () => {
    anim.setValue(0);
    slide.setValue(18);
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  // Always run on step changes (never conditionally)
  useEffect(() => {
    runStepAnim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Profile subscription (never conditionally)
  useEffect(() => {
    let unsub: undefined | (() => void);

    (async () => {
      if (!user) {
        setLoaded(true);
        return;
      }
      setLoaded(false);
      await ensureUserProfileDoc(user.uid);
      unsub = subscribeToUserProfile(user.uid, (p) => {
        setProfile(p);
        setLoaded(true);
      });
    })().catch(() => setLoaded(true));

    return () => unsub?.();
  }, [user]);

  // Prefill from profile (never below returns)
  useEffect(() => {
    if (!profile) return;
    if (profile.username) setUsername(profile.username);
    if (typeof profile.age === "number") setAge(String(profile.age));
    if (profile.bloodGroup) setBloodGroup(profile.bloodGroup);
    if (profile.bikeType) setBikeType(profile.bikeType);
    setTermsAccepted(!!profile.termsAcceptedAt);
    setLocStatus(profile.locationPermission ?? "undetermined");
  }, [profile]);

  const shouldRedirectToHome = useMemo(() => {
    if (!user) return false;
    if (!loaded) return false;
    return !needsOnboarding(profile);
  }, [user, loaded, profile]);

  const canNext = useMemo(() => {
    if (step === 0) return username.trim().length >= 2 && !!Number(age) && !!bloodGroup.trim();
    if (step === 1) return bikeType.trim().length >= 2;
    if (step === 2) return termsAccepted; // location optional
    return true;
  }, [step, username, age, bloodGroup, bikeType, termsAccepted]);

  const requestLocation = async () => {
    if (!user) return;
    const res = await Location.requestForegroundPermissionsAsync();
    const status = (res.status === "granted" ? "granted" : "denied") as "granted" | "denied";
    setLocStatus(status);
    await updateLocationPermission(user.uid, status);
  };

  const finish = async () => {
    if (!user) return;
    setFinishing(true);
    await completeOnboarding(user.uid, {
      username,
      age: Number(age),
      bloodGroup: bloodGroup.trim(),
      bikeType: bikeType.trim(),
      locationPermission: locStatus,
    });
    router.replace("/(tabs)/home");
  };

  // ---- RENDER (returns only AFTER all hooks) ----
  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#F9FAFB" }}>Please sign in to continue onboarding.</Text>
      </View>
    );
  }

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (shouldRedirectToHome) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={{ color: "#F9FAFB", marginBottom: 12 }}>
        Setup Convoy
      </Text>

      <Card style={styles.card}>
        <Card.Content style={{ gap: 10 }}>
          <Animated.View style={{ opacity: anim, transform: [{ translateX: slide }] }}>
            {step === 0 ? (
              <>
                <Text style={{ color: "#9CA3AF" }}>Step 1/4 · Basics</Text>
                <TextInput label="Username" value={username} onChangeText={setUsername} autoCapitalize="words" />
                <TextInput label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" />
                <TextInput label="Blood group (e.g., O+)" value={bloodGroup} onChangeText={setBloodGroup} />
              </>
            ) : null}

            {step === 1 ? (
              <>
                <Text style={{ color: "#9CA3AF" }}>Step 2/4 · Bike</Text>
                <TextInput label="Bike type (e.g., Royal Enfield, KTM)" value={bikeType} onChangeText={setBikeType} />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={{ color: "#9CA3AF" }}>Step 3/4 · Permissions & Terms</Text>

                <Card style={{ backgroundColor: "#0F172A" }}>
                  <Card.Content style={{ gap: 6 }}>
                    <Text style={{ color: "#F9FAFB" }}>Location permission (optional)</Text>
                    <Text style={{ color: "#9CA3AF" }}>
                      Used for nearby rides, live ride tracking, and SOS distance. You can enable it later from system settings.
                    </Text>
                    <Text style={{ color: "#9CA3AF" }}>Current: {locStatus}</Text>
                    {locStatus !== "granted" ? (
                      <Button mode="outlined" onPress={requestLocation}>
                        Allow location
                      </Button>
                    ) : (
                      <Text style={{ color: "#34D399" }}>Granted — no further prompts.</Text>
                    )}
                  </Card.Content>
                </Card>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Checkbox status={termsAccepted ? "checked" : "unchecked"} onPress={() => setTermsAccepted(!termsAccepted)} />
                  <Text style={{ color: "#F9FAFB", flex: 1 }}>I accept the Terms & Conditions</Text>
                </View>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Text style={{ color: "#9CA3AF" }}>Step 4/4 · Review</Text>
                <Text style={{ color: "#F9FAFB" }}>Username: {username}</Text>
                <Text style={{ color: "#F9FAFB" }}>Age: {age}</Text>
                <Text style={{ color: "#F9FAFB" }}>Blood group: {bloodGroup}</Text>
                <Text style={{ color: "#F9FAFB" }}>Bike: {bikeType}</Text>
                <Text style={{ color: "#F9FAFB" }}>Location: {locStatus}</Text>
                <Text style={{ color: "#F9FAFB" }}>T&C: {termsAccepted ? "Accepted" : "Not accepted"}</Text>
              </>
            ) : null}
          </Animated.View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <Button
              mode="outlined"
              onPress={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))}
              disabled={step === 0 || finishing}
              style={{ flex: 1 }}
            >
              Back
            </Button>

            {step < 3 ? (
              <Button
                mode="contained"
                onPress={() => setStep((s) => ((s + 1) as Step))}
                disabled={!canNext || finishing}
                style={{ flex: 1 }}
              >
                Next
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={finish}
                disabled={!termsAccepted || finishing}
                loading={finishing}
                style={{ flex: 1 }}
              >
                Finish
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617", padding: 16, paddingTop: 24 },
  center: { flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center", padding: 16 },
  card: { backgroundColor: "#0B1120", borderRadius: 18 },
});
