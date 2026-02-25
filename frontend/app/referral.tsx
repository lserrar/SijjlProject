import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Share, Platform, StatusBar, RefreshControl,
  Clipboard, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest, useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

interface ReferralData {
  referral_code: string;
  referral_count: number;
  free_months_earned: number;
  free_months_remaining: number;
  subscription_end_date: string | null;
  stats: {
    total_referrals: number;
    converted: number;
    pending: number;
  };
  referrals: Referral[];
}

interface Referral {
  id: string;
  referee_name: string;
  referee_email: string;
  status: 'pending' | 'converted';
  created_at: string;
  converted_at: string | null;
}

export default function ReferralScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await apiRequest('/user/referral', token);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Load referral data error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const copyCode = async () => {
    if (!data?.referral_code) return;
    
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(data.referral_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
        Clipboard.setString(data.referral_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } else {
      Clipboard.setString(data.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareCode = async () => {
    if (!data?.referral_code) return;
    
    const message = `Rejoins Sijill, la plateforme d'études islamiques ! 🌙\n\nUtilise mon code de parrainage "${data.referral_code}" pour obtenir 1 mois gratuit.\n\nLien: https://sijill.app`;
    
    try {
      await Share.share({
        message,
        title: 'Parrainage Sijill',
      });
    } catch (e) {
      console.error('Share error:', e);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#04D182" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" translucent />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: STATUS_BAR_HEIGHT + 10 }]}>
        <TouchableOpacity
          testID="referral-back-btn"
          style={styles.headerBackBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="rgba(245,240,232,0.7)" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Parrainage</Text>
        
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#04D182" />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="gift" size={32} color="#04D182" />
          </View>
          <Text style={styles.heroTitle}>Parrainez vos proches</Text>
          <Text style={styles.heroSubtitle}>
            Offrez 1 mois gratuit à vos amis et recevez 1 mois gratuit quand ils s'abonnent
          </Text>
        </View>

        {/* Code Section */}
        <View style={styles.codeSection}>
          <Text style={styles.sectionLabel}>VOTRE CODE DE PARRAINAGE</Text>
          
          <View style={styles.codeBox}>
            <Text style={styles.codeText} selectable testID="referral-code">
              {data?.referral_code || 'Chargement...'}
            </Text>
            <TouchableOpacity 
              style={[styles.copyBtn, copied && styles.copyBtnCopied]}
              onPress={copyCode}
              testID="copy-code-btn"
            >
              <Ionicons 
                name={copied ? "checkmark" : "copy-outline"} 
                size={16} 
                color={copied ? "#0A0A0A" : "#04D182"} 
              />
              <Text style={[styles.copyBtnText, copied && styles.copyBtnTextCopied]}>
                {copied ? 'Copié !' : 'Copier'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.shareBtn}
            onPress={shareCode}
            testID="share-code-btn"
          >
            <Ionicons name="share-social" size={18} color="#0A0A0A" />
            <Text style={styles.shareBtnText}>Partager mon code</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionLabel}>VOS STATISTIQUES</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data?.stats.total_referrals || 0}</Text>
              <Text style={styles.statLabel}>Invitations envoyées</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#04D182' }]}>{data?.stats.converted || 0}</Text>
              <Text style={styles.statLabel}>Parrainages réussis</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#C9A84C' }]}>{data?.free_months_earned || 0}</Text>
              <Text style={styles.statLabel}>Mois gagnés</Text>
            </View>
          </View>

          {(data?.free_months_remaining || 0) > 0 && (
            <View style={styles.bonusAlert}>
              <Ionicons name="gift" size={18} color="#C9A84C" />
              <Text style={styles.bonusText}>
                Vous avez <Text style={styles.bonusHighlight}>{data?.free_months_remaining} mois gratuit(s)</Text> à utiliser !
              </Text>
            </View>
          )}
        </View>

        {/* How it Works */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionLabel}>COMMENT ÇA MARCHE</Text>
          
          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Partagez votre code</Text>
              <Text style={styles.stepDesc}>Envoyez votre code à vos amis ou partagez-le sur les réseaux</Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Ils s'inscrivent</Text>
              <Text style={styles.stepDesc}>Vos amis utilisent votre code à l'inscription et reçoivent 1 mois gratuit</Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Vous êtes récompensé</Text>
              <Text style={styles.stepDesc}>Quand votre filleul s'abonne, vous recevez aussi 1 mois gratuit</Text>
            </View>
          </View>
        </View>

        {/* Referrals List */}
        {data?.referrals && data.referrals.length > 0 && (
          <View style={styles.referralsSection}>
            <Text style={styles.sectionLabel}>VOS FILLEULS</Text>
            
            {data.referrals.map((referral) => (
              <View key={referral.id} style={styles.referralCard}>
                <View style={styles.referralAvatar}>
                  <Text style={styles.referralInitial}>{referral.referee_name.charAt(0)}</Text>
                </View>
                <View style={styles.referralInfo}>
                  <Text style={styles.referralName}>{referral.referee_name}</Text>
                  <Text style={styles.referralDate}>Inscrit le {formatDate(referral.created_at)}</Text>
                </View>
                <View style={[
                  styles.referralStatus,
                  { backgroundColor: referral.status === 'converted' ? 'rgba(4,209,130,0.15)' : 'rgba(201,168,76,0.15)' }
                ]}>
                  <Text style={[
                    styles.referralStatusText,
                    { color: referral.status === 'converted' ? '#04D182' : '#C9A84C' }
                  ]}>
                    {referral.status === 'converted' ? 'Abonné' : 'En attente'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    backgroundColor: '#0A0A0A',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    color: '#F5F0E8',
    letterSpacing: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(4,209,130,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: 'Cinzel',
    fontSize: 18,
    color: '#F5F0E8',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: 'EBGaramond',
    fontSize: 15,
    color: 'rgba(245,240,232,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },

  // Section Label
  sectionLabel: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 4,
    color: '#C9A84C',
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // Code Section
  codeSection: {
    marginBottom: 28,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111111',
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222222',
  },
  codeText: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    color: '#04D182',
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(4,209,130,0.4)',
  },
  copyBtnCopied: {
    backgroundColor: '#04D182',
    borderColor: '#04D182',
  },
  copyBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    letterSpacing: 1,
    color: '#04D182',
    textTransform: 'uppercase',
  },
  copyBtnTextCopied: {
    color: '#0A0A0A',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#04D182',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  shareBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    letterSpacing: 2,
    color: '#0A0A0A',
    textTransform: 'uppercase',
  },

  // Stats Section
  statsSection: {
    marginBottom: 28,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111111',
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Cinzel',
    fontSize: 24,
    color: '#F5F0E8',
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 1,
    color: '#777777',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  bonusAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(201,168,76,0.1)',
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#C9A84C',
  },
  bonusText: {
    flex: 1,
    fontFamily: 'EBGaramond',
    fontSize: 14,
    color: 'rgba(245,240,232,0.8)',
  },
  bonusHighlight: {
    color: '#C9A84C',
    fontWeight: '600',
  },

  // How it Works
  howItWorksSection: {
    marginBottom: 28,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(4,209,130,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    color: '#04D182',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    color: '#F5F0E8',
    marginBottom: 4,
  },
  stepDesc: {
    fontFamily: 'EBGaramond',
    fontSize: 13,
    color: 'rgba(245,240,232,0.5)',
    lineHeight: 20,
  },

  // Referrals List
  referralsSection: {
    marginBottom: 20,
  },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111111',
    padding: 14,
    marginBottom: 8,
  },
  referralAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralInitial: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    color: '#777',
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    color: '#F5F0E8',
    marginBottom: 2,
  },
  referralDate: {
    fontFamily: 'EBGaramond',
    fontSize: 11,
    color: '#777777',
  },
  referralStatus: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  referralStatusText: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
