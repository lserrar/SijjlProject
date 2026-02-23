import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { colors, spacing, radius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface AdminStats {
  audios: { total: number; active: number };
  scholars: { total: number };
  courses: { total: number; active: number };
  users: { total: number };
}

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.replace('/(tabs)/profil');
      return;
    }
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      const resp = await apiRequest('/admin/stats', token);
      if (resp.ok) {
        const data = await resp.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to load admin stats', e);
    } finally {
      setLoading(false);
    }
  };

  const ADMIN_SECTIONS = [
    {
      icon: 'musical-notes',
      label: 'Audios',
      count: stats?.audios.total ?? 0,
      active: stats?.audios.active ?? 0,
      color: '#FF6B6B',
      route: '/admin/audios',
    },
    {
      icon: 'school',
      label: 'Érudits',
      count: stats?.scholars.total ?? 0,
      active: stats?.scholars.total ?? 0,
      color: '#4ECDC4',
      route: '/admin/scholars',
    },
    {
      icon: 'book',
      label: 'Cours',
      count: stats?.courses.total ?? 0,
      active: stats?.courses.active ?? 0,
      color: '#45B7D1',
      route: '/admin/courses',
    },
    {
      icon: 'star',
      label: 'Cursus — À la une',
      count: null,
      active: null,
      color: '#C9A84C',
      route: '/admin/cursus',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIcon}>
            <Ionicons name="shield-checkmark" size={32} color={colors.brand.primary} />
          </View>
          <Text style={styles.welcomeTitle}>Bienvenue, Administrateur</Text>
          <Text style={styles.welcomeSubtitle}>
            Gérez le contenu de Sijill depuis votre appareil mobile.
          </Text>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="people-outline" size={24} color={colors.brand.primary} />
            <Text style={styles.statValue}>{stats?.users.total ?? 0}</Text>
            <Text style={styles.statLabel}>Utilisateurs</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="library-outline" size={24} color="#FF6B6B" />
            <Text style={styles.statValue}>
              {(stats?.audios.total ?? 0) + (stats?.courses.total ?? 0)}
            </Text>
            <Text style={styles.statLabel}>Contenus</Text>
          </View>
        </View>

        {/* Admin Sections */}
        <Text style={styles.sectionTitle}>Gestion du contenu</Text>
        {ADMIN_SECTIONS.map((section) => (
          <TouchableOpacity
            key={section.label}
            style={styles.sectionCard}
            onPress={() => router.push(section.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.sectionIcon, { backgroundColor: `${section.color}20` }]}>
              <Ionicons name={section.icon as any} size={28} color={section.color} />
            </View>
            <View style={styles.sectionInfo}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              <Text style={styles.sectionCount}>
                {section.count} total · {section.active} actif{section.active > 1 ? 's' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        ))}

        {/* Back to App */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)/profil')}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
          <Text style={styles.backText}>Retour à l'application</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.secondary },
  welcomeCard: {
    backgroundColor: colors.background.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary + '30',
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  welcomeTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: colors.text.primary,
  },
  statLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.text.secondary,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  sectionIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionInfo: { flex: 1 },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 2,
  },
  sectionCount: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: colors.text.secondary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  backText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.text.secondary,
  },
});
