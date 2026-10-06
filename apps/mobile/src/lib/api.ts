import Constants from 'expo-constants';
import { useAuth } from '../store/auth';

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
export const API_BASE = extra?.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:4000';

let refreshPromise: Promise<string | null> | null = null;

async function rotateAccessToken(): Promise<string | null> {
  const { refreshToken, setSession, clear, user } = useAuth.getState();
  if (!refreshToken) {
    await clear();
    return null;
  }
  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await clear();
    return null;
  }
  const data = await res.json();
  await setSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user ?? user!,
  });
  return data.accessToken as string;
}

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = rotateAccessToken().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth: useAuthToken = true, ...requestOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(requestOptions.headers as Record<string, string>),
  };
  if (useAuthToken) {
    const token = useAuth.getState().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...requestOptions, headers });
  } catch {
    throw new Error('Cannot reach SalonSlot. Check your connection and try again.');
  }
  if (res.status === 401 && useAuthToken) {
    const next = await refreshAccessToken();
    if (next) {
      headers.Authorization = `Bearer ${next}`;
      try {
        res = await fetch(`${API_BASE}${path}`, { ...requestOptions, headers });
      } catch {
        throw new Error('Cannot reach SalonSlot. Check your connection and try again.');
      }
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}
