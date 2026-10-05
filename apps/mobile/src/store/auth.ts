import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

type User = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  avatarUrl?: string | null;
  notifyPush?: boolean;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  hydrated: boolean;
  setSession: (s: { accessToken: string; refreshToken: string; user: User }) => Promise<void>;
  clear: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (user: User) => void;
};

export const useAuth = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  setSession: async ({ accessToken, refreshToken, user }) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ accessToken, refreshToken, user });
  },
  clear: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    set({ accessToken: null, refreshToken: null, user: null });
  },
  hydrate: async () => {
    const accessToken = await SecureStore.getItemAsync('accessToken');
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    const userRaw = await SecureStore.getItemAsync('user');
    set({
      accessToken,
      refreshToken,
      user: userRaw ? JSON.parse(userRaw) : null,
      hydrated: true,
    });
  },
  setUser: (user) => {
    SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ user });
  },
}));
