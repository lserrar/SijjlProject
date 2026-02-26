import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  // Validate referral code
  const validateReferralCode = async (code: string) => {
    if (!code || code.length < 5) {
      setReferrerName(null);
      return;
    }
    setValidatingCode(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const res = await fetch(`${API_URL}/api/user/referral/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referral_code: code.toUpperCase() }),
      });
      if (res.ok) {
        const data = await res.json();
        setReferrerName(data.referrer_name);
      } else {
        setReferrerName(null);
      }
    } catch {
      setReferrerName(null);
    } finally {
      setValidatingCode(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password, referralCode || undefined);
      // Redirect to subscription choice screen instead of tabs
      router.replace('/subscription-choice');
    } catch (e: any) {
      Alert.alert('Erreur d\'inscription', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Back button */}
          <TouchableOpacity testID="register-back-btn" style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#F5F0E8" />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoRow}>
              <Text style={styles.logoText}>SIJILL PROJECT</Text>
              <View style={styles.logoDot} />
            </View>
            <View style={styles.goldLine} />
          </View>

          <Text style={styles.subtitle}>Créer votre compte académique</Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom complet</Text>
              <TextInput
                testID="register-name-input"
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Marie Dupont"
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse email</Text>
              <TextInput
                testID="register-email-input"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="votre@email.com"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  testID="register-password-input"
                  style={[styles.input, { flex: 1, borderWidth: 0 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimum 6 caractères"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.terms}>
              En vous inscrivant, vous acceptez nos{' '}
              <Text style={styles.termsLink}>Conditions d'utilisation</Text>
            </Text>

            {/* Referral Code Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Code de parrainage</Text>
                <Text style={styles.labelOptional}>(optionnel)</Text>
              </View>
              <View style={styles.referralInputRow}>
                <TextInput
                  testID="register-referral-input"
                  style={[styles.input, { flex: 1 }]}
                  value={referralCode}
                  onChangeText={(text) => {
                    setReferralCode(text.toUpperCase());
                    validateReferralCode(text);
                  }}
                  placeholder="SIJILL-XXXX"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="characters"
                />
                {validatingCode && (
                  <ActivityIndicator size="small" color="#04D182" style={{ marginLeft: 10 }} />
                )}
              </View>
              {referrerName && (
                <View style={styles.referralSuccess}>
                  <Ionicons name="checkmark-circle" size={16} color="#04D182" />
                  <Text style={styles.referralSuccessText}>
                    Parrainé par <Text style={styles.referralHighlight}>{referrerName}</Text> — 1 mois gratuit !
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              testID="register-submit-btn"
              style={styles.primaryBtn}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Créer mon compte</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ? </Text>
            <TouchableOpacity testID="register-login-link" onPress={() => router.back()}>
              <Text style={styles.footerLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { flexGrow: 1, paddingHorizontal: 32, paddingVertical: 40 },
  backBtn: { marginBottom: spacing.xl, width: 44, height: 44, justifyContent: 'center' },
  logoSection: { marginBottom: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  logoText: { fontFamily: 'Cinzel', fontSize: 30, fontWeight: '400', color: '#F5F0E8', letterSpacing: 14, marginRight: -14 },
  logoDot: {
    width: 7, height: 7, backgroundColor: '#04D182', borderRadius: 4, marginBottom: 8,
    shadowColor: '#04D182', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8,
  },
  goldLine: { height: 1, width: '100%', backgroundColor: '#C9A84C', opacity: 0.3, marginBottom: 10 },
  subtitle: {
    fontFamily: 'EB Garamond',
    fontSize: 14,
    fontStyle: 'italic',
    color: '#888888',
    letterSpacing: 2,
    marginBottom: spacing.xl,
  },
  form: { gap: spacing.md },
  inputGroup: { gap: 6 },
  label: { fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 3, color: '#888888', textTransform: 'uppercase' },
  input: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    padding: 14,
    fontFamily: 'EB Garamond',
    fontSize: 16,
    color: '#F5F0E8',
  } as any,
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    paddingRight: 14,
  },
  eyeBtn: { padding: 4 },
  terms: { fontFamily: 'EB Garamond', fontStyle: 'italic', fontSize: 13, color: '#444444', lineHeight: 18 },
  termsLink: { color: '#04D182' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelOptional: { fontFamily: 'EB Garamond', fontSize: 11, fontStyle: 'italic', color: '#555555' },
  referralInputRow: { flexDirection: 'row', alignItems: 'center' },
  referralSuccess: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(4, 209, 130, 0.1)',
  },
  referralSuccessText: { fontFamily: 'EB Garamond', fontSize: 13, color: '#888888', flex: 1 },
  referralHighlight: { color: '#04D182', fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#04D182',
    padding: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnText: { fontFamily: 'Cinzel', fontSize: 11, fontWeight: '400', color: '#0A0A0A', letterSpacing: 4, textTransform: 'uppercase' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl, gap: 6 },
  footerText: { fontFamily: 'EB Garamond', fontSize: 15, color: '#888888' },
  footerLink: { fontFamily: 'Cinzel', fontSize: 11, color: '#04D182', letterSpacing: 2 },
});
