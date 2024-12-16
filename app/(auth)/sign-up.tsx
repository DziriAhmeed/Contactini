import { supabase } from "@/lib/supabase";
import { useSessionStore } from "@/store";
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
import { Ionicons } from "@expo/vector-icons"; // Add this import
import {
  ThemedText,
  ThemedInput,
  ThemedButton,
} from "@/components/ThemedComponents";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  phone_number?: string;
  is_active: boolean; // Add this line
  last_message?: {
    content: string;
    created_at: string;
  };
  conversation_id?: string;
};

const SignUp = () => {
  const [loading, setLoading] = useState(false);
  const [withCallingCode, setWithCallingCode] = useState(true);
  const { session, setSession } = useSessionStore();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    password: "",
    confirmPassword: "",
    avatar_url: "https://bit.ly/3SeWv1y", // default avatar URL
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const validatePhoneNumber = (number: string) => {
    return /^\d{8,15}$/.test(number);
  };

  async function handleSignUp() {
    try {
      if (
        !form.first_name ||
        !form.last_name ||
        !form.email ||
        !form.phone_number ||
        !form.password ||
        !form.confirmPassword
      ) {
        Alert.alert("Error", "All fields must be filled.");
        return;
      }

      if (!EMAIL_REGEX.test(form.email)) {
        Alert.alert("Error", "Please enter a valid email address.");
        return;
      }

      if (!validatePhoneNumber(form.phone_number)) {
        Alert.alert("Error", "Please enter a valid phone number.");
        return;
      }

      if (form.password.length < 6) {
        Alert.alert("Error", "Password must be at least 6 characters long.");
        return;
      }

      if (form.password !== form.confirmPassword) {
        Alert.alert("Error", "Passwords do not match.");
        return;
      }

      setLoading(true);
      console.log(form);

      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            phone_number: form.phone_number,
            avatarUrl: form.avatar_url,
            is_active: true, // Add this line
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        setSession(data.session);
        Alert.alert("Success", "Account created successfully!");
      } else {
        Alert.alert(
          "Success",
          "Please check your email for verification instructions!"
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
      console.error("Detailed error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <ThemedText style={styles.title}>Create Your Account</ThemedText>

          <ThemedInput
            placeholder="First Name"
            value={form.first_name}
            onChangeText={(value) => setForm({ ...form, first_name: value })}
          />
          <ThemedInput
            placeholder="Last Name"
            value={form.last_name}
            onChangeText={(value) => setForm({ ...form, last_name: value })}
          />
          <ThemedInput
            placeholder="Email"
            value={form.email}
            onChangeText={(value) => setForm({ ...form, email: value })}
          />
          <ThemedInput
            placeholder="Phone Number"
            keyboardType="numeric"
            value={form.phone_number}
            onChangeText={(value) => setForm({ ...form, phone_number: value })}
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
          <ThemedInput
            placeholder="Confirm Password"
            secureTextEntry={!showConfirmPassword}
            value={form.confirmPassword}
            onChangeText={(value) =>
              setForm({ ...form, confirmPassword: value })
            }
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            }
          />

          <ThemedButton onPress={handleSignUp}>Sign Up</ThemedButton>

          <View style={styles.signUpLinkWrapper}>
            <ThemedText>Don't have an account? </ThemedText>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")}>
              <ThemedText style={styles.signUpLink}>Sign In</ThemedText>
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

export default SignUp;
