import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await login(email.trim(), password.trim());
      if (result?.role === 'admin') {
        router.replace('/admin' as any);
      } else if (result) {
        setError('Accès refusé. Ce compte n\'a pas les droits administrateur.');
      } else {
        setError('Email ou mot de passe incorrect.');
      }
    } catch (e) {
      setError('Erreur de connexion. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.wrap}>
        <View style={s.card}>
          {/* Logo */}
          <View style={s.logoRow}>
            <Text style={s.logoText}>SIJILL</Text>
            <View style={s.logoDot} />
          </View>
          <Text style={s.subtitle}>ADMINISTRATION</Text>

          <View style={s.divider} />

          {/* Form */}
          <Text style={s.label}>Email administrateur</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@hikma-admin.com"
            placeholderTextColor="#444"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={s.label}>Mot de passe</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#444"
            secureTextEntry
          />

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#0A0A0A" />
              : <Text style={s.btnText}>ACCÉDER AU PANEL</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={s.backLink} onPress={() => router.replace('/(tabs)' as any)}>
            <Text style={s.backLinkText}>← Retour à l'application</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: '#1A1A1A',
    borderWidth: 1, borderColor: '#222222',
    padding: 32,
  },
  logoRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 4 },
  logoText: { fontFamily: 'Cinzel', fontSize: 20, letterSpacing: 6, color: '#F5F0E8' },
  logoDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#04D182',
    marginBottom: 4,
  },
  subtitle: { fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 5, color: '#777777', textTransform: 'uppercase' },
  divider: { height: 1, backgroundColor: '#222222', marginVertical: 24 },
  label: { fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 3, color: '#777777', textTransform: 'uppercase', marginBottom: 8 },
  input: {
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#333333',
    padding: 12, color: '#F5F0E8', fontSize: 14,
    fontFamily: 'EBGaramond', marginBottom: 16,
  },
  errorText: { color: '#FF6B6B', fontFamily: 'EBGaramond', fontSize: 13, marginBottom: 12 },
  btn: {
    backgroundColor: '#04D182', padding: 14,
    alignItems: 'center', marginTop: 8,
  },
  btnText: { fontFamily: 'Cinzel', fontSize: 9, letterSpacing: 3, color: '#0A0A0A', textTransform: 'uppercase' },
  backLink: { alignItems: 'center', marginTop: 20 },
  backLinkText: { fontFamily: 'EBGaramond', fontSize: 13, fontStyle: 'italic', color: '#777777' },
});
