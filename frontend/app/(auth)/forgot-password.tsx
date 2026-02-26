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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.REACT_APP_BACKEND_URL || '';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Veuillez entrer une adresse email valide');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      // Always show success to prevent email enumeration
      setSubmitted(true);
    } catch (e) {
      // Still show success for security
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.successContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-outline" size={48} color="#04D182" />
            </View>
            
            <Text style={styles.successTitle}>Vérifiez votre boîte mail</Text>
            
            <Text style={styles.successText}>
              Si un compte existe avec l'adresse {email}, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
            </Text>
            
            <Text style={styles.noteText}>
              Si vous ne recevez pas d'email, vérifiez vos spams ou contactez-nous à{' '}
              <Text style={styles.emailLink}>support@sijillproject.com</Text>
            </Text>
            
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.backBtnText}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backArrow}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#F5F0E8" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Mot de passe oublié</Text>
            <Text style={styles.subtitle}>
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#FF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={18} color="#666666" style={styles.inputIcon} />
                <TextInput
                  testID="forgot-email-input"
                  style={styles.input}
                  placeholder="votre@email.com"
                  placeholderTextColor="#555555"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <TouchableOpacity
              testID="forgot-submit-btn"
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0A0A0A" />
              ) : (
                <Text style={styles.submitBtnText}>Envoyer le lien</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Vous vous souvenez de votre mot de passe ? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>Se connecter</Text>
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
    paddingVertical: 24,
  },
  backArrow: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 24,
    color: '#F5F0E8',
    letterSpacing: 2,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'EB Garamond',
    fontSize: 16,
    color: '#888888',
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#FF4444',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontFamily: 'EB Garamond',
    fontSize: 14,
    color: '#FF4444',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#888888',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'EB Garamond',
    fontSize: 16,
    color: '#F5F0E8',
    paddingVertical: 14,
  },
  submitBtn: {
    backgroundColor: '#04D182',
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    color: '#0A0A0A',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
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
  // Success screen styles
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(4, 209, 130, 0.1)',
    borderWidth: 1,
    borderColor: '#04D182',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontFamily: 'Cinzel',
    fontSize: 20,
    color: '#F5F0E8',
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    fontFamily: 'EB Garamond',
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  noteText: {
    fontFamily: 'EB Garamond',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  emailLink: {
    color: '#04D182',
  },
  backBtn: {
    borderWidth: 1,
    borderColor: '#333333',
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  backBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 11,
    color: '#F5F0E8',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
