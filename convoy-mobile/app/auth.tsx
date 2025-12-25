import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, Card } from "react-native-paper";
import { useAuth } from "../src/auth/AuthProvider";
import { useRouter } from "expo-router";

export default function AuthScreen() {
  const { signIn, signUp, user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (user) router.replace("/(tabs)");
  }, [user, router]);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Card style={styles.card} mode="elevated">
          <Card.Content style={{ gap: 12 }}>
            <Text variant="titleLarge" style={styles.title}>
              {mode === "signin" ? "Welcome back" : "Create account"}
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TextInput
              label="Email"
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              label="Password"
              mode="outlined"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <Button
              mode="contained"
              loading={loading}
              disabled={loading}
              onPress={handleSubmit}
              style={styles.button}
            >
              {mode === "signin" ? "Sign in" : "Sign up"}
            </Button>
            <Button
              mode="text"
              onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin"
                ? "Need an account? Sign up"
                : "Have an account? Sign in"}
            </Button>
          </Card.Content>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  container: { flex: 1, justifyContent: "center", padding: 16 },
  card: { backgroundColor: "#0B1120", borderRadius: 18 },
  title: { color: "#F9FAFB", marginBottom: 4, textAlign: "center" },
  error: { color: "#F97373", fontSize: 12 },
  button: { marginTop: 8, borderRadius: 999 },
});
