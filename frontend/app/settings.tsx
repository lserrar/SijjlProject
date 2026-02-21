import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Settings state
  const [autoPlay, setAutoPlay] = useState(true);
  const [downloadWifi, setDownloadWifi] = useState(true);
  const [highQuality, setHighQuality] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données, progression et abonnements seront définitivement supprimés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/user/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Erreur lors de la suppression');
      }

      Alert.alert(
        'Compte supprimé',
        'Votre compte a été supprimé avec succès.',
        [{ text: 'OK', onPress: () => {
          logout();
          router.replace('/(auth)/login');
        }}]
      );
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            testID="settings-back-btn"
            style={styles.backBtn} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Paramètres</Text>
        </View>

        {/* Lecture Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lecture</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Lecture automatique</Text>
              <Text style={styles.settingDesc}>Passer au contenu suivant automatiquement</Text>
            </View>
            <Switch
              value={autoPlay}
              onValueChange={setAutoPlay}
              trackColor={{ false: colors.border.default, true: colors.brand.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haute qualité audio</Text>
              <Text style={styles.settingDesc}>Consomme plus de données</Text>
            </View>
            <Switch
              value={highQuality}
              onValueChange={setHighQuality}
              trackColor={{ false: colors.border.default, true: colors.brand.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Téléchargements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Téléchargements</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Wi-Fi uniquement</Text>
              <Text style={styles.settingDesc}>Ne télécharger que sur Wi-Fi</Text>
            </View>
            <Switch
              value={downloadWifi}
              onValueChange={setDownloadWifi}
              trackColor={{ false: colors.border.default, true: colors.brand.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Compte Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          
          <TouchableOpacity 
            testID="settings-subscription-btn"
            style={styles.menuItem}
            onPress={() => router.push('/subscription-choice')}
          >
            <Ionicons name="card-outline" size={20} color={colors.text.secondary} />
            <View style={styles.menuInfo}>
              <Text style={styles.menuLabel}>Mon abonnement</Text>
              <Text style={styles.menuDesc}>Gérer votre abonnement</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            testID="settings-privacy-btn"
            style={styles.menuItem}
          >
            <Ionicons name="shield-outline" size={20} color={colors.text.secondary} />
            <View style={styles.menuInfo}>
              <Text style={styles.menuLabel}>Confidentialité</Text>
              <Text style={styles.menuDesc}>Politique de confidentialité</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            testID="settings-terms-btn"
            style={styles.menuItem}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.text.secondary} />
            <View style={styles.menuInfo}>
              <Text style={styles.menuLabel}>Conditions d'utilisation</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Zone danger */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.brand.error }]}>Zone danger</Text>
          
          <TouchableOpacity 
            testID="settings-delete-btn"
            style={styles.dangerItem}
            onPress={handleDeleteAccount}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.brand.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={colors.brand.error} />
                <Text style={styles.dangerLabel}>Supprimer mon compte</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: spacing.lg, 
    paddingTop: spacing.sm, 
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: colors.background.card, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  title: { fontFamily: 'Inter-Bold', fontSize: 24, color: colors.text.primary },
  
  section: { marginBottom: spacing.xl, paddingHorizontal: spacing.lg },
  sectionTitle: { 
    fontFamily: 'Inter-SemiBold', 
    fontSize: 13, 
    color: colors.text.secondary, 
    marginBottom: spacing.md, 
    letterSpacing: 0.5, 
    textTransform: 'uppercase' 
  },
  
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  settingInfo: { flex: 1, marginRight: spacing.md },
  settingLabel: { fontFamily: 'Inter-Medium', fontSize: 15, color: colors.text.primary },
  settingDesc: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.tertiary, marginTop: 2 },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  menuInfo: { flex: 1 },
  menuLabel: { fontFamily: 'Inter-Medium', fontSize: 15, color: colors.text.primary },
  menuDesc: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.tertiary, marginTop: 2 },

  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerLabel: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: colors.brand.error },
});
