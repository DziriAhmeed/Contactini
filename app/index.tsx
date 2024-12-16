import { Text, View, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { useSessionStore, useUserStore } from "@/store";

const Home = () => {
  const [loading, setLoading] = useState(true);
  const { session, setSession } = useSessionStore();
  const { setUser } = useUserStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        console.log("Session", session);
        setUser(session.user.user_metadata, session.user.id);
      }
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setUser(session.user.user_metadata, session.user.id);
      }
    });
  }, [setSession]);

  // if (loading) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
  //       <ActivityIndicator size="large" />
  //     </View>
  //   );
  // }

  if (session && session.user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
};

export default Home;
