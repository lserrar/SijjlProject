import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, apiRequest } from '../context/AuthContext';

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE NOTIFICATIONS — Design Prestige Sijill
// ═══════════════════════════════════════════════════════════════════════════════

interface NotificationPrefs {
  new_courses: boolean;
  new_episodes: boolean;
  weekly_digest: boolean;
  subscription_expiry: boolean;
  subscription_reminder: boolean;
  promotions: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  new_courses: true,
  new_episodes: true,
  weekly_digest: true,
  subscription_expiry: true,
  subscription_reminder: true,
  promotions: false,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [hasChanges, setHasChanges] = useState(false);

  // Load preferences from backend
  const loadPreferences = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiRequest('/user/notifications/preferences', token);
      if (res.ok) {
        const data = await res.json();
        setPrefs(data);
      }
    } catch (e) {
      console.error('Failed to load notification preferences', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadPreferences(); }, [loadPreferences]);

  // Update a preference
  const updatePref = (key: keyof NotificationPrefs, value: boolean) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Save preferences to backend
  const handleSave = async () => {
    if (!token) return;
    
    setSaving(true);
    try {
      const res = await apiRequest('/user/notifications/preferences', token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      
      if (res.ok) {
        setHasChanges(false);
        Alert.alert(
          'Préférences sauvegardées',
          'Vos préférences de notifications ont été mises à jour.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert('Erreur', 'Impossible de sauvegarder les préférences.');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#04D182" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ═══════════════════════════════════════════════════════════════════════
            NAVIGATION
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.navRow}>
          <TouchableOpacity 
            testID="notifications-back-btn"
            style={styles.backBtn} 
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={18} color="rgba(245,240,232,0.50)" />
            <Text style={styles.backText}>Profil</Text>
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            TITRE
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleIcon}>
              <Ionicons name="notifications" size={20} color="#04D182" />
            </View>
            <Text style={styles.title}>Notifications</Text>
          </View>
          <Text style={styles.subtitle}>
            Paramétrez vos alertes pour ne manquer aucun contenu.
          </Text>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION : CONTENU
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Contenu</Text>
            <View style={styles.sectionLine} />
          </View>
          
          <SettingRow
            icon="school-outline"
            iconColor="#04D182"
            label="Nouveaux cours"
            description="Notification lors de la publication d'un nouveau cours"
            value={prefs.new_courses}
            onValueChange={(v) => updatePref('new_courses', v)}
          />

          <SettingRow
            icon="headset-outline"
            iconColor="#04D182"
            label="Nouveaux épisodes"
            description="Quand un nouvel épisode est disponible dans vos cursus"
            value={prefs.new_episodes}
            onValueChange={(v) => updatePref('new_episodes', v)}
          />

          <SettingRow
            icon="mail-outline"
            iconColor="#C9A84C"
            label="Résumé hebdomadaire"
            description="Récapitulatif de la semaine par email"
            value={prefs.weekly_digest}
            onValueChange={(v) => updatePref('weekly_digest', v)}
          />
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION : ABONNEMENT
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Abonnement</Text>
            <View style={styles.sectionLine} />
          </View>
          
          <SettingRow
            icon="time-outline"
            iconColor="#F59E0B"
            label="Rappel d'expiration"
            description="7 jours, 3 jours et 1 jour avant échéance"
            value={prefs.subscription_expiry}
            onValueChange={(v) => updatePref('subscription_expiry', v)}
          />

          <SettingRow
            icon="calendar-outline"
            iconColor="#F59E0B"
            label="Renouvellement automatique"
            description="Confirmation avant le renouvellement"
            value={prefs.subscription_reminder}
            onValueChange={(v) => updatePref('subscription_reminder', v)}
          />
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION : PROMOTIONS
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Promotions</Text>
            <View style={styles.sectionLine} />
          </View>
          
          <SettingRow
            icon="pricetag-outline"
            iconColor="#777777"
            label="Offres et réductions"
            description="Codes promo et offres spéciales"
            value={prefs.promotions}
            onValueChange={(v) => updatePref('promotions', v)}
          />
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            BOUTON SAUVEGARDER
        ═══════════════════════════════════════════════════════════════════════ */}
        <TouchableOpacity 
          testID="notifications-save-btn"
          style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0A0A0A" />
          ) : (
            <Text style={styles.saveBtnText}>
              {hasChanges ? 'Enregistrer' : 'Aucune modification'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Vous pouvez également gérer les notifications depuis les réglages de votre appareil.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Setting Row Component ────────────────────────────────────────────────────
interface SettingRowProps {
  icon: string;
  iconColor: string;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function SettingRow({ icon, iconColor, label, description, value, onValueChange }: SettingRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { borderColor: iconColor }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#333333', true: '#04D182' }}
        thumbColor={value ? '#F5F0E8' : '#777777'}
        ios_backgroundColor="#333333"
        style={styles.switch}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scroll: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Navigation
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backText: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 3,
    color: 'rgba(245,240,232,0.50)',
    textTransform: 'uppercase',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  titleIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,209,130,0.1)',
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
    color: '#F5F0E8',
  },
  subtitle: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    fontStyle: 'italic',
    color: 'rgba(245,240,232,0.55)',
    lineHeight: 20,
  },

  // Section
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionLabel: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 3,
    color: '#777777',
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#222222',
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#111111',
    padding: 14,
    marginBottom: 8,
    ...(Platform.OS === 'web' ? { transition: 'background-color 0.2s' } as any : {}),
  },
  settingIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: '#F5F0E8',
    marginBottom: 3,
  },
  settingDesc: {
    fontFamily: 'EBGaramond',
    fontSize: 12,
    color: 'rgba(245,240,232,0.50)',
    lineHeight: 16,
  },
  switch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },

  // Save Button
  saveBtn: {
    marginHorizontal: 20,
    backgroundColor: '#04D182',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveBtnDisabled: {
    backgroundColor: '#333333',
  },
  saveBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    color: '#0A0A0A',
    textTransform: 'uppercase',
  },

  // Disclaimer
  disclaimer: {
    fontFamily: 'EBGaramond',
    fontSize: 12,
    fontStyle: 'italic',
    color: '#777777',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
});
