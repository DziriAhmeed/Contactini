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
  Image,
  ActionSheetIOS,
  Alert,
} from "react-native";
import { ThemedText } from "@/components/ThemedComponents";
import { useTheme } from "@react-navigation/native";
import MessageComponent from "@/components/MessageComponent";
import { supabase, supabaseUrl } from "@/lib/supabase";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { decode } from "base64-arraybuffer";
import { throttle } from "lodash";

// TypeScript Interfaces
interface Conversation {
  id: string;
  users_ids: string[];
  type: "single"; // Remove group type
  created_at: string;
  last_message_at?: string;
}

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
  type: "single";
  title?: string;
  users_ids: string[];
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_active: boolean; // Add is_active field
}

interface TypingStatus {
  user_id: string;
  isTyping: boolean;
  first_name?: string;
  last_name?: string;
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

export interface MessageViewer {
  id: string;
  first_name: string;
  last_name: string;
}

export default function ChatScreen({}) {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const selectedUserId = params.userId as string; // Change from id to userId
  console.log("--Selected user ID:", selectedUserId);

  const flatListRef = React.useRef<FlatList>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationDetails, setConversationDetails] =
    useState<ConversationDetails | null>(null);
  const [profileDetails, setProfileDetails] = useState<Profile | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const [peerTypingName, setPeerTypingName] = useState<string>("");
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [messageViewers, setMessageViewers] = useState<{
    [key: string]: MessageViewer[];
  }>({});
  const [usersProfiles, setUsersProfiles] = useState<{
    [key: string]: Profile;
  }>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Find or create conversation
  useEffect(() => {
    const initializeChat = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user.id);

      // Fetch profile details
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", selectedUserId)
        .single();

      if (profile) {
        setProfileDetails(profile);
      }

      // Look for direct conversation with the user
      const { data: directConversations } = await supabase
        .from("conversations")
        .select("*")
        .eq("type", "single")
        .contains("users_ids", [user.id])
        .contains("users_ids", [selectedUserId]);

      const directConversation = directConversations?.find(
        (conv) =>
          conv.users_ids.length === 2 &&
          conv.users_ids.includes(user.id) &&
          conv.users_ids.includes(selectedUserId)
      );

      if (directConversation) {
        setConversationId(directConversation.id);
        setConversationDetails(directConversation);
      }
    };

