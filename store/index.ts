import { create } from "zustand";
import { User, Session, UserStore, SessionStore } from "@/types/types";
import { decodeSession, decodeUser } from "@/utils/decoders";

export const useUserStore = create<UserStore>((set) => ({
  id: "",
  email: "", // Add email property
  first_name: "",
  last_name: "",
  phone_number: "",
  avatar_url: "",
  setUser: (userData: any, id: string) => {
    const decodedUser = decodeUser(userData, id);
    set({
      id: decodedUser.id,
      email: decodedUser.email, // Set email
      first_name: decodedUser.first_name,
      last_name: decodedUser.last_name,
      phone_number: decodedUser.phone_number,
      avatar_url: decodedUser.avatar_url,
    });
  },
  clearUser: () =>
    set({
      id: "",
      email: "", // Clear email
      first_name: "",
      last_name: "",
      phone_number: "",
      avatar_url: "",
    }),
}));

export const useSessionStore = create<SessionStore>((set) => ({
  session: null,
  setSession: (sessionData: any) => {
    if (!sessionData) {
      set({ session: null });
      return;
    }
    const decodedSession = decodeSession(sessionData);
    set({
      session: {
        user: {
          id: decodedSession.user.id,
          email: decodedSession.user.email, // Include email
          first_name: decodedSession.user.first_name,
          last_name: decodedSession.user.last_name,
          phone_number: decodedSession.user.phone_number,
          avatar_url: decodedSession.user.avatar_url,
        },
        access_token: decodedSession.access_token,
        expires_at: decodedSession.expires_at.toString(),
      },
    });
  },
  clearSession: () => set({ session: null }),
}));
