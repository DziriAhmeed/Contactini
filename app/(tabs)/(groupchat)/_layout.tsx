import React from "react";
import { Stack } from "expo-router";

export default function GroupChatLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Groups",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="chat"
        options={{
          title: "Group Chat",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
