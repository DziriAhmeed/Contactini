export interface User {
  id: string;
  email: string; // Add email property
  first_name: string;
  last_name: string;
  phone_number: string;
  avatar_url: string;
}

export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  avatar_url: string;
}

export interface SessionResponse {
  access_token: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  user: UserResponse;
}

export interface Session {
  user: User;
  access_token: string;
  expires_at: string;
}

export interface UserStore extends User {
  setUser: (userData: any, id: string) => void;
  clearUser: () => void;
}

export interface SessionStore {
  session: Session | null;
  setSession: (session: any) => void;
  clearSession: () => void;
}
