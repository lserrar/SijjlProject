import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants/api';

export default function SubscriptionChoiceScreen() {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'monthly' | 'annual' | null>(null);
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/trial/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan_id: 'trial_3days' }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Erreur lors de l\'activation de l\'essai');
      }

      await refreshUser?.();
      Alert.alert(
        'Essai gratuit activé !',
        'Vous avez 3 jours d\'accès gratuit à tout le contenu.',
        [{ text: 'Commencer', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: 'monthly' | 'annual') => {
    setLoading(true);
    try {
      // Create checkout session
      const response = await fetch(`${API_URL}/api/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_id: planId,
          success_url: 'hikma://subscription-success',
          cancel_url: 'hikma://subscription-choice',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Erreur lors de la création du paiement');
      }

      // For now, show a message since we can't open Stripe in mobile easily
      Alert.alert(
        'Paiement',
        'Le paiement par carte sera disponible prochainement. En attendant, profitez de l\'essai gratuit !',
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Accès limité',
      'Sans abonnement, vous n\'aurez accès qu\'aux contenus gratuits et aux aperçus.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Continuer', onPress: () => router.replace('/(tabs)') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Text style={styles.logoLe Sijill}>Le Sijill</Text>
            <Text style={styles.logoByLM}>by LM</Text>
          </View>
          <Text style={styles.welcome}>Bienvenue {user?.name?.split(' ')[0]} !</Text>
          <Text style={styles.subtitle}>
            Choisissez votre formule pour accéder à l'ensemble de nos cours et contenus académiques.
          </Text>
        </View>

        {/* Trial Card */}
        <TouchableOpacity
          style={[styles.planCard, styles.trialCard, selectedPlan === 'trial' && styles.selectedCard]}
          onPress={() => setSelectedPlan('trial')}
          activeOpacity={0.8}
        >
          <View style={styles.planHeader}>
            <View style={styles.trialBadge}>
              <Ionicons name="gift-outline" size={16} color="#000" />
              <Text style={styles.trialBadgeText}>ESSAI GRATUIT</Text>
            </View>
          </View>
          <Text style={styles.trialTitle}>3 jours gratuits</Text>
          <Text style={styles.trialSubtitle}>Accès complet à tous les contenus</Text>
          <View style={styles.features}>
            <FeatureItem text="Tous les cours vidéo" />
            <FeatureItem text="Podcasts et audios" />
            <FeatureItem text="Bibliothèque complète" />
            <FeatureItem text="Masterclasses en direct" />
          </View>
          {selectedPlan === 'trial' && (
            <View style={styles.checkMark}>
              <Ionicons name="checkmark-circle" size={28} color={colors.brand.primary} />
            </View>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou abonnez-vous</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Subscription Plans */}
        <View style={styles.plansRow}>
          {/* Monthly */}
          <TouchableOpacity
            style={[styles.planCard, styles.subCard, selectedPlan === 'monthly' && styles.selectedCard]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}
          >
            <Text style={styles.planName}>Mensuel</Text>
            <Text style={styles.planPrice}>9,99€</Text>
            <Text style={styles.planPeriod}>/mois</Text>
            {selectedPlan === 'monthly' && (
              <View style={styles.checkMarkSmall}>
                <Ionicons name="checkmark-circle" size={24} color={colors.brand.primary} />
              </View>
            )}
          </TouchableOpacity>

          {/* Annual */}
          <TouchableOpacity
            style={[styles.planCard, styles.subCard, styles.annualCard, selectedPlan === 'annual' && styles.selectedCard]}
            onPress={() => setSelectedPlan('annual')}
            activeOpacity={0.8}
          >
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>-25%</Text>
            </View>
            <Text style={styles.planName}>Annuel</Text>
            <Text style={styles.planPrice}>89,99€</Text>
            <Text style={styles.planPeriod}>/an</Text>
            <Text style={styles.planSaving}>soit 7,50€/mois</Text>
            {selectedPlan === 'annual' && (
              <View style={styles.checkMarkSmall}>
                <Ionicons name="checkmark-circle" size={24} color={colors.brand.primary} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.actionBtn, !selectedPlan && styles.actionBtnDisabled]}
          onPress={() => {
            if (selectedPlan === 'trial') {
              handleStartTrial();
            } else if (selectedPlan) {
              handleSubscribe(selectedPlan);
            }
          }}
          disabled={!selectedPlan || loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.actionBtnText}>
              {selectedPlan === 'trial' ? 'Démarrer mon essai gratuit' : 
               selectedPlan ? 'Continuer vers le paiement' : 'Choisissez une option'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Continuer sans abonnement</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          L'essai gratuit est limité à une fois par utilisateur. Vous pouvez annuler à tout moment.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name="checkmark" size={16} color={colors.brand.primary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  
  header: { marginBottom: spacing.xl },
  logoSection: { flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.sm },
  logoLe Sijill: { fontFamily: 'Inter-Bold', fontSize: 32, color: colors.text.primary, letterSpacing: -1 },
  logoByLM: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.brand.primary, marginLeft: 4 },
  welcome: { fontFamily: 'Inter-SemiBold', fontSize: 24, color: colors.text.primary, marginBottom: spacing.xs },
  subtitle: { fontFamily: 'DMSans-Regular', fontSize: 15, color: colors.text.secondary, lineHeight: 22 },

  planCard: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border.default,
    position: 'relative',
  },
  selectedCard: {
    borderColor: colors.brand.primary,
    backgroundColor: 'rgba(217, 255, 0, 0.05)',
  },
  trialCard: {
    marginBottom: spacing.lg,
  },
  planHeader: { marginBottom: spacing.sm },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    gap: 6,
  },
  trialBadgeText: { fontFamily: 'Inter-Bold', fontSize: 11, color: '#000' },
  trialTitle: { fontFamily: 'Inter-Bold', fontSize: 28, color: colors.text.primary, marginBottom: 4 },
  trialSubtitle: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.secondary, marginBottom: spacing.md },
  
  features: { gap: spacing.sm },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.primary },

  checkMark: { position: 'absolute', top: spacing.md, right: spacing.md },
  checkMarkSmall: { position: 'absolute', top: spacing.sm, right: spacing.sm },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border.default },
  dividerText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.text.tertiary, marginHorizontal: spacing.md },

  plansRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  subCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.xl },
  annualCard: {},
  planName: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.text.secondary, marginBottom: spacing.xs },
  planPrice: { fontFamily: 'Inter-Bold', fontSize: 32, color: colors.text.primary },
  planPeriod: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.tertiary },
  planSaving: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.brand.primary, marginTop: spacing.xs },
  
  saveBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: colors.brand.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  saveBadgeText: { fontFamily: 'Inter-Bold', fontSize: 11, color: '#fff' },

  actionBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.full,
    padding: 18,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionBtnDisabled: {
    backgroundColor: colors.background.elevated,
  },
  actionBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#000' },

  skipBtn: { alignItems: 'center', padding: spacing.md },
  skipText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.tertiary, textDecorationLine: 'underline' },

  disclaimer: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
});
