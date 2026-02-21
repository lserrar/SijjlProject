import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
  const router = useRouter();
  
  // Notification settings
  const [newCourses, setNewCourses] = useState(true);
  const [newMasterclasses, setNewMasterclasses] = useState(true);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  const handleSave = () => {
    // In a real app, save to backend
    Alert.alert('Préférences sauvegardées', 'Vos préférences de notifications ont été mises à jour.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            testID="notifications-back-btn"
            style={styles.backBtn} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="notifications" size={24} color={colors.brand.primary} />
          <Text style={styles.infoText}>
            Restez informé des nouveautés et ne manquez aucun contenu important.
          </Text>
        </View>

        {/* Contenu Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contenu</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="book-outline" size={20} color={colors.brand.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Nouveaux cours</Text>
              <Text style={styles.settingDesc}>Être notifié lors de la publication d'un nouveau cours</Text>
            </View>
            <Switch
              value={newCourses}
              onValueChange={setNewCourses}
              trackColor={{ false: colors.border.default, true: colors.brand.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="videocam-outline" size={20} color={colors.brand.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Masterclasses en direct</Text>
              <Text style={styles.settingDesc}>Rappels avant le début des sessions live</Text>
            </View>
            <Switch
              value={newMasterclasses}
              onValueChange={setNewMasterclasses}
              trackColor={{ false: colors.border.default, true: colors.brand.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="mail-outline" size={20} color={colors.brand.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Résumé hebdomadaire</Text>
              <Text style={styles.settingDesc}>Recevoir un récapitulatif chaque semaine</Text>
            </View>
            <Switch
              value={weeklyDigest}
              onValueChange={setWeeklyDigest}
              trackColor={{ false: colors.border.default, true: colors.brand.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Abonnement Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Abonnement</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="time-outline" size={20} color={colors.brand.warning} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Expiration de l'abonnement</Text>
              <Text style={styles.settingDesc}>Rappel 7 jours avant expiration</Text>
            </View>
            <Switch
              value={subscriptionExpiry}
              onValueChange={setSubscriptionExpiry}
              trackColor={{ false: colors.border.default, true: colors.brand.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Marketing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promotions</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="pricetag-outline" size={20} color={colors.text.secondary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Offres et réductions</Text>
              <Text style={styles.settingDesc}>Recevoir les codes promo et offres spéciales</Text>
            </View>
            <Switch
              value={promotions}
              onValueChange={setPromotions}
              trackColor={{ false: colors.border.default, true: colors.brand.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          testID="notifications-save-btn"
          style={styles.saveBtn}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>Enregistrer les préférences</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Vous pouvez également gérer les notifications depuis les réglages de votre appareil.
        </Text>

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
  
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: 'rgba(217, 255, 0, 0.1)',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(217, 255, 0, 0.2)',
  },
  infoText: { 
    flex: 1, 
    fontFamily: 'DMSans-Regular', 
    fontSize: 14, 
    color: colors.text.secondary,
    lineHeight: 20,
  },

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
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontFamily: 'Inter-Medium', fontSize: 15, color: colors.text.primary },
  settingDesc: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.tertiary, marginTop: 2 },

  saveBtn: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.full,
    padding: 16,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  saveBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#000' },

  disclaimer: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 18,
  },
});
