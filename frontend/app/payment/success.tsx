import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/api';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const { token, refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Vérification du paiement...');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!session_id) {
        setStatus('error');
        setMessage('Session de paiement non trouvée');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/checkout/status/${session_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok && (data.payment_status === 'paid' || data.status === 'complete')) {
          setStatus('success');
          setMessage('Paiement réussi ! Votre abonnement est maintenant actif.');
          
          // Refresh user data to get updated subscription
          if (refreshUser) {
            await refreshUser();
          }

          // Redirect to home after 3 seconds
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 3000);
        } else if (data.payment_status === 'pending') {
          setMessage('Paiement en cours de traitement...');
          // Retry after 2 seconds
          setTimeout(verifyPayment, 2000);
        } else {
          setStatus('error');
          setMessage(data.detail || 'Erreur lors de la vérification du paiement');
        }
      } catch (e: any) {
        setStatus('error');
        setMessage(e.message || 'Erreur de connexion');
      }
    };

    verifyPayment();
  }, [session_id, token]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text style={styles.message}>{message}</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={80} color={colors.brand.primary} />
            </View>
            <Text style={styles.title}>Merci !</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.redirect}>Redirection automatique...</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="close-circle" size={80} color={colors.brand.error} />
            </View>
            <Text style={styles.title}>Erreur</Text>
            <Text style={styles.message}>{message}</Text>
            <Text 
              style={styles.link}
              onPress={() => router.replace('/(tabs)')}
            >
              Retourner à l'accueil
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 28,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'EB Garamond',
    fontSize: 18,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 26,
  },
  redirect: {
    fontFamily: 'EB Garamond',
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: spacing.lg,
    fontStyle: 'italic',
  },
  link: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    color: colors.brand.primary,
    marginTop: spacing.xl,
    textDecorationLine: 'underline',
  },
});
