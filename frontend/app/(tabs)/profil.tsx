import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { colors, spacing, radius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://sijill-preview-1.preview.emergentagent.com';

interface UserStats {
  courses_followed: number;
  listening_hours: number;
  favorites_count: number;
  completed_count: number;
  in_progress_count: number;
}

export default function ProfilScreen() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    if (!token) {
      setLoadingStats(false);
      return;
    }
    try {
      const res = await apiRequest('/user/stats', token);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to load user stats', e);
    } finally {
      setLoadingStats(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const handleLogout = async () => {
    // Direct logout without confirmation for web (simpler and more reliable)
    if (Platform.OS === 'web') {
      try {
        console.log('Logging out...');
        await logout();
        console.log('Logout successful, redirecting...');
        // Force redirect on web using window.location for reliability
        window.location.href = '/login';
      } catch (e) {
        console.error('Logout error:', e);
        // Force redirect anyway
        window.location.href = '/login';
      }
    } else {
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
    }
  };

  const MENU_ITEMS = [
    { icon: 'card-outline', label: 'Mon abonnement', action: () => router.push('/subscription-choice') },
    { icon: 'gift-outline', label: 'Parrainage', action: () => router.push('/referral'), badge: 'NOUVEAU' },
    { icon: 'settings-outline', label: 'Paramètres', action: () => router.push('/settings') },
    { icon: 'notifications-outline', label: 'Notifications', action: () => router.push('/notifications') },
    { icon: 'language-outline', label: 'Langue : Français', action: () => {} },
    { icon: 'help-circle-outline', label: 'Aide et support', action: () => {} },
    { icon: 'shield-checkmark-outline', label: 'Confidentialité', action: () => router.push('/legal/privacy') },
    { icon: 'document-text-outline', label: "Conditions d'utilisation", action: () => router.push('/legal/terms') },
    { icon: 'information-circle-outline', label: 'Qui sommes-nous', action: () => router.push('/qui-sommes-nous') },
  ];

  // Calculate academic level based on completed count
  const getAcademicLevel = () => {
    if (!stats) return { level: 'Débutant', progress: 10, hint: 'Complétez des cours pour progresser' };
    const completed = stats.completed_count;
    if (completed >= 50) return { level: 'Expert', progress: 100, hint: 'Vous avez atteint le niveau maximum !' };
    if (completed >= 30) return { level: 'Avancé', progress: 85, hint: 'Encore quelques cours pour devenir Expert' };
    if (completed >= 15) return { level: 'Intermédiaire', progress: 60, hint: 'Continuez pour atteindre le niveau Avancé' };
    if (completed >= 5) return { level: 'Initié', progress: 35, hint: 'Complétez plus de cours pour progresser' };
    return { level: 'Débutant', progress: Math.max(10, completed * 7), hint: 'Complétez des cours pour progresser au niveau Initié' };
  };

  const academicLevel = getAcademicLevel();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand.primary} />
        }
      >
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
          {loadingStats ? (
            <View style={styles.statsLoading}>
              <ActivityIndicator size="small" color={colors.brand.primary} />
            </View>
          ) : (
            <>
              <View testID="profile-stat-courses" style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.courses_followed || 0}</Text>
                <Text style={styles.statLabel}>Cours{'\n'}suivis</Text>
              </View>
              <View style={styles.statDivider} />
              <View testID="profile-stat-time" style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.listening_hours || 0}h</Text>
                <Text style={styles.statLabel}>Temps{'\n'}d'écoute</Text>
              </View>
              <View style={styles.statDivider} />
              <View testID="profile-stat-favorites" style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.favorites_count || 0}</Text>
                <Text style={styles.statLabel}>Contenus{'\n'}sauvegardés</Text>
              </View>
            </>
          )}
        </View>

        {/* Academic Level */}
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <Text style={styles.levelTitle}>Niveau académique</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{academicLevel.level}</Text>
            </View>
          </View>
          <View style={styles.levelBar}>
            <View style={[styles.levelFill, { width: `${academicLevel.progress}%` }]} />
          </View>
          <Text style={styles.levelHint}>{academicLevel.hint}</Text>
          {stats && stats.completed_count > 0 && (
            <Text style={styles.levelStats}>
              {stats.completed_count} épisode{stats.completed_count > 1 ? 's' : ''} terminé{stats.completed_count > 1 ? 's' : ''} · {stats.in_progress_count} en cours
            </Text>
          )}
        </View>

        {/* Admin Panel Button - Only visible for admins */}
        {isAdmin && (
          <TouchableOpacity
            testID="profile-admin-btn"
            style={styles.adminBtn}
            onPress={() => Linking.openURL(`${API_URL}/api/admin-panel/login`)}
          >
            <View style={styles.adminIconContainer}>
              <Ionicons name="shield-checkmark" size={24} color={colors.brand.primary} />
            </View>
            <View style={styles.adminTextContainer}>
              <Text style={styles.adminTitle}>Panel Administrateur</Text>
              <Text style={styles.adminSubtitle}>Ouvre le panneau web admin</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}

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
          <Text style={styles.brandName}>Sijill Project</Text>
          <Text style={styles.brandByLM}></Text>
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
  statsRow: { flexDirection: 'row', marginHorizontal: spacing.lg, backgroundColor: colors.background.card, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, alignItems: 'center', minHeight: 90 },
  statsLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  levelFill: { height: 4, backgroundColor: colors.brand.primary, borderRadius: 2 },
  levelHint: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.tertiary },
  levelStats: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.secondary, marginTop: 6 },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.background.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand.primary + '40',
    gap: spacing.md,
  },
  adminIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminTextContainer: { flex: 1 },
  adminTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: colors.brand.primary },
  adminSubtitle: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.secondary },
  menuSection: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  menuTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.text.secondary, marginBottom: spacing.sm, letterSpacing: 0.5, textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xs, gap: spacing.md },
  menuLabel: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 14, color: colors.text.primary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.brand.error, borderRadius: radius.full, padding: 14, gap: spacing.sm, marginBottom: spacing.lg },
  logoutText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.brand.error },
  brandFooter: { alignItems: 'center', paddingBottom: spacing.lg },
  brandName: { fontFamily: 'Inter-Bold', fontSize: 20, color: colors.text.secondary },
  brandByLM: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.brand.primary },
  brandVersion: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.tertiary, marginTop: 4 },
});
