import { UserResponse, SessionResponse } from "@/types/types";

export const decodeUser = (userData: any, id: string): UserResponse => {
  return {
    id: id,
    email: userData.email,
    first_name: userData.first_name,
    last_name: userData.last_name,
    phone_number: userData.phone_number,
    avatar_url: userData.avatar_url,
  };
};

export const decodeSession = (session: any): SessionResponse => {
  return {
    access_token: session.access_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    refresh_token: session.refresh_token,
    token_type: session.token_type,
    user: decodeUser(session.user.user_metadata, session.user.id),
  };
};
