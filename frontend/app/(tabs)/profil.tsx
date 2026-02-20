import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ProfilScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const MENU_ITEMS = [
    { icon: 'settings-outline', label: 'Paramètres', action: () => {} },
    { icon: 'notifications-outline', label: 'Notifications', action: () => {} },
    { icon: 'language-outline', label: 'Langue : Français', action: () => {} },
    { icon: 'help-circle-outline', label: 'Aide et support', action: () => {} },
    { icon: 'information-circle-outline', label: 'À propos de HikmabyLM', action: () => {} },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>

        {/* User Card */}
        <View testID="profile-user-card" style={styles.userCard}>
          <Image
            source={{
              uri: user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=04D182&color=000&bold=true`,
            }}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Utilisateur'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
            <View style={styles.providerBadge}>
              <Ionicons
                name={user?.provider === 'google' ? 'logo-google' : 'mail-outline'}
                size={12}
                color={colors.text.tertiary}
              />
              <Text style={styles.providerText}>
                {user?.provider === 'google' ? 'Compte Google' : 'Compte email'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View testID="profile-stat-courses" style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Cours{'\n'}suivis</Text>
          </View>
          <View style={styles.statDivider} />
          <View testID="profile-stat-time" style={styles.statCard}>
            <Text style={styles.statValue}>0h</Text>
            <Text style={styles.statLabel}>Temps{'\n'}d'écoute</Text>
          </View>
          <View style={styles.statDivider} />
          <View testID="profile-stat-favorites" style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Contenus{'\n'}sauvegardés</Text>
          </View>
        </View>

        {/* Academic Level */}
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <Text style={styles.levelTitle}>Niveau académique</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>Débutant</Text>
            </View>
          </View>
          <View style={styles.levelBar}>
            <View style={styles.levelFill} />
          </View>
          <Text style={styles.levelHint}>Complétez des cours pour progresser au niveau Intermédiaire</Text>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.menuTitle}>Préférences</Text>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              testID={`profile-menu-${item.label}`}
              style={styles.menuItem}
              onPress={item.action}
            >
              <Ionicons name={item.icon as any} size={20} color={colors.text.secondary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          testID="profile-logout-btn"
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.brand.error} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        {/* Brand footer */}
        <View style={styles.brandFooter}>
          <Text style={styles.brandHikma}>Hikma</Text>
          <Text style={styles.brandByLM}>by LM</Text>
          <Text style={styles.brandVersion}>v1.0.0 · Prototype</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontFamily: 'Inter-Bold', fontSize: 28, color: colors.text.primary, letterSpacing: -0.5 },
  userCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, backgroundColor: colors.background.card, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.background.elevated, borderWidth: 2, borderColor: colors.brand.primary },
  userInfo: { flex: 1 },
  userName: { fontFamily: 'Inter-Bold', fontSize: 18, color: colors.text.primary, marginBottom: 3 },
  userEmail: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.text.secondary, marginBottom: 6 },
  providerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  providerText: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.tertiary },
  statsRow: { flexDirection: 'row', marginHorizontal: spacing.lg, backgroundColor: colors.background.card, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, alignItems: 'center' },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: 'Inter-Bold', fontSize: 22, color: colors.brand.primary, marginBottom: 4 },
  statLabel: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.secondary, textAlign: 'center', lineHeight: 15 },
  statDivider: { width: 1, height: 40, backgroundColor: colors.border.default },
  levelCard: { marginHorizontal: spacing.lg, backgroundColor: colors.background.card, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md },
  levelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  levelTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.text.primary },
  levelBadge: { backgroundColor: 'rgba(4, 209, 130, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: colors.brand.primary },
  levelBadgeText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: colors.brand.primary },
  levelBar: { height: 4, backgroundColor: colors.border.default, borderRadius: 2, marginBottom: spacing.sm },
  levelFill: { width: '10%', height: 4, backgroundColor: colors.brand.primary, borderRadius: 2 },
  levelHint: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.tertiary },
  menuSection: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  menuTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.text.secondary, marginBottom: spacing.sm, letterSpacing: 0.5, textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xs, gap: spacing.md },
  menuLabel: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 14, color: colors.text.primary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.brand.error, borderRadius: radius.full, padding: 14, gap: spacing.sm, marginBottom: spacing.lg },
  logoutText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.brand.error },
  brandFooter: { alignItems: 'center', paddingBottom: spacing.lg },
  brandHikma: { fontFamily: 'Inter-Bold', fontSize: 20, color: colors.text.secondary },
  brandByLM: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.brand.primary },
  brandVersion: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.tertiary, marginTop: 4 },
});
