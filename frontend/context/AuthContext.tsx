import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://quran-courses-1.preview.emergentagent.com';

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
  login: (email: string, password: string) => Promise<any>;
  register: (name: string, email: string, password: string, referralCode?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<any>;
  logout: () => Promise<void>;
  exchangeGoogleSession: (sessionId: string) => Promise<any>;
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
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
    } catch (e) {
      // Fallback for web if AsyncStorage fails
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    setToken(null);
    setUser(null);
  };

  const storeAuth = async (newToken: string, newUser: User) => {
    await AsyncStorage.setItem('auth_token', newToken);
    await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (email: string, password: string): Promise<any> => {
    const resp = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.detail || 'Connexion échouée');
    }
    await storeAuth(data.token, data.user);
    return data.user;  // Return user data for subscription check
  };

  const register = async (name: string, email: string, password: string, referralCode?: string) => {
    const body: any = { name, email, password };
    if (referralCode) {
      body.referral_code = referralCode.toUpperCase();
    }
    const resp = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.detail || 'Inscription échouée');
    }
    await storeAuth(data.token, data.user);
  };

  const exchangeGoogleSession = async (sessionId: string): Promise<any> => {
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
    return data.user;  // Return user data for subscription check
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

  const loginWithApple = async (): Promise<any> => {
    try {
      // Get Apple auth URL from backend
      const resp = await fetch(`${BACKEND_URL}/api/auth/apple/login`);
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || 'Apple Sign-In non disponible');
      }
      const { auth_url } = await resp.json();
      
      if (Platform.OS === 'web') {
        // For web, redirect to Apple auth page
        // Apple will POST back to our callback URL
        window.location.href = auth_url;
        return;
      }
      
      // For mobile, open auth session
      const redirectUrl = Linking.createURL('apple-callback');
      const result = await WebBrowser.openAuthSessionAsync(auth_url, redirectUrl, {
        showInRecents: true,
        preferEphemeralSession: false,
      });
      
      if (result.type === 'success' && result.url) {
        // Parse the callback URL for token/user data
        const url = new URL(result.url);
        const params = new URLSearchParams(url.search);
        const token = params.get('token');
        const userStr = params.get('user');
        
        if (token && userStr) {
          const userData = JSON.parse(decodeURIComponent(userStr));
          await storeAuth(token, userData);
          return userData;
        } else {
          throw new Error("Données d'authentification non trouvées");
        }
      } else if (result.type === 'cancel') {
        throw new Error("Authentification annulée");
      }
    } catch (e: any) {
      throw new Error(e.message || 'Connexion Apple échouée');
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
        loginWithApple,
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
