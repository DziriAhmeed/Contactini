import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";

interface MessageComponentProps {
  message: string;
  time: string;
  isOwnMessage: boolean;
  isViewed?: boolean;
  mediaUrl?: string;
  viewers?: { first_name: string; last_name: string }[];
  senderAvatar?: string; // Add this prop
  message_type: "text" | "image" | "file";
  attachment_url?: string;
}

const MessageComponent: React.FC<MessageComponentProps> = ({
  message,
  time,
  isOwnMessage,
  isViewed,
  mediaUrl,
  viewers,
  senderAvatar,
  message_type,
  attachment_url,
}) => {
  const { colors } = useTheme();

  const renderContent = () => {
    switch (message_type) {
      case "image":
        return (
          <TouchableOpacity
            onPress={() => attachment_url && Linking.openURL(attachment_url)}
          >
            <Image
              source={{ uri: attachment_url }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        );
      case "file":
        return (
          <TouchableOpacity
            onPress={() => attachment_url && Linking.openURL(attachment_url)}
            style={styles.fileContainer}
          >
            <Ionicons name="document-attach" size={24} color={colors.text} />
            <Text style={[styles.fileText, { color: colors.text }]}>
              {message}
            </Text>
          </TouchableOpacity>
        );
      default:
        return (
          <Text style={[styles.messageText, { color: colors.text }]}>
            {message}
          </Text>
        );
    }
  };

  return (
    <View
      style={[styles.messageWrapper, isOwnMessage && styles.ownMessageWrapper]}
    >
      {!isOwnMessage && (
        <Image
          source={{ uri: senderAvatar || "https://via.placeholder.com/32" }}
          style={styles.senderAvatar}
        />
      )}
      <View
        style={[
          styles.messageContainer,
          isOwnMessage
            ? [styles.ownMessage, { backgroundColor: colors.primary + "20" }]
            : [styles.theirMessage, { backgroundColor: colors.card }],
        ]}
      >
        {renderContent()}
        <View style={styles.messageFooter}>
          <Text style={[styles.timestamp, { color: colors.text + "80" }]}>
            {time}
          </Text>
          {isOwnMessage && isViewed && (
            <Text style={[styles.viewedStatus, { color: colors.primary }]}>
              ✓✓
            </Text>
          )}
        </View>
        {isOwnMessage && viewers && viewers.length > 0 && (
          <Text style={[styles.viewedBy, { color: colors.text + "80" }]}>
            Viewed by {viewers.map((v) => v.first_name).join(", ")}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 5,
  },
  ownMessageWrapper: {
    flexDirection: "row-reverse",
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  messageContainer: {
    maxWidth: "70%",
    padding: 10,
    borderRadius: 10,
  },
  ownMessage: {
    backgroundColor: "#D1FAD7",
    alignSelf: "flex-end",
  },
  theirMessage: {
    backgroundColor: "#F2EBF7",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
    color: "#333",
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
    textAlign: "right",
  },
  media: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginBottom: 5,
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 5,
  },
  viewedStatus: {
    fontSize: 12,
    marginLeft: 5,
  },
  viewedBy: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
    fontStyle: "italic",
    alignSelf: "flex-end",
    paddingRight: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 4,
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
  },
  fileText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

export default MessageComponent;
