import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useSessionStore } from "@/store";
import { Feather } from "@expo/vector-icons";
import {
  Modal,
  Alert,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  ActionSheetIOS,
  Platform,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase, supabaseUrl } from "@/lib/supabase";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { ThemedInput } from "@/components/ThemedComponents";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";

const Profiles = () => {
  const { clearSession, session, setSession } = useSessionStore();
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: session?.user.first_name || "",
    last_name: session?.user.last_name || "",
    email: session?.user.email || "",
    phone_number: session?.user.phone_number || "",
  });

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: string) => {
    if (!session?.user.id) return;

    try {
      await supabase
        .from("profiles")
        .update({ is_active: nextAppState === "active" })
        .eq("id", session.user.id);
    } catch (error) {
      console.error("Error updating active status:", error);
    }
  };

  // Validation functions from sign-up
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const validatePhoneNumber = (number: string) => {
    return /^\d{8,15}$/.test(number);
  };

  const handleSignOut = async () => {
    try {
      // Update is_active to false before signing out
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_active: false })
        .eq("id", session?.user.id);

      if (updateError) throw updateError;

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearSession();
      setIsLogoutModalVisible(false);
      router.replace("/(auth)/sign-in");
    } catch (error: any) {
      console.error("Error signing out:", error.message);
    }
  };

  const handleEditProfile = () => {
    setIsEditModalVisible(true);
  };

  const handleUpdateProfile = async () => {
    try {
      // Validation
      if (
        !form.first_name ||
        !form.last_name ||
        !form.email ||
        !form.phone_number
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

      const {
        data: { user },
        error,
      } = await supabase.auth.updateUser({
        email: form.email,
        data: {
          first_name: form.first_name,
          last_name: form.last_name,
          phone_number: form.phone_number,
        },
      });

      if (error) throw error;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          phone_number: form.phone_number,
        })
        .eq("id", session?.user.id);

      // Refresh session to get updated user data
      const {
        data: { session: newSession },
      } = await supabase.auth.getSession();
      if (newSession) {
        setSession(newSession);
        console.log("Updated user:", newSession);
        setIsEditModalVisible(false);
        Alert.alert("Success", "Profile updated successfully");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleImageSelection = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Library"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickImage();
          }
        }
      );
    } else {
      Alert.alert("Select Image", "Choose an option", [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: takePhoto },
        { text: "Choose from Library", onPress: pickImage },
      ]);
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Camera permission is required");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        base64: true,
      });

      if (!result.canceled) {
        await handleImageUpload(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        base64: true,
      });

      if (!result.canceled) {
        await handleImageUpload(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleImageUpload = async (asset: ImagePicker.ImagePickerAsset) => {
    setSelectedImage(asset.base64);
    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(asset.fileName, decode(asset.base64), {
        contentType: "image/jpeg",
      });

    const imageLink =
      supabaseUrl + "/storage/v1/object/public/avatars/" + asset.fileName;
    setForm((prev) => ({ ...prev, avatar_url: imageLink }));
    setSelectedImage(imageLink);

    const {
      data: { user },
    } = await supabase.auth.updateUser({
      email: form.email,
      data: {
        avatar_url: imageLink,
      },
    });

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        avatar_url: imageLink,
      })
      .eq("id", session?.user.id);
  };

  const renderAvatar = (uri?: string) => {
    if (!uri || uri === "https://bit.ly/3SeWv1y") {
      return (
        <View style={styles.defaultAvatar}>
          <Feather name="user" size={40} color={Colors.common.inputText} />
        </View>
      );
    }
    return <Image source={{ uri }} style={styles.avatar} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.profileHeader}>
          <TouchableOpacity
            onPress={handleImageSelection}
            style={styles.avatarContainer}
          >
            {renderAvatar(selectedImage || session?.user.avatar_url)}
            <View style={styles.editAvatarButton}>
              <Feather name="camera" size={16} color={Colors.common.white} />
            </View>
          </TouchableOpacity>
          <View style={styles.userInfoContainer}>
            <View style={styles.nameContainer}>
              <ThemedText style={styles.nameText}>
                {session?.user.first_name}
              </ThemedText>
              <ThemedText style={styles.nameText}>
                {session?.user.last_name}
              </ThemedText>
            </View>
            <ThemedText style={styles.phoneText}>
              Phone number: {session?.user.phone_number || "Not set"}
            </ThemedText>
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.button} onPress={handleEditProfile}>
            <ThemedText>Edit Profile</ThemedText>
            <Feather name="chevron-right" size={24} color={Colors.light.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setIsLogoutModalVisible(true)}
          >
            <ThemedText style={styles.logoutText}>Log Out</ThemedText>
            <Feather name="chevron-right" size={24} color={Colors.light.icon} />
          </TouchableOpacity>
        </View>

        <Modal
          animationType="fade"
          transparent={true}
          visible={isLogoutModalVisible}
          onRequestClose={() => setIsLogoutModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Logout</ThemedText>
              <ThemedText style={styles.modalText}>
                Are you sure you want to log out?
              </ThemedText>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsLogoutModalVisible(false)}
                >
                  <ThemedText>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.logoutButton]}
                  onPress={handleSignOut}
                >
                  <ThemedText>Logout</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Profile Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isEditModalVisible}
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.editModalContent]}>
              <ThemedText style={styles.modalTitle}>Edit Profile</ThemedText>
              <ThemedInput
                placeholder="First Name"
                value={form.first_name}
                onChangeText={(value) =>
                  setForm({ ...form, first_name: value })
                }
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
                keyboardType="email-address"
              />
              <ThemedInput
                placeholder="Phone Number"
                value={form.phone_number}
                onChangeText={(value) =>
                  setForm({ ...form, phone_number: value })
                }
                keyboardType="numeric"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsEditModalVisible(false)}
                >
                  <ThemedText>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.updateButton]}
                  onPress={handleUpdateProfile}
                >
                  <ThemedText style={styles.updateButtonText}>
                    Update
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default Profiles;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userInfoContainer: {
    marginLeft: 20,
    flex: 1,
  },
  nameContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  nameText: {
    fontSize: 18,
  },
  phoneText: {
    fontSize: 14,
    color: Colors.light.inputText,
  },
  buttonsContainer: {
    gap: 0,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.border,
  },
  buttonText: {
    fontSize: 16,
  },
  logoutText: {
    color: Colors.common.danger,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.common.inputText,
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: Colors.common.border,
  },
  logoutButton: {
    backgroundColor: Colors.common.danger,
  },
  editModalContent: {
    backgroundColor: Colors.common.inputText,
    maxHeight: "80%",
    gap: 16,
  },
  updateButton: {
    backgroundColor: Colors.common.primary,
  },
  updateButtonText: {
    color: Colors.common.white,
  },
  avatarContainer: {
    position: "relative",
  },
  editAvatarButton: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: Colors.common.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.common.white,
  },
  avatarPickerButton: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  changeAvatarText: {
    color: Colors.common.primary,
    fontSize: 16,
  },
  defaultAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.common.border,
    justifyContent: "center",
    alignItems: "center",
  },
});
