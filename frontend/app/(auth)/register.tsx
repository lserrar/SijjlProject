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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

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
      await register(name, email, password);
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
            <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoSection}>
            <Text style={styles.logoHikma}>Hikma</Text>
            <Text style={styles.logoByLM}>by LM</Text>
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
  safe: { flex: 1, backgroundColor: colors.background.primary },
  container: { flexGrow: 1, padding: spacing.lg },
  backBtn: { marginBottom: spacing.lg, width: 44, height: 44, justifyContent: 'center' },
  logoSection: { flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.xs },
  logoHikma: { fontFamily: 'Inter-Bold', fontSize: 36, color: colors.text.primary, letterSpacing: -1 },
  logoByLM: { fontFamily: 'Inter-Regular', fontSize: 16, color: colors.brand.primary, marginLeft: 4 },
  subtitle: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.secondary, marginBottom: spacing.xl },
  form: { gap: spacing.md },
  inputGroup: { gap: spacing.xs },
  label: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.text.secondary },
  input: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    padding: 14,
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: colors.text.primary,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingRight: 14,
  },
  eyeBtn: { padding: 4 },
  terms: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.tertiary, lineHeight: 18 },
  termsLink: { color: colors.brand.primary },
  primaryBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.full,
    padding: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: '#000' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.secondary },
  footerLink: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.brand.primary },
});
