import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  TextInput,
  ActionSheetIOS,
  Alert,
} from "react-native";
import { ThemedText } from "@/components/ThemedComponents";
import { useTheme } from "@react-navigation/native";
import MessageComponent from "@/components/MessageComponent";
import { supabase, supabaseUrl } from "@/lib/supabase";
import { useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { router } from "expo-router";
import { MessageViewer } from "../(home)/chat";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { decode } from "base64-arraybuffer";
import { throttle } from "lodash";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  message_type: "text" | "image" | "file";
  created_at: string;
  viewed_by: string[];
}

interface ConversationDetails {
  id: string;
  type: "single" | "group";
  title?: string;
  users_ids: string[];
}

interface TypingStatus {
  user_id: string;
  isTyping: boolean;
  first_name?: string;
  last_name?: string;
}

interface TypingUser {
  id: string;
  name: string;
}

interface PresenceState {
  [key: string]: {
    presence_ref: string;
    user_id: string;
    isTyping: boolean;
    first_name?: string;
    last_name?: string;
  }[];
}

// Add new interface for user profile
interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
}

export default function GroupChatScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const selectedGroupId = params.id as string; // ID of the group we want to chat with
  console.log("--Selected group ID:", selectedGroupId);

  const flatListRef = React.useRef<FlatList>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [conversationDetails, setConversationDetails] =
    useState<ConversationDetails | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [userProfiles, setUserProfiles] = useState<{
    [key: string]: UserProfile;
  }>({});
  const [messageViewers, setMessageViewers] = useState<{
    [key: string]: MessageViewer[];
  }>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  interface Profile {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  }
  const [groupMemberProfiles, setGroupMemberProfiles] = useState<{
    [key: string]: Profile;
  }>({});

  // Fetch group conversation details
  useEffect(() => {
    const initializeChat = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user.id);

      const { data: groupConversation } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", selectedGroupId)
        .eq("type", "group")
        .single();

      if (groupConversation) {
        setConversationDetails(groupConversation);
      }
    };

    initializeChat();
  }, [selectedGroupId]);

  // Listen for messages
  useEffect(() => {
    if (!selectedGroupId || !currentUser) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedGroupId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      if (data) {
        setMessages(data);
        // Get unique sender IDs and fetch their profiles
        const senderIds = [...new Set(data.map((m) => m.user_id))];
        await fetchGroupMemberProfiles(senderIds);
      }
    };

    // Create and subscribe to the channel
    const channel = supabase
      .channel(`room:${selectedGroupId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedGroupId}`,
        },
        (payload) => {
          console.log("Real-time message received:", payload);

          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new as Message]);
            // Scroll to bottom when new message arrives
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    fetchMessages();

    return () => {
      console.log("Cleaning up subscription");
      channel.unsubscribe();
    };
  }, [selectedGroupId, currentUser]);

  // Add typing channel subscription
  useEffect(() => {
    if (!selectedGroupId || !currentUser) return;

    const channel = supabase.channel(`typing:${selectedGroupId}`);

    const onTyping = (payload: { userId: string; firstName: string }) => {
      if (payload.userId !== currentUser) {
        console.log("Peer is typing:", payload);
        setTypingUsers((prev) => [
          ...prev,
          { id: payload.userId, name: payload.firstName },
        ]);
        // Auto hide typing indicator after 2 seconds
        setTimeout(() => {
          setTypingUsers((prev) =>
            prev.filter((user) => user.id !== payload.userId)
          );
        }, 2000);
      }
    };

    channel.on("broadcast", { event: "typing" }, onTyping).subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [selectedGroupId, currentUser]);

  const throttledTypingEvent = useCallback(
    throttle(() => {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUser,
          firstName: userProfiles[currentUser]?.first_name,
        },
      });
    }, 3000),
    [currentUser, userProfiles]
  );

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    try {
      await sendMessage(selectedGroupId);
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const sendMessage = async (
    convId: string,
    content: string = newMessage,
    type: "text" | "image" | "file" = "text",
    attachment_url?: string,
    fileName?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          user_id: currentUser,
          content: type === "text" ? content : fileName || "",
          message_type: type,
          attachment_url,
          viewed_by: [],
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's last message time
      const { error: updateError } = await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", convId);

      if (updateError)
        console.error("Error updating conversation:", updateError);
    } catch (err) {
      console.error("Error in sendMessage:", err);
      throw err;
    }
  };

  const handleAttachment = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Library", "Send File"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) takePhoto();
          else if (buttonIndex === 2) pickImage();
          else if (buttonIndex === 3) pickDocument();
        }
      );
    } else {
      Alert.alert(
        "Send Attachment",
        "Choose an option",
        [
          { text: "Take Photo", onPress: takePhoto },
          { text: "Choose from Library", onPress: pickImage },
          { text: "Send File", onPress: pickDocument },
        ],
        { cancelable: true }
      );
    }
  };

  const handleAttachmentUpload = async (
    file: string | FormData,
    fileName: string,
    type: "image" | "file"
  ) => {
    try {
      const fileExt = fileName.split(".").pop();
      const filePath = `${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("chat-attachements")
        .upload(filePath, file);

      if (error) throw error;

      const attachment_url = `${supabaseUrl}/storage/v1/object/public/chat-attachements/${filePath}`;
      await sendMessage(selectedGroupId, "", type, attachment_url, fileName);
    } catch (error) {
      console.error("Error uploading attachment:", error);
      Alert.alert("Error", "Failed to upload attachment");
    }
  };

  const takePhoto = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission needed", "Camera permission is required");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      await handleAttachmentUpload(
        decode(result.assets[0].base64),
        result.assets[0].fileName || "photo.jpg",
        "image"
      );
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      await handleAttachmentUpload(
        decode(result.assets[0].base64),
        result.assets[0].fileName || "image.jpg",
        "image"
      );
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync();
      if (!result.canceled) {
        const formData = new FormData();
        formData.append("file", {
          uri: result.assets[0].uri,
          type: result.assets[0].mimeType,
          name: result.assets[0].name,
        } as any);

        await handleAttachmentUpload(formData, result.assets[0].name, "file");
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const handleTextChange = (text: string) => {
    setNewMessage(text);
    throttledTypingEvent();
  };

  const handleTyping = () => {
    setIsTyping(true);
    throttledTypingEvent();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  };

  // Mark messages as viewed
  const markMessagesAsViewed = async () => {
    if (!currentUser || !selectedGroupId) return;

    try {
      // First get unviewed messages
      const { data: unviewedMessages, error: fetchError } = await supabase
        .from("messages")
        .select("id, viewed_by")
        .eq("conversation_id", selectedGroupId)
        .neq("user_id", currentUser) // Only mark other users' messages
        .not("viewed_by", "cs", `{${currentUser}}`); // Not contains current user

      if (fetchError) throw fetchError;
      if (!unviewedMessages?.length) return;

      // Update each message's viewed_by array
      const { error: updateError } = await supabase
        .from("messages")
        .update({
          viewed_by: unviewedMessages.map((msg) =>
            Array.isArray(msg.viewed_by)
              ? [...new Set([...msg.viewed_by, currentUser])]
              : [currentUser]
          ),
        })
        .in(
          "id",
          unviewedMessages.map((msg) => msg.id)
        );

      if (updateError) throw updateError;
    } catch (err) {
      console.error("Error marking messages as viewed:", err);
    }
  };

  // Add function to fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("id", userId)
        .single();

      if (error) throw error;
      if (data) {
        setUserProfiles((prev) => ({
          ...prev,
          [userId]: data,
        }));
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  // Add the same fix to group chat
  const fetchMessageViewers = async (messageIds: string[]) => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in(
          "id",
          messages.flatMap((m) => m.viewed_by || [])
        );

      if (error) throw error;

      const viewersMap = messageIds.reduce((acc, messageId) => {
        const message = messages.find((m) => m.id === messageId);
        const viewers =
          message?.viewed_by
            ?.map((viewerId) => profiles?.find((p) => p.id === viewerId))
            .filter((viewer): viewer is MessageViewer => !!viewer) || [];

        acc[messageId] = viewers;
        return acc;
      }, {} as { [key: string]: MessageViewer[] });

      setMessageViewers(viewersMap);
    } catch (err) {
      console.error("Error fetching message viewers:", err);
    }
  };

  // Add this new function to fetch multiple profiles at once
  const fetchGroupMemberProfiles = async (userIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url")
        .in("id", userIds);

      if (error) throw error;

      if (data) {
        const profilesMap = data.reduce(
          (acc, profile) => ({
            ...acc,
            [profile.id]: profile,
          }),
          {}
        );

        setGroupMemberProfiles(profilesMap);
      }
    } catch (err) {
      console.error("Error fetching group member profiles:", err);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
          marginTop: Platform.OS === "ios" ? 0 : 30,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.groupHeader}>
          <View style={styles.groupIcon}>
            <Ionicons name="people" size={24} color={colors.text} />
          </View>
          <ThemedText style={styles.headerTitle}>
            {conversationDetails?.title || "Group Chat"}
          </ThemedText>
        </View>
      </View>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            item.attachment_url ? (
              <MessageComponent
                attachment_url={item.attachment_url}
                message_type={
                  ["jpg", "jpeg", "png", "gif", "webp"].includes(
                    item.attachment_url.split(".").at(-1) || ""
                  )
                    ? "image"
                    : "file"
                }
                time={new Date(item.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                isOwnMessage={item.user_id === currentUser}
                isViewed={
                  Array.isArray(item.viewed_by) && item.viewed_by.length > 0
                }
                viewers={messageViewers[item.id]}
                senderAvatar={groupMemberProfiles[item.user_id]?.avatar_url}
              />
            ) : (
              <MessageComponent
                message={item.content}
                time={new Date(item.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                isOwnMessage={item.user_id === currentUser}
                isViewed={
                  Array.isArray(item.viewed_by) && item.viewed_by.length > 0
                }
                viewers={messageViewers[item.id]}
                senderAvatar={groupMemberProfiles[item.user_id]?.avatar_url}
              />
            )
          }
          contentContainerStyle={[
            styles.messageList,
            { flexGrow: 1, justifyContent: "flex-end" },
          ]}
          onViewableItemsChanged={markMessagesAsViewed}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          inverted={false} // Ensure correct message ordering
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
        {typingUsers.length > 0 && (
          <ThemedText style={styles.typingIndicator}>
            {typingUsers.length === 1
              ? `Somone is typing...`
              : typingUsers.length === 2
              ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
              : `${typingUsers.length} people are typing...`}
          </ThemedText>
        )}
        <View
          style={[styles.inputContainer, { borderTopColor: colors.border }]}
        >
          <TouchableOpacity
            onPress={handleAttachment}
            style={styles.attachButton}
          >
            <MaterialIcons
              name="attach-file"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TextInput
            value={newMessage}
            onChangeText={handleTextChange}
            onFocus={() => {
              handleTyping();
              markMessagesAsViewed();
            }}
            placeholder="Type a message..."
            placeholderTextColor={colors.text + "80"}
            multiline
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
              },
            ]}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons name="send" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: 10,
  },
  container: {
    flex: 1,
  },
  messageList: {
    padding: 10,
    paddingBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    tintColor: Colors.common.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e1e1e1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  typingIndicator: {
    padding: 10,
    fontStyle: "italic",
    color: Colors.common.primary,
  },
  attachButton: {
    marginRight: 10,
    transform: [{ rotate: "45deg" }],
  },
});
