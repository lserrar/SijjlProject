import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { colors, spacing, radius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface Masterclass {
  id: string;
  title: string;
  description: string;
  thematique_id: string;
  scholar_name: string;
  date: string | null;
  duration: number;
  price: number;
  price_type: 'free' | 'paid';
  max_participants: number;
  current_participants: number;
  thumbnail: string;
  is_active: boolean;
}

interface Thematique {
  id: string;
  name: string;
  order: number;
}

export default function LiveScreen() {
  const { token, user } = useAuth();
  const [masterclasses, setMasterclasses] = useState<Masterclass[]>([]);
  const [thematiques, setThematiques] = useState<Thematique[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registeredIds, setRegisteredIds] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [mcRes, themRes] = await Promise.all([
        apiRequest('/masterclasses', token),
        apiRequest('/thematiques', token),
      ]);
      
      if (mcRes.ok) {
        const data = await mcRes.json();
        setMasterclasses(data);
      }
      if (themRes.ok) {
        const data = await themRes.json();
        setThematiques(data.sort((a: Thematique, b: Thematique) => a.order - b.order));
      }
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRegister = async (mc: Masterclass) => {
    if (!user) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour vous inscrire.');
      return;
    }

    if (registeredIds.includes(mc.id)) {
      Alert.alert('Déjà inscrit', 'Vous êtes déjà inscrit à cette masterclass.');
      return;
    }

    try {
      const resp = await apiRequest(`/masterclasses/${mc.id}/register`, token, {
        method: 'POST',
      });

      if (resp.ok) {
        setRegisteredIds([...registeredIds, mc.id]);
        Alert.alert(
          'Inscription réussie !',
          `Vous êtes inscrit à la masterclass "${mc.title.replace('Masterclass : ', '')}".`
        );
      } else {
        const err = await resp.json();
        Alert.alert('Erreur', err.detail || 'Inscription échouée');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const getThemeName = (themeId: string) => {
    const theme = thematiques.find(t => t.id === themeId);
    return theme?.name || '';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={styles.loadingText}>Chargement des masterclasses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Masterclasses</Text>
          <Text style={styles.headerSubtitle}>
            Sessions live approfondies avec nos experts
          </Text>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={colors.brand.primary} />
          <Text style={styles.infoText}>
            Les masterclasses sont actuellement gratuites. Inscrivez-vous pour être notifié des prochaines dates.
          </Text>
        </View>

        {/* Masterclasses List */}
        <View style={styles.mcList}>
          {masterclasses.map((mc) => {
            const isRegistered = registeredIds.includes(mc.id);
            const themeName = getThemeName(mc.thematique_id);

            return (
              <View key={mc.id} style={styles.mcCard}>
                <Image
                  source={{ uri: mc.thumbnail }}
                  style={styles.mcThumbnail}
                />
                <View style={styles.mcContent}>
                  <Text style={styles.mcTheme}>{themeName}</Text>
                  <Text style={styles.mcTitle} numberOfLines={2}>
                    {mc.title.replace('Masterclass : ', '')}
                  </Text>
                  <Text style={styles.mcScholar}>{mc.scholar_name}</Text>
                  
                  <View style={styles.mcMeta}>
                    <View style={styles.mcMetaItem}>
                      <Ionicons name="time-outline" size={14} color={colors.text.tertiary} />
                      <Text style={styles.mcMetaText}>{mc.duration} min</Text>
                    </View>
                    <View style={[
                      styles.mcPriceBadge,
                      mc.price_type === 'free' ? styles.priceFree : styles.pricePaid
                    ]}>
                      <Text style={[
                        styles.mcPriceText,
                        mc.price_type === 'free' ? styles.priceTextFree : styles.priceTextPaid
                      ]}>
                        {mc.price_type === 'free' ? 'Gratuit' : `${mc.price}€`}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.registerBtn,
                      isRegistered && styles.registerBtnDisabled
                    ]}
                    onPress={() => handleRegister(mc)}
                    disabled={isRegistered}
                  >
                    <Ionicons
                      name={isRegistered ? 'checkmark-circle' : 'add-circle'}
                      size={18}
                      color={isRegistered ? colors.text.secondary : '#000'}
                    />
                    <Text style={[
                      styles.registerBtnText,
                      isRegistered && styles.registerBtnTextDisabled
                    ]}>
                      {isRegistered ? 'Inscrit' : "S'inscrire"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.secondary },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.brand.primary + '15',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  mcList: {
    paddingHorizontal: spacing.md,
  },
  mcCard: {
    backgroundColor: colors.background.card,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  mcThumbnail: {
    width: '100%',
    height: 140,
    backgroundColor: colors.background.elevated,
  },
  mcContent: {
    padding: spacing.md,
  },
  mcTheme: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: colors.brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  mcTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  mcScholar: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  mcMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  mcMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mcMetaText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.text.tertiary,
  },
  mcPriceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  priceFree: {
    backgroundColor: colors.brand.primary + '20',
  },
  pricePaid: {
    backgroundColor: '#FFD700' + '30',
  },
  mcPriceText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },
  priceTextFree: {
    color: colors.brand.primary,
  },
  priceTextPaid: {
    color: '#B8860B',
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  registerBtnDisabled: {
    backgroundColor: colors.background.elevated,
  },
  registerBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#000',
  },
  registerBtnTextDisabled: {
    color: colors.text.secondary,
  },
});
