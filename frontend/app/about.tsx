import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AboutScreen() {
  const router = useRouter();

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const TEAM_MEMBERS = [
    { name: 'Loubna Serrar', role: 'Fondatrice & Directrice' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            testID="about-back-btn"
            style={styles.backBtn} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>À propos</Text>
        </View>

        {/* Logo & Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoMain}>Le Sijill</Text>
            <Text style={styles.logoByLM}>by LM</Text>
          </View>
          <Text style={styles.tagline}>La sagesse à portée de main</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        {/* Mission */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notre mission</Text>
          <View style={styles.card}>
            <Text style={styles.missionText}>
              Le Sijill est une plateforme d'e-learning dédiée aux études islamiques académiques. 
              Notre mission est de rendre accessible un savoir rigoureux et authentique, 
              transmis par des professeurs reconnus dans leur domaine.
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ce que nous offrons</Text>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="book" size={22} color={colors.brand.primary} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Cours académiques</Text>
              <Text style={styles.featureDesc}>Des cursus structurés par des experts</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="headset" size={22} color={colors.brand.primary} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Podcasts & Audios</Text>
              <Text style={styles.featureDesc}>Apprenez en mobilité</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="videocam" size={22} color={colors.brand.primary} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Masterclasses en direct</Text>
              <Text style={styles.featureDesc}>Interagissez avec les professeurs</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="library" size={22} color={colors.brand.primary} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Bibliothèque</Text>
              <Text style={styles.featureDesc}>Articles et ressources complémentaires</Text>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => openLink('mailto:contact@hikmabylm.com')}
          >
            <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
            <Text style={styles.contactText}>contact@hikmabylm.com</Text>
            <Ionicons name="open-outline" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => openLink('https://www.instagram.com/hikmabylm')}
          >
            <Ionicons name="logo-instagram" size={20} color={colors.text.secondary} />
            <Text style={styles.contactText}>@hikmabylm</Text>
            <Ionicons name="open-outline" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Légal</Text>
          
          <TouchableOpacity style={styles.legalItem}>
            <Text style={styles.legalText}>Conditions générales d'utilisation</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.legalItem}>
            <Text style={styles.legalText}>Politique de confidentialité</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.legalItem}>
            <Text style={styles.legalText}>Mentions légales</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Copyright */}
        <View style={styles.copyright}>
          <Text style={styles.copyrightText}>© 2025 Le Sijill. Tous droits réservés.</Text>
          <Text style={styles.copyrightSubtext}>Fait avec ❤️ pour la communauté</Text>
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

  brandSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.sm },
  logoLe Sijill: { fontFamily: 'Inter-Bold', fontSize: 42, color: colors.text.primary, letterSpacing: -1 },
  logoByLM: { fontFamily: 'Inter-Regular', fontSize: 16, color: colors.brand.primary, marginLeft: 4 },
  tagline: { fontFamily: 'DMSans-Regular', fontSize: 16, color: colors.text.secondary, marginBottom: spacing.xs },
  version: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.text.tertiary },

  section: { marginBottom: spacing.xl, paddingHorizontal: spacing.lg },
  sectionTitle: { 
    fontFamily: 'Inter-SemiBold', 
    fontSize: 13, 
    color: colors.text.secondary, 
    marginBottom: spacing.md, 
    letterSpacing: 0.5, 
    textTransform: 'uppercase' 
  },

  card: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  missionText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 24,
  },

  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(217, 255, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureInfo: { flex: 1 },
  featureTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: colors.text.primary },
  featureDesc: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.text.tertiary, marginTop: 2 },

  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  contactText: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 14, color: colors.text.primary },

  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  legalText: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.text.primary },

  copyright: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  copyrightText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.tertiary },
  copyrightSubtext: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.tertiary, marginTop: 4 },
});
