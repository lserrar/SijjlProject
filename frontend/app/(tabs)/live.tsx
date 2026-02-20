import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../../context/AuthContext';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius } from '../../constants/theme';
import { formatSessionDate, formatSessionTime } from '../../constants/mockData';
import { Ionicons } from '@expo/vector-icons';

export default function LiveScreen() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState<string | null>(null);
  const [registeredSessions, setRegisteredSessions] = useState<Set<string>>(new Set());

  const fetchSessions = useCallback(async () => {
    try {
      const resp = await apiRequest('/live-sessions', token);
      const data = await resp.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Live sessions fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const onRefresh = () => { setRefreshing(true); fetchSessions(); };

  const handleRegister = async (sessionId: string) => {
    if (!token) {
      Alert.alert('Connexion requise', 'Connectez-vous pour vous inscrire');
      return;
    }
    setRegistering(sessionId);
    try {
      if (registeredSessions.has(sessionId)) {
        await apiRequest(`/live-sessions/${sessionId}/register`, token, { method: 'DELETE' });
        setRegisteredSessions(prev => { const s = new Set(prev); s.delete(sessionId); return s; });
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, registered_count: s.registered_count - 1 } : s));
        Alert.alert('Désinscription', 'Vous avez été désinscrit de cette session');
      } else {
        await apiRequest(`/live-sessions/${sessionId}/register`, token, { method: 'POST' });
        setRegisteredSessions(prev => new Set([...prev, sessionId]));
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, registered_count: s.registered_count + 1 } : s));
        Alert.alert('Inscription confirmée !', 'Vous êtes inscrit à cette session. Vous recevrez un rappel avant la session.');
      }
    } catch (e) {
      Alert.alert('Erreur', "L'inscription a échoué. Réessayez.");
    } finally {
      setRegistering(null);
    }
  };

  const getSessionStatus = (dateStr: string) => {
    const now = new Date();
    const sessionDate = new Date(dateStr);
    const diffDays = Math.ceil((sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { label: "Aujourd'hui", color: colors.brand.primary };
    if (diffDays === 1) return { label: 'Demain', color: colors.brand.secondary };
    if (diffDays <= 7) return { label: `Dans ${diffDays} jours`, color: '#FFC107' };
    return { label: formatSessionDate(dateStr), color: colors.text.secondary };
  };

  const nextSession = sessions[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sessions Live</Text>
          <Text style={styles.subtitle}>Masterclasses, séminaires et débats académiques</Text>
        </View>

        {/* Hero Next Session */}
        {nextSession && !loading && (
          <View style={styles.heroSection}>
            <View style={styles.heroBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.heroBadgeText}>PROCHAINE SESSION</Text>
            </View>
            <Image source={{ uri: nextSession.thumbnail }} style={styles.heroImage} />
            <View style={styles.heroContent}>
              <Text style={styles.heroTopic}>{nextSession.topic}</Text>
              <Text style={styles.heroTitle}>{nextSession.title}</Text>
              <Text style={styles.heroScholar}>{nextSession.scholar_name}</Text>

              <View style={styles.heroMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
                  <Text style={styles.metaText}>{formatSessionDate(nextSession.date)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
                  <Text style={styles.metaText}>{formatSessionTime(nextSession.date)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={14} color={colors.text.secondary} />
                  <Text style={styles.metaText}>{nextSession.registered_count}/{nextSession.max_participants}</Text>
                </View>
              </View>

              <TouchableOpacity
                testID={`live-register-${nextSession.id}`}
                style={[
                  styles.registerBtn,
                  registeredSessions.has(nextSession.id) && styles.registerBtnActive,
                  nextSession.registered_count >= nextSession.max_participants && !registeredSessions.has(nextSession.id) && styles.registerBtnFull,
                ]}
                onPress={() => handleRegister(nextSession.id)}
                disabled={!!registering || (nextSession.registered_count >= nextSession.max_participants && !registeredSessions.has(nextSession.id))}
              >
                {registering === nextSession.id ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.registerBtnText}>
                    {registeredSessions.has(nextSession.id)
                      ? '✓ Inscrit — Annuler'
                      : nextSession.registered_count >= nextSession.max_participants
                      ? 'Complet'
                      : 'S\'inscrire'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* All Sessions */}
        <Text style={styles.sectionTitle}>Toutes les sessions à venir</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.brand.primary} />
        ) : (
          sessions.map((session, index) => {
            const status = getSessionStatus(session.date);
            const isRegistered = registeredSessions.has(session.id);
            const isFull = session.registered_count >= session.max_participants && !isRegistered;

            return (
              <View key={session.id} testID={`live-session-${session.id}`} style={styles.sessionCard}>
                <View style={styles.sessionLeft}>
                  <Text style={[styles.sessionDateLabel, { color: status.color }]}>{status.label}</Text>
                  <Text style={styles.sessionTime}>{formatSessionTime(session.date)}</Text>
                  <Text style={styles.sessionDuration}>{session.duration} min</Text>
                </View>

                <View style={styles.sessionRight}>
                  <Text style={styles.sessionTopic}>{session.topic}</Text>
                  <Text style={styles.sessionTitle} numberOfLines={2}>{session.title}</Text>
                  <Text style={styles.sessionScholar}>{session.scholar_name}</Text>

                  <View style={styles.sessionBottom}>
                    <View style={styles.sessionParticipants}>
                      <Ionicons name="people-outline" size={12} color={colors.text.tertiary} />
                      <Text style={styles.sessionParticipantsText}>
                        {session.registered_count}/{session.max_participants}
                      </Text>
                    </View>

                    <TouchableOpacity
                      testID={`live-reg-btn-${session.id}`}
                      style={[
                        styles.sessionRegBtn,
                        isRegistered && styles.sessionRegBtnActive,
                        isFull && styles.sessionRegBtnFull,
                      ]}
                      onPress={() => handleRegister(session.id)}
                      disabled={!!registering || isFull}
                    >
                      {registering === session.id ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <Text style={[styles.sessionRegText, isRegistered && { color: '#000' }]}>
                          {isRegistered ? '✓ Inscrit' : isFull ? 'Complet' : 'S\'inscrire'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { fontFamily: 'Inter-Bold', fontSize: 28, color: colors.text.primary, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.text.secondary, marginTop: 3 },
  // Hero
  heroSection: { marginHorizontal: spacing.lg, backgroundColor: colors.background.card, borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.lg },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.md, paddingBottom: 0 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand.primary },
  heroBadgeText: { fontFamily: 'Inter-SemiBold', fontSize: 10, color: colors.brand.primary, letterSpacing: 1 },
  heroImage: { width: '100%', height: 160, resizeMode: 'cover' },
  heroContent: { padding: spacing.md },
  heroTopic: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.brand.primary, letterSpacing: 0.5, marginBottom: 4 },
  heroTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: colors.text.primary, lineHeight: 22, marginBottom: 4 },
  heroScholar: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.text.secondary, marginBottom: 12 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.secondary },
  registerBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  registerBtnActive: { backgroundColor: 'rgba(4, 209, 130, 0.15)', borderWidth: 1, borderColor: colors.brand.primary },
  registerBtnFull: { backgroundColor: colors.border.default },
  registerBtnText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#000' },
  // Session list
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 17, color: colors.text.primary, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sessionCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  sessionLeft: { width: 80, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.border.subtle, paddingRight: spacing.md },
  sessionDateLabel: { fontFamily: 'Inter-SemiBold', fontSize: 11, textAlign: 'center', marginBottom: 3 },
  sessionTime: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.text.primary, textAlign: 'center', marginBottom: 3 },
  sessionDuration: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.tertiary, textAlign: 'center' },
  sessionRight: { flex: 1 },
  sessionTopic: { fontFamily: 'Inter-Medium', fontSize: 10, color: colors.brand.primary, letterSpacing: 0.5, marginBottom: 3 },
  sessionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.text.primary, lineHeight: 18, marginBottom: 3 },
  sessionScholar: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.secondary, marginBottom: 10 },
  sessionBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessionParticipants: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionParticipantsText: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.tertiary },
  sessionRegBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  sessionRegBtnActive: { backgroundColor: 'rgba(4, 209, 130, 0.15)', borderWidth: 1, borderColor: colors.brand.primary },
  sessionRegBtnFull: { backgroundColor: colors.background.elevated },
  sessionRegText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#000' },
});
