import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentCancelScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="close-circle-outline" size={80} color={colors.text.tertiary} />
        </View>
        
        <Text style={styles.title}>Paiement annulé</Text>
        <Text style={styles.message}>
          Vous avez annulé le processus de paiement. Aucun montant n'a été débité.
        </Text>

        <TouchableOpacity 
          style={styles.primaryBtn}
          onPress={() => router.replace('/subscription-choice')}
        >
          <Text style={styles.primaryBtnText}>Réessayer</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryBtn}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.secondaryBtnText}>Retourner à l'accueil</Text>
        </TouchableOpacity>
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
    fontSize: 24,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'EB Garamond',
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  primaryBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.xl * 2,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  primaryBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    color: '#0A0A0A',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  secondaryBtn: {
    padding: spacing.md,
  },
  secondaryBtnText: {
    fontFamily: 'EB Garamond',
    fontSize: 14,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },
});
