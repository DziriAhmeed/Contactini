import { router, Redirect } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useSessionStore, useUserStore } from "@/store";
import { Ionicons } from "@expo/vector-icons"; // Add this import
import {
  ThemedText,
  ThemedInput,
  ThemedButton,
} from "@/components/ThemedComponents";

interface FormState {
  email: string;
  password: string;
}

const SignIn: React.FC = () => {
  const [form, setForm] = useState<FormState>({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const { session, setSession } = useSessionStore(); // Add session here
  const { setUser } = useUserStore();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      console.log("Session", session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  const handleSignIn = async () => {
    try {
      if (!form.email || !form.password) {
        Alert.alert("Error", "All fields must be filled.");
        return;
      }
      if (!isValidEmail(form.email)) {
        Alert.alert("Error", "Please enter a valid email.");
        return;
      }

      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) throw error;

      if (data.session) {
        console.log("data", data);

        // Set is_active to true after successful login
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ is_active: true })
          .eq("id", data.session.user.id);

        if (updateError) throw updateError;

        // Create presence channel for real-time status
        const presenceChannel = supabase.channel("online-users");
        await presenceChannel
          .on("presence", { event: "sync" }, () => {
            console.log("Online users synced");
          })
          .on("presence", { event: "join" }, ({ key }) => {
            console.log("User joined:", key);
          })
          .on("presence", { event: "leave" }, ({ key }) => {
            console.log("User left:", key);
            // Update user's active status to false when they leave
            supabase
              .from("profiles")
              .update({ is_active: false })
              .eq("id", key);
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await presenceChannel.track({ user_id: data.session.user.id });
            }
          });

        setSession(data.session);
        setUser(data.session.user.user_metadata, data.session.user.id);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
      console.error("Sign-in error:", error);
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <ThemedText style={styles.title}>Sign In</ThemedText>

          <ThemedInput
            placeholder="Email"
            value={form.email}
            onChangeText={(value) => setForm({ ...form, email: value })}
          />
          <ThemedInput
            placeholder="Password"
            secureTextEntry={!showPassword}
            value={form.password}
            onChangeText={(value) => setForm({ ...form, password: value })}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            }
          />

          <ThemedButton onPress={handleSignIn}>Sign In</ThemedButton>

          <View style={styles.signUpLinkWrapper}>
            <ThemedText>Don't have an account? </ThemedText>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
              <ThemedText style={styles.signUpLink}>Sign Up</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
  },
  signUpLinkWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  signUpLink: {
    color: "#80BAFF",
    fontWeight: "bold",
  },
});

export default SignIn;
