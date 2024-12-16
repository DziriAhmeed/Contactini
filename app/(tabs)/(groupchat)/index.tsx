import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useSessionStore } from "@/store";
import { ThemedText } from "@/components/ThemedComponents";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import CreateGroupModal from "@/components/CreateGroupModal";

interface GroupChat {
  id: string;
  title: string;
  users_ids: string[];
  last_message?: {
    content: string;
    created_at: string;
  };
}

interface GroupItemProps {
  group: GroupChat;
  onPress: () => void;
}

const GroupItem = ({ group, onPress }: GroupItemProps) => {
  const { colors } = useTheme();

  const formatMessageTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return days === 1 ? "Yesterday" : `${days} days ago`;
    if (hours > 0) return `${hours}h ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Pressable
      style={[styles.groupItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.groupInfo}>
        <ThemedText style={styles.groupTitle}>{group.title}</ThemedText>
        <View style={styles.messageRow}>
          <ThemedText style={styles.lastMessage} numberOfLines={1}>
            {group.last_message
              ? group.last_message.content
              : "No messages yet"}
          </ThemedText>
          {group.last_message && (
            <ThemedText style={styles.messageTime}>
              {formatMessageTime(group.last_message.created_at)}
            </ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default function GroupChatScreen() {
  const { session } = useSessionStore();
  const { colors } = useTheme();
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          id,
          title,
          users_ids,
          messages (
            content,
            created_at,
            user_id
          )
        `
        )
        .eq("type", "group")
        .contains("users_ids", [session?.user.id])
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      const groupsWithMessages = data.map((group) => {
        const sortedMessages =
          group.messages?.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          ) || [];

        return {
          ...group,
          last_message: sortedMessages[0] || null,
        };
      });

      setGroups(groupsWithMessages);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  useEffect(() => {
    const fetchAvailableProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", session?.user.id);

      if (!error && data) {
        setAvailableProfiles(data);
      }
    };

    fetchAvailableProfiles();
    fetchGroups();
  }, [session?.user.id]);

  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    try {
      const { error } = await supabase.from("conversations").insert({
        users_ids: [...memberIds, session?.user.id],
        type: "group",
        title: name,
        created_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      });

      if (error) throw error;
      setIsModalVisible(false);
      fetchGroups();
    } catch (err) {
      console.error("Error creating group:", err);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Groups</ThemedText>
      </View>

      <FlatList
        data={groups}
        renderItem={({ item }) => (
          <GroupItem
            group={item}
            onPress={() => {
              router.push({
                pathname: "/(tabs)/(groupchat)/chat",
                params: { id: item.id },
              });
            }}
          />
        )}
        keyExtractor={(item) => item.id}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons name="people" size={24} color="#fff" />
      </TouchableOpacity>

      <CreateGroupModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onConfirm={handleCreateGroup}
        profiles={availableProfiles}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  groupItem: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
    borderBottomWidth: 1,
  },
  groupInfo: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    opacity: 0.7,
    flex: 1,
    marginRight: 8,
  },
  messageTime: {
    fontSize: 12,
    opacity: 0.5,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