    initializeChat();
  }, [selectedUserId]);

  // Listen for messages
  useEffect(() => {
    if (!conversationId || !currentUser) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      if (data) {
        setMessages(data);
        // Fetch profiles for all message senders
        const senderIds = [...new Set(data.map((m) => m.user_id))];
        senderIds.forEach(fetchUserProfile);
      }
    };

    // Create and subscribe to the channel
    const channel = supabase
      .channel(`room:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
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
  }, [conversationId, currentUser]);

  // Add typing channel subscription
  useEffect(() => {
    if (!conversationId || !currentUser) return;

    const channel = supabase.channel(`typing:${conversationId}`);

    const onTyping = (payload: { userId: string; firstName: string }) => {
      if (payload.userId !== currentUser) {
        console.log("Peer is typing:", payload);
        setPeerIsTyping(true);
        setPeerTypingName(payload.firstName);
        // Auto hide typing indicator after 2 seconds
        setTimeout(() => {
          setPeerIsTyping(false);
          setPeerTypingName("");
        }, 2000);
      }
    };

    channel.on("broadcast", { event: "typing" }, onTyping).subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, currentUser]);

  const throttledTypingEvent = useCallback(
    throttle(() => {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUser,
          firstName: profileDetails?.first_name,
        },
      });
    }, 3000),
    [currentUser, profileDetails]
  );

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    try {
      // Stop typing indicator when sending message
      setPeerIsTyping(false);
      setPeerTypingName("");

      if (!conversationId) {
        // Only create new conversations for single chats
        const { data: newConversation, error: convError } = await supabase
          .from("conversations")
          .insert({
            users_ids: [currentUser, selectedUserId],
            type: "single",
            created_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (convError) throw convError;
        setConversationId(newConversation.id);
        setConversationDetails(newConversation);
        await sendMessage(newConversation.id);
      } else {
        await sendMessage(newMessage);
      }

      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const sendMessage = async (
    content: string,
    type: "text" | "image" | "file" = "text",
    attachment_url?: string,
    fileName?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
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
        .eq("id", conversationId);

      if (updateError)
        console.error("Error updating conversation:", updateError);
    } catch (err) {
      console.error("Error in sendMessage:", err);
      throw err;
    }
  };

  // Mark messages as viewed
  const markMessagesAsViewed = async () => {
    if (!currentUser || !conversationId || !messages.length) return;

    try {
      const lastMessage = messages[messages.length - 1];
      console.log("Last message:", lastMessage);

      // Only proceed if the last message is from peer and not viewed by current user
      if (
        lastMessage.user_id !== currentUser &&
        !lastMessage.viewed_by?.includes(currentUser)
      ) {
        // First, get the current viewed_by array
        const { data: currentMessage } = await supabase
          .from("messages")
          .select("viewed_by")
          .eq("id", lastMessage.id)
          .single();

        // Create new viewed_by array combining existing viewers and current user
        const updatedViewedBy = Array.isArray(currentMessage?.viewed_by)
          ? [...new Set([...currentMessage.viewed_by, currentUser])]
          : [currentUser];

        // Update with the combined array
        const { error: updateError, data } = await supabase
          .from("messages")
          .update({
            viewed_by: updatedViewedBy,
          })
          .eq("id", lastMessage.id)
          .select();

        if (updateError) throw updateError;
        console.log("Message marked as viewed:", data);

        // Update local state
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === lastMessage.id
              ? { ...msg, viewed_by: updatedViewedBy }
              : msg
          )
        );

        await fetchMessageViewers([lastMessage.id]);
      }
    } catch (err) {
      console.error("Error marking message as viewed:", err);
    }
  };

  // Fix the fetchMessageViewers function
  const fetchMessageViewers = async (messageIds: string[]) => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in(
          "id",
          messages.flatMap((m) => m.viewed_by || [])
        ); // Get all viewer IDs

      if (error) throw error;

      const viewersMap = messageIds.reduce((acc, messageId) => {
        const message = messages.find((m) => m.id === messageId);
        const viewers =
          message?.viewed_by
            ?.map((viewerId) => profiles?.find((p) => p.id === viewerId))
            .filter((viewer): viewer is MessageViewer => !!viewer) || []; // Type guard to ensure non-null

        acc[messageId] = viewers;
        return acc;
      }, {} as { [key: string]: MessageViewer[] });

      viewersMap;
    } catch (err) {
      console.error("Error fetching message viewers:", err);
    }
  };

  // Fetch user profile with is_active status
  const fetchUserProfile = async (userId: string) => {
    if (usersProfiles[userId]) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      if (data) {
        setUsersProfiles((prev) => ({
          ...prev,
          [userId]: data,
        }));
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
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
          // { text: "Cancel", style: "cancel" },
          { text: "Take Photo", onPress: takePhoto },
          { text: "Choose from Library", onPress: pickImage },
          { text: "Send File", onPress: pickDocument }, // Added this line
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
      await sendMessage("", type, attachment_url, fileName);
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
        <View style={styles.profileHeader}>
          <Image
            source={{
              uri:
                profileDetails?.avatar_url || "https://via.placeholder.com/40",
            }}
            style={styles.avatar}
          />
          {profileDetails?.is_active && <View style={styles.activeIndicator} />}
          <ThemedText style={styles.headerTitle}>
            {profileDetails
              ? `${profileDetails.first_name} ${profileDetails.last_name}`
              : "Chat"}
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
                senderAvatar={usersProfiles[item.user_id]?.avatar_url}
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
                senderAvatar={usersProfiles[item.user_id]?.avatar_url}
              />
            )
          }
          contentContainerStyle={[
            styles.messageList,
            { flexGrow: 1, justifyContent: "flex-end" },
          ]}
          inverted={false} // Ensure correct message ordering
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
        {peerIsTyping && (
          <ThemedText style={styles.typingIndicator}>
            {peerTypingName ? `${peerTypingName} is typing...` : "typing..."}
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
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  typingIndicator: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: "italic",
    marginLeft: 16,
    marginBottom: 4,
  },
  attachButton: {
    marginRight: 10,
    transform: [{ rotate: "45deg" }],
  },
  activeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "green",
    position: "absolute",
    top: 0,
    right: 0,
  },
});
