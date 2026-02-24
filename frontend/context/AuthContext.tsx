import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  provider?: string;
  role?: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  exchangeGoogleSession: (sessionId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('auth_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify token with backend
        const resp = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (!resp.ok) {
          await clearAuth();
        }
      }
    } catch (e) {
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuth = async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  };

  const storeAuth = async (newToken: string, newUser: User) => {
    await AsyncStorage.setItem('auth_token', newToken);
    await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (email: string, password: string) => {
    const resp = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.detail || 'Connexion échouée');
    }
    const data = await resp.json();
    await storeAuth(data.token, data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const resp = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.detail || 'Inscription échouée');
    }
    const data = await resp.json();
    await storeAuth(data.token, data.user);
  };

  const exchangeGoogleSession = async (sessionId: string) => {
    const resp = await fetch(`${BACKEND_URL}/api/auth/google/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.detail || 'Authentification Google échouée');
    }
    const data = await resp.json();
    await storeAuth(data.token, data.user);
  };

  const loginWithGoogle = async () => {
    try {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      let redirectUrl: string;
      if (Platform.OS === 'web') {
        redirectUrl = window.location.origin + '/auth-callback';
      } else {
        // Use the app's custom scheme for deep linking back to the app
        redirectUrl = Linking.createURL('auth-callback');
      }

      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        window.location.href = authUrl;
        return;
      }

      // On mobile, use openAuthSessionAsync with the redirect URL
      // This opens an in-app browser (SFSafariViewController on iOS, Custom Tabs on Android)
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl, {
        showInRecents: true,
        preferEphemeralSession: false,
      });

      if (result.type === 'success' && result.url) {
        const url = result.url;
        // Parse session_id from hash fragment
        const hash = url.includes('#') ? url.split('#')[1] : '';
        const params = new URLSearchParams(hash);
        const sessionId = params.get('session_id');
        if (sessionId) {
          await exchangeGoogleSession(sessionId);
        } else {
          throw new Error("Session ID non trouvé dans la réponse");
        }
      } else if (result.type === 'cancel') {
        throw new Error("Authentification annulée");
      }
    } catch (e: any) {
      throw new Error(e.message || 'Connexion Google échouée');
    }
  };

  const logout = async () => {
    await clearAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        loginWithGoogle,
        logout,
        exchangeGoogleSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function apiRequest(endpoint: string, token: string | null, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(`${BACKEND_URL}/api${endpoint}`, { ...options, headers });
}
