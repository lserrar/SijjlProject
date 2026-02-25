import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth, apiRequest } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

export default function SubscriptionSuccessScreen() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const { token, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // If we have a session_id, verify the payment
        if (session_id) {
          const res = await apiRequest(`/checkout/status/${session_id}`, token);
          if (res.ok) {
            const data = await res.json();
            if (data.payment_status === 'paid') {
              setSuccess(true);
              // Refresh user data to get new subscription status
              await refreshUser?.();
            } else {
              setError('Le paiement n\'a pas été finalisé.');
            }
          }
        } else {
          // No session_id means direct navigation - assume success
          setSuccess(true);
          await refreshUser?.();
        }
      } catch (e: any) {
        setError(e.message || 'Erreur de vérification');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [session_id, token, refreshUser]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#04D182" />
        <Text style={styles.loadingText}>Vérification du paiement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" translucent />
      
      <View style={[styles.content, { paddingTop: STATUS_BAR_HEIGHT + 40 }]}>
        {success ? (
          <>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#04D182" />
            </View>
            
            <Text style={styles.title}>Abonnement activé !</Text>
            <Text style={styles.subtitle}>
              Merci pour votre confiance. Vous avez maintenant accès à tous les contenus de Sijill.
            </Text>

            <View style={styles.features}>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark" size={20} color="#04D182" />
                <Text style={styles.featureText}>Accès illimité à tous les cours</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark" size={20} color="#04D182" />
                <Text style={styles.featureText}>Épisodes audio complets</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark" size={20} color="#04D182" />
                <Text style={styles.featureText}>Bibliographies et ressources</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark" size={20} color="#04D182" />
                <Text style={styles.featureText}>Téléchargement hors-ligne</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/(tabs)')}
              testID="start-learning-btn"
            >
              <Text style={styles.primaryBtnText}>Commencer à apprendre</Text>
              <Ionicons name="arrow-forward" size={18} color="#0A0A0A" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.errorIcon}>
              <Ionicons name="close-circle" size={80} color="#EF4444" />
            </View>
            
            <Text style={styles.title}>Erreur de paiement</Text>
            <Text style={styles.subtitle}>
              {error || 'Le paiement n\'a pas pu être validé. Veuillez réessayer.'}
            </Text>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.replace('/subscription-choice')}
            >
              <Text style={styles.secondaryBtnText}>Réessayer</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'EBGaramond',
    fontSize: 16,
    color: '#777',
    marginTop: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  successIcon: {
    marginBottom: 24,
  },
  errorIcon: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 22,
    color: '#F5F0E8',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'EBGaramond',
    fontSize: 16,
    color: 'rgba(245,240,232,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  features: {
    width: '100%',
    marginBottom: 40,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  featureText: {
    fontFamily: 'EBGaramond',
    fontSize: 15,
    color: 'rgba(245,240,232,0.8)',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#04D182',
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
  },
  primaryBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 11,
    letterSpacing: 2,
    color: '#0A0A0A',
    textTransform: 'uppercase',
  },
  secondaryBtn: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#333',
  },
  secondaryBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 11,
    letterSpacing: 2,
    color: '#C9A84C',
    textTransform: 'uppercase',
  },
});
