import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE "QUI SOMMES-NOUS" — MANIFESTE SIJILL PROJECT
// Design system : fond #0A0A0A, Cinzel (titres) + EB Garamond (corps)
// Accents : vert #04D182 (labels), or #C9A84C (éditorial), zéro border-radius
// ═══════════════════════════════════════════════════════════════════════════════

const DOMAIN_TAGS = [
  { label: 'Falsafa', color: '#04D182' },
  { label: 'Kalām', color: '#8B5CF6' },
  { label: 'Soufisme', color: '#06B6D4' },
  { label: 'Exégèse', color: '#F59E0B' },
  { label: 'Poésie mystique', color: '#EC4899' },
  { label: 'Philosophie politique', color: '#C9A84C' },
  { label: 'Sciences du hadith', color: '#04D182' },
  { label: 'Ismaélisme', color: '#8B5CF6' },
  { label: 'Mathématiques', color: '#F59E0B' },
  { label: 'Astronomie', color: '#06B6D4' },
  { label: 'Médecine', color: '#EC4899' },
  { label: 'Géographie', color: '#C9A84C' },
  { label: 'Muʿtazilisme', color: '#04D182' },
  { label: 'Ashʿarisme', color: '#8B5CF6' },
  { label: 'Philosophie persane', color: '#06B6D4' },
];

const PRINCIPLES = [
  {
    num: '01',
    digit: '1',
    title: 'La rigueur scientifique comme exigence première',
    desc: 'Tous les contenus sont conçus par des chercheurs reconnus. Une transmission fondée sur les textes, les manuscrits et les travaux académiques contemporains.',
  },
  {
    num: '02',
    digit: '2',
    title: 'Une vision globale des savoirs islamiques',
    desc: "L'Islam classique ne s'est jamais développé dans une seule direction. Falsafa, kalām, soufisme, sciences naturelles, arts — un tissu intellectuel cohérent dans sa diversité.",
  },
  {
    num: '03',
    digit: '3',
    title: 'Une contextualisation historique précise',
    desc: "Comprendre Avicenne sans le mouvement de traduction du grec, ou Ibn ʿArabī sans la crise des savoirs du XIe siècle, est impossible. Chaque œuvre replacée dans son époque.",
  },
  {
    num: '04',
    digit: '4',
    title: 'Une pédagogie adaptée aux rythmes contemporains',
    desc: "Capsules de 6 à 21 minutes, chacune centrée sur une question précise. Un accès progressif à des matières exigeantes, sans sacrifier la complexité.",
  },
];

