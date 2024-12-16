import React, { useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { ThemedText } from "./ThemedComponents";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string, selectedProfiles: string[]) => void;
  profiles: Profile[];
}

export default function CreateGroupModal({
  visible,
  onClose,
  onConfirm,
  profiles,
}: Props) {
  const { colors } = useTheme();
  const [groupName, setGroupName] = useState("");
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);

  const handleToggleProfile = (profileId: string) => {
    setSelectedProfiles((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId]
    );
  };

  const handleSubmit = () => {
    if (groupName.trim() && selectedProfiles.length >= 2) {
      onConfirm(groupName, selectedProfiles);
      setGroupName("");
      setSelectedProfiles([]);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>Create New Group</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, color: colors.text },
          ]}
          placeholder="Group name"
          placeholderTextColor={colors.text + "80"}
          value={groupName}
          onChangeText={setGroupName}
        />

        <ScrollView style={styles.profileList}>
          {profiles.map((profile) => (
            <TouchableOpacity
              key={profile.id}
              style={[styles.profileItem, { backgroundColor: colors.card }]}
              onPress={() => handleToggleProfile(profile.id)}
            >
              <View style={styles.profileInfo}>
                <ThemedText style={styles.profileName}>
                  {profile.first_name} {profile.last_name}
                </ThemedText>
              </View>
              <Ionicons
                name={
                  selectedProfiles.includes(profile.id)
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.border }]}
            onPress={onClose}
          >
            <ThemedText>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: colors.primary,
                opacity:
                  groupName.trim() && selectedProfiles.length >= 2 ? 1 : 0.5,
              },
            ]}
            onPress={handleSubmit}
            disabled={!groupName.trim() || selectedProfiles.length < 2}
          >
            <ThemedText style={{ color: "#fff" }}>Create</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    marginTop: 50,
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  input: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  profileList: {
    flex: 1,
  },
  profileItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  button: {
    flex: 0.48,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
    marginRight: 10,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "500",
  },
});
