import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function SubscriptionStatusScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const isActive = user?.subscription_status === 'active' ||
    (user?.subscription_end_date && new Date(user.subscription_end_date) > new Date());

  const expiryDate = user?.subscription_end_date
    ? new Date(user.subscription_end_date).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text.secondary} />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Mon abonnement</Text>
        </View>

        <View style={[styles.statusCard, isActive ? styles.activeCard : styles.inactiveCard]}>
          <View style={styles.statusIcon}>
            <Ionicons
              name={isActive ? 'checkmark-circle' : 'lock-closed'}
              size={48}
              color={isActive ? colors.brand.primary : colors.text.tertiary}
            />
          </View>
          <Text style={styles.statusTitle}>
            {isActive ? 'Abonnement actif' : 'Aucun abonnement actif'}
          </Text>
          {isActive && expiryDate && (
            <Text style={styles.statusDetail}>
              Valide jusqu'au {expiryDate}
            </Text>
          )}
          {!isActive && (
            <Text style={styles.statusDetail}>
              Un abonnement actif est nécessaire pour accéder à l'ensemble des contenus.
            </Text>
          )}
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Contenus inclus</Text>
          <FeatureRow icon="headset-outline" text="Tous les cours audio (6 cursus)" />
          <FeatureRow icon="book-outline" text="Bibliographies et ressources" />
          <FeatureRow icon="reader-outline" text="Transcriptions complètes" />
          <FeatureRow icon="download-outline" text="Téléchargement hors-ligne" />
        </View>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.homeBtnText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon as any} size={18} color={colors.brand.primary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: 4 },
  backText: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.text.secondary },
  header: { marginBottom: spacing.xl },
  title: { fontFamily: 'Inter-Bold', fontSize: 28, color: colors.text.primary, letterSpacing: -0.5 },
  statusCard: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
  },
  activeCard: {
    backgroundColor: 'rgba(4, 209, 130, 0.08)',
    borderColor: 'rgba(4, 209, 130, 0.3)',
  },
  inactiveCard: {
    backgroundColor: colors.background.card,
    borderColor: colors.border.default,
  },
  statusIcon: { marginBottom: spacing.md },
  statusTitle: { fontFamily: 'Inter-SemiBold', fontSize: 20, color: colors.text.primary, marginBottom: spacing.sm, textAlign: 'center' },
  statusDetail: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  featuresSection: { marginBottom: spacing.xl },
  featuresTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.text.secondary, marginBottom: spacing.md, letterSpacing: 0.5, textTransform: 'uppercase' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
  featureText: { fontFamily: 'DMSans-Regular', fontSize: 15, color: colors.text.primary },
  homeBtn: { backgroundColor: colors.brand.primary, borderRadius: radius.full, padding: 16, alignItems: 'center' },
  homeBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: '#000' },
});