export default function AboutScreen() {
  const router = useRouter();
  const [hoveredPrinciple, setHoveredPrinciple] = useState<number | null>(null);

  return (
    <View style={styles.root}>
      <ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ═══════════════════════════════════════════════════════════════════════
            1. HERO MANIFESTE
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.hero}>
          {/* Cercles décoratifs */}
          <View style={styles.heroCircleLarge} />
          <View style={styles.heroCircleSmall} />
          
          {/* Ligne verticale dorée */}
          <View style={styles.heroGoldLine} />

          {/* Eyebrow */}
          <View style={styles.eyebrow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrowText}>Notre identité</Text>
          </View>

          {/* Titre principal */}
          <View style={styles.heroTitleBlock}>
            <Text style={styles.heroTitle}>Comprendre, transmettre,</Text>
            <Text style={styles.heroTitleItalic}>penser la pluralité des savoirs islamiques</Text>
          </View>

          {/* Introduction */}
          <Text style={styles.heroIntro}>
            Une plateforme académique née d'une conviction : l'histoire intellectuelle du monde islamique constitue l'un des patrimoines les plus riches et les plus féconds de l'humanité.
          </Text>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            2. SÉPARATEUR DIAMANT
        ═══════════════════════════════════════════════════════════════════════ */}
        <DiamondSeparator />

        {/* ═══════════════════════════════════════════════════════════════════════
            3. SECTION "POURQUOI SIJILL PROJECT ?"
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Pourquoi Sijill Project ?</Text>
          <Text style={styles.sectionText}>
            Parce que comprendre les savoirs du monde islamique est{' '}
            <Text style={styles.textBold}>essentiel pour comprendre l'histoire globale des idées</Text>. 
            Parce qu'il existe aujourd'hui un besoin profond d'accéder à ces héritages autrement que 
            par des récits simplifiés, confessionnels ou polarisés.
          </Text>
          <Text style={[styles.sectionText, { marginTop: 12 }]}>
            Parce que ces savoirs continuent d'inspirer des recherches contemporaines en philosophie, 
            théologie, anthropologie, sciences historiques et études comparées.
          </Text>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            4. BLOC CITATION SHLOMO PINES
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.quoteBlock}>
          <Text style={styles.quoteGuillemet}>"</Text>
          <Text style={styles.quoteText}>
            La civilisation musulmane, dès ses débuts, a inclus un nombre bien plus important 
            d'éléments d'origines diverses que la civilisation européenne. Elle n'a pas, de façon 
            générale, éliminé les systèmes divergents : elle leur a plutôt permis de coexister côte à côte.
          </Text>
          <View style={styles.quoteDivider} />
          <Text style={styles.quoteAttribution}>
            Shlomo Pines · Philosophe et historien des sciences
          </Text>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            2. SÉPARATEUR DIAMANT
        ═══════════════════════════════════════════════════════════════════════ */}
        <DiamondSeparator />

        {/* ═══════════════════════════════════════════════════════════════════════
            5. LES 4 PRINCIPES
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.principlesSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitleGray}>Quatre principes</Text>
            <View style={styles.sectionTitleLine} />
          </View>

          {PRINCIPLES.map((p, idx) => {
            const isHovered = hoveredPrinciple === idx;
            const hoverProps = Platform.OS === 'web' ? {
              onMouseEnter: () => setHoveredPrinciple(idx),
              onMouseLeave: () => setHoveredPrinciple(null),
            } : {};

            return (
              <TouchableOpacity
                key={p.num}
                style={[
                  styles.principleCard,
                  isHovered && styles.principleCardHover,
                ]}
                activeOpacity={0.9}
                {...hoverProps}
              >
                <Text style={styles.principleNum}>{p.num}</Text>
                <Text style={styles.principleGhost}>{p.digit}</Text>
                <Text style={styles.principleTitle}>{p.title}</Text>
                <Text style={styles.principleDesc}>{p.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            SÉPARATEUR DIAMANT
        ═══════════════════════════════════════════════════════════════════════ */}
        <DiamondSeparator />

        {/* ═══════════════════════════════════════════════════════════════════════
            6. MOSAÏQUE DES DOMAINES
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.domainsSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitleGray}>Domaines explorés</Text>
            <View style={styles.sectionTitleLine} />
          </View>

          <View style={styles.tagsGrid}>
            {DOMAIN_TAGS.map((tag) => (
              <View 
                key={tag.label} 
                style={[
                  styles.tag,
                  { borderColor: `${tag.color}40` },
                ]}
              >
                <Text style={[styles.tagText, { color: tag.color }]}>
                  {tag.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            7. BLOC VISION FINALE
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.visionBlock}>
          <View style={styles.visionTopLine} />
          <Text style={styles.visionLabel}>Notre ambition</Text>
          <Text style={styles.visionText}>
            Montrer comment, à travers ces échanges, s'est formée ce que l'on pourrait appeler une{' '}
            <Text style={styles.visionBold}>« civilisation de la pensée »</Text>, 
            où le débat, la dissension et la controverse étaient des moteurs de la créativité intellectuelle.
          </Text>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            8. FOOTER LOGO
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.footer}>
          <View style={styles.footerLineTop} />
          <View style={styles.footerLogoRow}>
            <Text style={styles.footerLogo}>SIJILL PROJECT</Text>
            <View style={styles.footerDot} />
          </View>
          <Text style={styles.footerDevise}>Rigueur · Pluralité · Transmission</Text>
          <View style={styles.footerLineBottom} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Composant Séparateur Diamant ─────────────────────────────────────────────
function DiamondSeparator() {
  return (
    <View style={styles.separator}>
      <View style={styles.separatorLine} />
      <View style={styles.separatorDiamond} />
      <View style={styles.separatorLine} />
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
  scrollContent: {
    paddingBottom: 20,
  },

  // ─── HERO ───────────────────────────────────────────────────────────────────
  hero: {
    paddingTop: 50, // Pour remonter derrière la status bar
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(170deg, #0C1A12 0%, #090D0A 55%, #0A0A0A 100%)',
    } as any : {
      backgroundColor: '#0A0A0A',
    }),
  },
  heroCircleLarge: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 360,
    height: 360,
    borderWidth: 1,
    borderColor: 'rgba(4,209,130,0.05)',
    borderRadius: 180,
    ...(Platform.OS === 'web' ? { pointerEvents: 'none' } as any : {}),
  },
  heroCircleSmall: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 240,
    height: 240,
    borderWidth: 1,
    borderColor: 'rgba(4,209,130,0.07)',
    borderRadius: 120,
    ...(Platform.OS === 'web' ? { pointerEvents: 'none' } as any : {}),
  },
  heroGoldLine: {
    position: 'absolute',
    left: 0,
    top: 70,
    bottom: 0,
    width: 2,
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(180deg, #C9A84C 0%, transparent 60%)',
    } as any : {
      backgroundColor: '#C9A84C',
      opacity: 0.5,
    }),
  },

  // Navigation
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    letterSpacing: 4,
    color: '#F5F0E8',
  },
  logoDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#04D182',
    marginLeft: 3,
    marginBottom: 3,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 8px rgba(4,209,130,0.5)' } as any : {}),
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
  moreBtn: {
    padding: 4,
  },

  // Eyebrow
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  eyebrowLine: {
    width: 18,
    height: 1,
    backgroundColor: '#C9A84C',
  },
  eyebrowText: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    letterSpacing: 4,
    color: '#C9A84C',
    textTransform: 'uppercase',
  },

  // Titre
  heroTitleBlock: {
    marginBottom: 14,
  },
  heroTitle: {
    fontFamily: 'Cinzel',
    fontSize: 20,
    fontWeight: '400',
    letterSpacing: 0.5,
    color: '#F5F0E8',
    lineHeight: 28,
  },
  heroTitleItalic: {
    fontFamily: 'EBGaramond',
    fontSize: 19,
    fontStyle: 'italic',
    color: 'rgba(245,240,232,0.70)',
    lineHeight: 26,
  },

  // Introduction
  heroIntro: {
    fontFamily: 'EBGaramond',
    fontSize: 16,
    color: 'rgba(245,240,232,0.55)',
    lineHeight: 26,
  },

  // ─── SÉPARATEUR DIAMANT ─────────────────────────────────────────────────────
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#222222',
  },
  separatorDiamond: {
    width: 6,
    height: 6,
    backgroundColor: '#C9A84C',
    transform: [{ rotate: '45deg' }],
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 8px rgba(201,168,76,0.25)',
    } as any : {
      shadowColor: '#C9A84C',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    }),
  },

  // ─── SECTION POURQUOI ───────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    letterSpacing: 4,
    color: '#04D182',
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  sectionText: {
    fontFamily: 'EBGaramond',
    fontSize: 16,
    color: 'rgba(245,240,232,0.60)',
    lineHeight: 27,
  },
  textBold: {
    fontFamily: 'EBGaramond',
    fontWeight: '500',
    color: '#F5F0E8',
  },

  // ─── BLOC CITATION ──────────────────────────────────────────────────────────
  quoteBlock: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(201,168,76,0.04)',
    borderLeftWidth: 2,
    borderLeftColor: '#C9A84C',
    padding: 16,
    paddingLeft: 18,
    position: 'relative',
  },
  quoteGuillemet: {
    position: 'absolute',
    top: 6,
    left: 12,
    fontFamily: 'EBGaramond',
    fontSize: 40,
    color: 'rgba(201,168,76,0.20)',
    lineHeight: 40,
  },
  quoteText: {
    fontFamily: 'EBGaramond',
    fontSize: 16,
    fontStyle: 'italic',
    color: 'rgba(245,240,232,0.75)',
    lineHeight: 27,
    paddingTop: 12,
  },
  quoteDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(201,168,76,0.15)',
    marginTop: 12,
    paddingTop: 10,
  },
  quoteAttribution: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    letterSpacing: 2,
    color: '#C9A84C',
    textTransform: 'uppercase',
  },

  // ─── PRINCIPES ──────────────────────────────────────────────────────────────
  principlesSection: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitleGray: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    letterSpacing: 4,
    color: '#777777',
    textTransform: 'uppercase',
  },
  sectionTitleLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#222222',
  },
  principleCard: {
    backgroundColor: '#111111',
    borderLeftWidth: 2,
    borderLeftColor: '#222222',
    padding: 14,
    paddingLeft: 16,
    marginBottom: 8,
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      transition: 'background-color 0.2s, border-left-color 0.2s',
      cursor: 'pointer',
    } as any : {}),
  },
  principleCardHover: {
    backgroundColor: '#1A1A1A',
    borderLeftColor: '#04D182',
  },
  principleNum: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    letterSpacing: 3,
    color: '#04D182',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  principleGhost: {
    position: 'absolute',
    right: 14,
    top: 10,
    fontFamily: 'Cinzel',
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(4,209,130,0.15)',
    lineHeight: 20,
    ...(Platform.OS === 'web' ? { pointerEvents: 'none' } as any : {}),
  },
  principleTitle: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#F5F0E8',
    lineHeight: 20,
    marginBottom: 8,
    paddingRight: 30,
  },
  principleDesc: {
    fontFamily: 'EBGaramond',
    fontSize: 15,
    color: 'rgba(245,240,232,0.55)',
    lineHeight: 24,
  },

  // ─── DOMAINES ───────────────────────────────────────────────────────────────
  domainsSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? {
      transition: 'background-color 0.2s',
      cursor: 'default',
    } as any : {}),
  },
  tagText: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ─── VISION FINALE ──────────────────────────────────────────────────────────
  visionBlock: {
    marginHorizontal: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.12)',
    padding: 18,
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(135deg, rgba(201,168,76,0.05) 0%, transparent 100%)',
    } as any : {
      backgroundColor: 'rgba(201,168,76,0.03)',
    }),
  },
  visionTopLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(90deg, #C9A84C, transparent)',
    } as any : {
      backgroundColor: '#C9A84C',
      opacity: 0.6,
    }),
  },
  visionLabel: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    letterSpacing: 4,
    color: '#C9A84C',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  visionText: {
    fontFamily: 'EBGaramond',
    fontSize: 16,
    fontStyle: 'italic',
    color: 'rgba(245,240,232,0.65)',
    lineHeight: 27,
  },
  visionBold: {
    fontFamily: 'EBGaramond',
    fontWeight: '500',
    fontStyle: 'normal',
    color: '#F5F0E8',
  },

  // ─── FOOTER ─────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 10,
  },
  footerLineTop: {
    width: 40,
    height: 1,
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
    } as any : {
      backgroundColor: '#C9A84C',
      opacity: 0.5,
    }),
  },
  footerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerLogo: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    letterSpacing: 5,
    color: 'rgba(245,240,232,0.15)',
  },
  footerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#04D182',
    marginTop: -8,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 8px rgba(4,209,130,0.5)' } as any : {}),
  },
  footerDevise: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    fontStyle: 'italic',
    color: '#777777',
    textAlign: 'center',
  },
  footerLineBottom: {
    width: 40,
    height: 1,
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
    } as any : {
      backgroundColor: '#C9A84C',
      opacity: 0.5,
    }),
  },
});
