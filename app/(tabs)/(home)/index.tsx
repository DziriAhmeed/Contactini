import React from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  Pressable,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useSessionStore } from "@/store";
import { ThemedText, ThemedButton } from "@/components/ThemedComponents";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  phone_number?: string;
  last_message?: {
    content: string;
    created_at: string;
  };
  conversation_id?: string;
  is_active?: boolean;
};

export default function HomeScreen() {
  const { clearSession, session } = useSessionStore();
  const { colors } = useTheme();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProfiles = profiles.filter((profile) => {
    const fullName = `${profile.first_name} ${profile.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  useEffect(() => {
    fetchProfiles();

    // Subscribe to both messages and profile changes
    const messagesChannel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          fetchProfiles();
        }
      )
      .subscribe();

    // Add new subscription for profile changes
    const profilesChannel = supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          // Update the specific profile's active status
          setProfiles((currentProfiles) =>
            currentProfiles.map((profile) =>
              profile.id === payload.new.id
                ? { ...profile, is_active: payload.new.is_active }
                : profile
            )
          );
        }
      )
      .subscribe();

    return () => {
      messagesChannel.unsubscribe();
      profilesChannel.unsubscribe();
    };
  }, [session?.user.id]);

  const fetchProfiles = async () => {
    try {
      // Get single chat conversations only
      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select(
          `
          id,
          users_ids,
          type,
          messages (
            content,
            created_at,
            user_id
          )
        `
        )
        .eq("type", "single")
        .contains("users_ids", [session?.user.id])
        .order("last_message_at", { ascending: false });

      if (convError) throw convError;

      // Get all profiles except current user
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", session?.user.id);

      if (profileError) throw profileError;

      // Match profiles with their conversations and sort by last message
      const profilesWithMessages = profiles
        .map((profile) => {
          const conversation = conversations?.find(
            (conv) =>
              conv.users_ids.length === 2 &&
              conv.users_ids.includes(profile.id) &&
              conv.users_ids.includes(session?.user.id)
          );

          const sortedMessages =
            conversation?.messages?.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            ) || [];

          return {
            ...profile,
            last_message: sortedMessages[0] || null,
            conversation_id: conversation?.id,
            last_message_time: sortedMessages[0]?.created_at || "0",
          };
        })
        .sort((a, b) => {
          // Sort profiles by last message time
          const timeA = a.last_message_time;
          const timeB = b.last_message_time;
          return new Date(timeB).getTime() - new Date(timeA).getTime();
        });

      setProfiles(profilesWithMessages);
    } catch (error: any) {
      console.error("Error fetching profiles:", error.message);
    }
  };

  const handleProfileClick = (selectedUser: Profile) => {
    router.push({
      pathname: "/(tabs)/(home)/chat",
      params: {
        userId: selectedUser.id, // Pass user ID directly instead of conversation ID
      },
    });
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return days === 1 ? "Yesterday" : `${days} days ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const renderProfile = ({ item }: { item: Profile }) => (
    <Pressable
      style={[styles.profileItem, { borderBottomColor: colors.border }]}
      onPress={() => handleProfileClick(item)}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{
            uri: item.avatar_url || "https://via.placeholder.com/50",
          }}
          style={styles.avatar}
        />
        {item.is_active && <View style={styles.activeIndicator} />}
      </View>
      <View style={styles.profileInfo}>
        <ThemedText style={styles.profileName}>
          {item.first_name} {item.last_name}
        </ThemedText>
        <View style={styles.messageRow}>
          <ThemedText style={styles.lastMessage} numberOfLines={1}>
            {item.last_message ? item.last_message.content : "No messages yet"}
          </ThemedText>
          {item.last_message && (
            <ThemedText style={styles.messageTime}>
              {formatMessageTime(item.last_message.created_at)}
            </ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Profiles</ThemedText>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons
          name="search"
          size={20}
          color={colors.text}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search contacts..."
          placeholderTextColor={colors.text + "80"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredProfiles}
        renderItem={renderProfile}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
    width: "100%",
  },
  profileItem: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  activeIndicator: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  lastSeen: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
});
