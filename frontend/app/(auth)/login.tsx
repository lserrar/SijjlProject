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
import { colors, spacing, radius, typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Erreur de connexion', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Connexion Google échouée');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoSection} testID="login-logo">
            <Text style={styles.logoMain}>Sijill</Text>
            <Text style={styles.logoByLM}></Text>
          </View>

          <Text style={styles.tagline}>La connaissance académique, à portée de main</Text>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse email</Text>
              <TextInput
                testID="login-email-input"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="votre@email.com"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  testID="login-password-input"
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              testID="login-submit-btn"
              style={styles.primaryBtn}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google */}
            <TouchableOpacity
              testID="login-google-btn"
              style={styles.socialBtn}
              onPress={handleGoogle}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.text.primary} size="small" />
              ) : (
                <>
                  <View style={styles.googleIcon}>
                    <Text style={styles.googleG}>G</Text>
                  </View>
                  <Text style={styles.socialBtnText}>Continuer avec Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple placeholder */}
            <TouchableOpacity
              testID="login-apple-btn"
              style={[styles.socialBtn, { opacity: 0.5 }]}
              onPress={() => Alert.alert('Bientôt disponible', 'La connexion Apple sera disponible prochainement.')}
            >
              <Ionicons name="logo-apple" size={20} color={colors.text.primary} />
              <Text style={styles.socialBtnText}>Continuer avec Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ? </Text>
            <TouchableOpacity testID="login-register-link" onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingVertical: 48,
    justifyContent: 'center',
  },

  // Logo
  logoSection: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  logoText: {
    fontFamily: 'Cinzel',
    fontSize: 36,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 14,
  },
  logoDot: {
    width: 8,
    height: 8,
    backgroundColor: '#04D182',
    borderRadius: 4,
    marginLeft: 4,
    marginBottom: 12,
    shadowColor: '#04D182',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  goldLine: {
    height: 1,
    width: '100%',
    backgroundColor: '#C9A84C',
    opacity: 0.3,
    marginBottom: 10,
  },
  tagline: {
    fontFamily: 'EB Garamond',
    fontSize: 13,
    fontStyle: 'italic',
    color: '#888888',
    letterSpacing: 3,
    marginBottom: 40,
  },

  // Form
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 3,
    color: '#888888',
    textTransform: 'uppercase',
  },
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
  eyeBtn: {
    padding: 4,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: '#04D182',
    padding: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 11,
    fontWeight: '400',
    color: '#0A0A0A',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#222222',
  },
  dividerText: {
    fontFamily: 'EB Garamond',
    fontSize: 13,
    fontStyle: 'italic',
    color: '#444444',
  },

  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    padding: 14,
  },
  googleIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontFamily: 'Cinzel',
    fontSize: 13,
    color: '#C9A84C',
  },
  socialBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    color: '#C9A84C',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: 6,
  },
  footerText: {
    fontFamily: 'EB Garamond',
    fontSize: 15,
    color: '#888888',
  },
  footerLink: {
    fontFamily: 'Cinzel',
    fontSize: 11,
    color: '#04D182',
    letterSpacing: 2,
  },
});
