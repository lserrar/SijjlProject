import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>Le Sijill<Text style={styles.logoAccent}>byLM</Text></Text>
          <Text style={styles.tagline}>Comprendre, transmettre, penser la pluralité des savoirs islamiques</Text>
        </View>

        {/* Section: Pourquoi Le Sijill */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle" size={24} color={colors.brand.primary} />
            <Text style={styles.sectionTitle}>Pourquoi Le Sijill ?</Text>
          </View>
          <Text style={styles.paragraph}>
            Parce que comprendre les savoirs du monde islamique est essentiel pour comprendre l'histoire globale des idées. Parce qu'il existe aujourd'hui un besoin profond d'accéder à ces héritages autrement que par des récits simplifiés, confessionnels ou polarisés.
          </Text>
          <Text style={styles.paragraph}>
            Parce que les sciences islamiques classiques offrent des outils irremplaçables pour repenser les rapports entre raison et révélation, entre rationalité et présence, entre concept et lumière, entre monde visible et mondes invisibles.
          </Text>
          <Text style={styles.paragraph}>
            Parce que ces savoirs continuent d'inspirer des recherches contemporaines en philosophie, théologie, anthropologie, sciences historiques, esthétique ou études comparées.
          </Text>
          <Text style={styles.highlight}>
            Le Sijill est un espace où ces héritages sont présentés dans leur complexité, avec le sérieux qu'ils méritent, et avec la conviction qu'ils demeurent essentiels pour penser le monde aujourd'hui.
          </Text>
        </View>

        {/* Section: Qui sommes-nous */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={24} color={colors.brand.primary} />
            <Text style={styles.sectionTitle}>Qui sommes-nous ?</Text>
          </View>
          <Text style={styles.paragraph}>
            Le Sijill est une plateforme académique née d'une conviction : l'histoire intellectuelle du monde islamique constitue l'un des patrimoines les plus riches, les plus pluriels et les plus féconds de l'humanité, mais trop souvent, elle demeure inaccessible, fragmentaire ou déformée.
          </Text>
          <Text style={styles.paragraph}>
            La philosophie, le kalām, la théologie, l'exégèse, l'histoire du hadith, le soufisme spéculatif, l'art, la littérature et les sciences ont pourtant été, durant des siècles, les lieux d'élaboration d'une véritable culture de la complexité, capable d'accueillir des héritages multiples, de les transformer et de les faire dialoguer.
          </Text>
          <Text style={styles.paragraph}>
            Notre projet est né de cette intuition : offrir un espace rigoureux, exigeant et ouvert, permettant d'explorer ces savoirs dans leur complexité, leur diversité et leurs continuités internes.
          </Text>
        </View>

        {/* Quote Box */}
        <View style={styles.quoteBox}>
          <Ionicons name="chatbubble-ellipses" size={28} color={colors.brand.primary} style={styles.quoteIcon} />
          <Text style={styles.quoteText}>
            « La civilisation musulmane, dès ses débuts, a inclus un nombre bien plus important d'éléments d'origines diverses que la civilisation européenne. Dans son développement ultérieur, lorsqu'il y avait des conflits entre deux systèmes philosophiques divergents, elle n'a pas, de façon générale, éliminé l'un d'entre eux : elle leur a plutôt permis de coexister côte à côte ou à des niveaux différents. »
          </Text>
          <Text style={styles.quoteAuthor}>— Shlomo Pines</Text>
        </View>

        {/* Section: Les 4 principes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="school" size={24} color={colors.brand.primary} />
            <Text style={styles.sectionTitle}>Un projet académique structuré autour de quatre principes</Text>
          </View>

          {/* Principe 1 */}
          <View style={styles.principleCard}>
            <View style={styles.principleNumber}>
              <Text style={styles.principleNumberText}>1</Text>
            </View>
            <View style={styles.principleContent}>
              <Text style={styles.principleTitle}>La rigueur scientifique comme exigence première</Text>
              <Text style={styles.principleText}>
                Tous les contenus proposés sur Le Sijill sont conçus ou présentés par des chercheurs, enseignants-chercheurs ou universitaires reconnus dans leur domaine. Nous ne proposons ni vulgarisation approximative, ni discours d'autorité, mais une transmission fondée sur les textes, les manuscrits, les éditions critiques et les travaux académiques contemporains.
              </Text>
            </View>
          </View>

          {/* Principe 2 */}
          <View style={styles.principleCard}>
            <View style={styles.principleNumber}>
              <Text style={styles.principleNumberText}>2</Text>
            </View>
            <View style={styles.principleContent}>
              <Text style={styles.principleTitle}>Une vision globale des savoirs islamiques</Text>
              <Text style={styles.principleText}>
                L'Islam classique et prémoderne ne s'est jamais développé dans une seule direction. La pensée islamique est un espace à plusieurs dimensions : la falsafa, le kalām, l'exégèse, les sciences du hadith, les traditions de sagesse orientale, le soufisme, la philosophie politique, la cosmologie, les arts, la poésie...
              </Text>
            </View>
          </View>

          {/* Principe 3 */}
          <View style={styles.principleCard}>
            <View style={styles.principleNumber}>
              <Text style={styles.principleNumberText}>3</Text>
            </View>
            <View style={styles.principleContent}>
              <Text style={styles.principleTitle}>Une contextualisation historique précise</Text>
              <Text style={styles.principleText}>
                Comprendre le kalām sans saisir les débats du VIIIe siècle ; comprendre Avicenne sans l'important mouvement de traduction du grec ; comprendre Ibn ʿArabī sans la crise des savoirs du XIe siècle — tout cela est impossible. Nos modules replacent chaque œuvre dans son époque, dans son environnement politique, dans sa langue et dans son horizon conceptuel.
              </Text>
            </View>
          </View>

          {/* Principe 4 */}
          <View style={styles.principleCard}>
            <View style={styles.principleNumber}>
              <Text style={styles.principleNumberText}>4</Text>
            </View>
            <View style={styles.principleContent}>
              <Text style={styles.principleTitle}>Une pédagogie adaptée aux rythmes contemporains</Text>
              <Text style={styles.principleText}>
                Nos modules sont construits autour de capsules de 6 à 21 minutes, chacune centrée sur une question précise, un texte, un auteur, une notion ou un débat. Une grande attention est portée à la visualisation : frises chronologiques, cartes, schémas conceptuels, citations commentées.
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Notre mission */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="compass" size={24} color={colors.brand.primary} />
            <Text style={styles.sectionTitle}>Une plateforme au service d'un héritage intellectuel pluriel</Text>
          </View>
          <Text style={styles.paragraph}>
            L'objectif de Le Sijill n'est pas de promouvoir une école, une confession, une vision ou un cadre doctrinal particuliers. Nous ne cherchons ni à défendre une orthodoxie, ni à imposer une lecture, ni à simplifier les divergences.
          </Text>
          <Text style={styles.paragraph}>
            Ce que nous souhaitons, c'est mettre en lumière :
          </Text>
          
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• La richesse de la philosophie islamique dans ses formes orientales et occidentales</Text>
            <Text style={styles.bulletItem}>• Les débats passionnés du kalām, des Muʿtazilites aux Ashʿarites</Text>
            <Text style={styles.bulletItem}>• La puissance littéraire et métaphysique du soufisme classique</Text>
            <Text style={styles.bulletItem}>• L'apport décisif des savants non musulmans dans la transmission des savoirs</Text>
            <Text style={styles.bulletItem}>• Les formes multiples d'interprétation du Coran et de la Sunna</Text>
            <Text style={styles.bulletItem}>• L'articulation entre sciences religieuses, philosophiques et naturelles</Text>
            <Text style={styles.bulletItem}>• Les interactions constantes entre monde islamique, héritage grec, pensée indienne et traditions persanes</Text>
          </View>

          <Text style={styles.highlight}>
            Nous voulons montrer comment, à travers ces échanges, s'est formée ce que l'on pourrait appeler une « civilisation de la pensée », où le débat, la dissension et la controverse étaient des moteurs de la créativité intellectuelle.
          </Text>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  logoText: {
    fontFamily: 'Inter-Bold',
    fontSize: 36,
    color: colors.text.primary,
  },
  logoAccent: {
    color: colors.brand.primary,
    fontSize: 24,
  },
  tagline: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.text.primary,
    flex: 1,
  },
  paragraph: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  highlight: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: colors.brand.primary,
    lineHeight: 24,
    backgroundColor: colors.brand.primary + '10',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand.primary,
    marginTop: spacing.sm,
  },
  quoteBox: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: colors.background.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  quoteIcon: {
    marginBottom: spacing.sm,
  },
  quoteText: {
    fontFamily: 'DMSans-Italic',
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'right',
  },
  principleCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  principleNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  principleNumberText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#000',
  },
  principleContent: {
    flex: 1,
  },
  principleTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  principleText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  bulletList: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  bulletItem: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 24,
    paddingLeft: spacing.sm,
  },
});
