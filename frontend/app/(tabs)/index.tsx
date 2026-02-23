import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { formatDuration } from '../../constants/mockData';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');

// ─── Rank colors ──────────────────────────────────────────────────────────────
const RANK_COLOR = [
  '#C9A84C',
  'rgba(201,168,76,0.55)',
  'rgba(201,168,76,0.35)',
  '#444444',
  '#444444',
];

// ─── Month helper ──────────────────────────────────────────────────────────────
function monthLabel() {
  const M = ['Jan.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin',
    'Juil.', 'Août', 'Sep.', 'Oct.', 'Nov.', 'Déc.'];
  const n = new Date();
  return `${M[n.getMonth()]} ${n.getFullYear()}`;
}

function fmtDur(s: number) { return s > 0 ? formatDuration(s) : ''; }

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiRequest('/home', token);
      setData(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const goAudio = (id: string) => router.push(`/audio/${id}` as any);
  const goCourse = (id: string) => router.push(`/course/${id}` as any);
  const goSearch = () => router.push('/search' as any);
  const goHero = (hero: any) => {
    if (hero?.hero_type === 'cursus') {
      router.push(`/cursus/${hero.cursus_id}` as any);
    } else {
      goCourse(hero?.id);
    }
  };

  if (loading) {
    return <View style={s.loadWrap}><ActivityIndicator size="large" color="#04D182" /></View>;
  }

  const {
    featured_course: hero,
    continue_watching = [],
    recent_episodes = [],
    recommendations = [],
    scholars = [],
    top5_courses = [],
  } = data || {};

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* ── NAV HAUTE (sticky — hors ScrollView) ── */}
      <View style={s.topNav} testID="top-nav">
        {/* Logo SIJILL + dot */}
        <View style={s.logoRow}>
          <Text style={s.logoText}>SIJILL</Text>
          <View style={s.logoDot} />
        </View>
        {/* Search */}
        <TouchableOpacity testID="home-search-btn" onPress={goSearch} style={s.navSearchBtn}>
          <Ionicons name="search-outline" size={20} color="#F5F0E8" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* ── SCROLLABLE CONTENT ── */}
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#04D182" />}
      >

        {/* ── BLOC 1 : HERO ── */}
        {hero && (
          <View style={s.hero}>
            {/* Radial glow */}
            <View style={s.heroGlow} pointerEvents="none" />

            {/* Eyebrow */}
            <View style={s.heroEyebrow}>
              <View style={[s.heroEyebrowLine, { backgroundColor: hero.cursus_color || '#04D182' }]} />
              <Text style={[s.heroEyebrowText, { color: hero.cursus_color || '#04D182' }]}>
                À la une · Cursus {hero.cursus_letter || 'A'}
              </Text>
            </View>

            {/* Title */}
            <Text style={s.heroTitle} testID="home-hero-title">{hero.title}</Text>

            {/* Description */}
            {hero.description ? (
              <Text style={s.heroDesc} numberOfLines={3}>{hero.description}</Text>
            ) : null}

            {/* Buttons */}
            <View style={s.heroBtns}>
              <TouchableOpacity
                testID="home-hero-start-btn"
                style={s.btnPrimary}
                onPress={() => goHero(hero)}
              >
                <Ionicons name="play" size={11} color="#0A0A0A" />
                <Text style={s.btnPrimaryText}>COMMENCER</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="home-hero-more-btn"
                style={s.btnSecondary}
                onPress={() => goHero(hero)}
              >
                <Text style={s.btnSecondaryText}>EN SAVOIR PLUS</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── BLOC 2 : NOUVEAUX ÉPISODES ── */}
        {recent_episodes.length > 0 && (
          <View style={s.block}>
            <SectionHeader
              title="Nouveaux épisodes"
              link="Voir tout →"
              onLink={() => router.push('/(tabs)/cursus' as any)}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.hList}
            >
              {recent_episodes.slice(0, 5).map((ep: any, i: number) => (
                <EpisodeCard
                  key={ep.id || i}
                  testID={`home-ep-${ep.id}`}
                  color={ep.cursus_color || '#04D182'}
                  label={`CURSUS ${ep.cursus_letter || 'A'}`}
                  title={ep.title}
                  meta={[
                    ep.duration > 0 ? fmtDur(ep.duration) : null,
                    ep.episode_number ? `Ép. ${ep.episode_number}` : null,
                  ].filter(Boolean).join(' · ')}
                  onPress={() => goAudio(ep.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── BLOC 3 : RECOMMANDATIONS ── */}
        {recommendations.length > 0 && (
          <View style={s.block}>
            <SectionHeader
              title="Recommandé pour vous"
              link="Voir tout →"
              onLink={() => router.push('/(tabs)/cursus' as any)}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.hList}
            >
              {recommendations.slice(0, 4).map((c: any, i: number) => (
                <RecoCard
                  key={c.id || i}
                  testID={`home-rec-${c.id}`}
                  color={c.cursus_color || '#04D182'}
                  label={`CURSUS ${c.cursus_letter || 'A'}`}
                  title={c.title}
                  reason={c.description}
                  meta={[
                    c.duration > 0 ? fmtDur(c.duration) : null,
                    c.modules_count > 0 ? `${c.modules_count} épisodes` : null,
                  ].filter(Boolean).join(' · ')}
                  onPress={() => goCourse(c.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── BLOC 4 : TOP 5 ── */}
        {top5_courses.length > 0 && (
          <View style={[s.block, { marginBottom: 24 }]}>
            <View style={s.sectionHead}>
              <View style={s.top5TitleRow}>
                <Text style={s.sectionTitle}>Top 5 du mois</Text>
                <Text style={s.top5Month}>{monthLabel()}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/cursus' as any)}>
                <Text style={s.sectionLink}>Voir →</Text>
              </TouchableOpacity>
            </View>

            <View>
              {top5_courses.map((c: any, i: number) => (
                <TouchableOpacity
                  key={c.id || i}
                  testID={`home-top5-${c.id}`}
                  style={[s.top5Row, i < top5_courses.length - 1 && s.top5RowBorder]}
                  onPress={() => goCourse(c.id)}
                  activeOpacity={0.75}
                >
                  {/* Rank */}
                  <Text style={[
                    s.top5Rank,
                    { color: RANK_COLOR[i] || '#444444' },
                    i === 0 && Platform.OS === 'web' ? { textShadow: '0 0 16px rgba(201,168,76,0.35)' } as any : {},
                  ]}>
                    {i + 1}
                  </Text>

                  {/* Info */}
                  <View style={s.top5Info}>
                    <Text style={[s.top5Label, { color: c.cursus_color || '#04D182' }]}>
                      {`CURSUS ${c.cursus_letter || 'A'}`}
                    </Text>
                    <Text style={s.top5Title} numberOfLines={2}>{c.title}</Text>
                    {c.scholar_name ? (
                      <Text style={s.top5Author} numberOfLines={1}>
                        Prof. {c.scholar_name}
                      </Text>
                    ) : null}
                  </View>

                  {/* Right col: badge + duration */}
                  <View style={s.top5Right}>
                    {i === 0 && <Badge label="Nº1" />}
                    {i === 1 && <Badge label="↑ 3" />}
                    {i === 4 && <Badge label="Nouveau" />}
                    {c.duration > 0 && (
                      <Text style={s.top5Duration}>{fmtDur(c.duration)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, link, onLink }: { title: string; link: string; onLink: () => void }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionTitle}>{title}</Text>
      <TouchableOpacity onPress={onLink}>
        <Text style={s.sectionLink}>{link}</Text>
      </TouchableOpacity>
    </View>
  );
}

function EpisodeCard({ testID, color, label, title, meta, onPress }: any) {
  const [hovered, setHovered] = useState(false);
  const hoverProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  } : {};

  return (
    <TouchableOpacity
      testID={testID}
      style={[
        s.epCard,
        Platform.OS === 'web' ? {
          borderBottomWidth: 2,
          borderBottomColor: hovered ? color : 'transparent',
          backgroundColor: hovered ? '#222222' : '#1A1A1A',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        } as any : {},
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      {...hoverProps}
    >
      <Text style={[s.epLabel, { color }]}>{label}</Text>
      <Text style={s.epTitle} numberOfLines={4}>{title}</Text>
      {meta ? (
        <View style={s.epMetaRow}>
          <Text style={s.epMeta}>{meta}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function RecoCard({ testID, color, label, title, reason, meta, onPress }: any) {
  return (
    <TouchableOpacity testID={testID} style={s.recoCard} onPress={onPress} activeOpacity={0.8}>
      <Text style={[s.epLabel, { color }]}>{label}</Text>
      <Text style={s.recoTitle} numberOfLines={3}>{title}</Text>
      {reason ? (
        <View style={s.recoReasonWrap}>
          <Text style={s.recoReason} numberOfLines={2}>{reason}</Text>
        </View>
      ) : null}
      {meta ? <Text style={s.epMeta}>{meta}</Text> : null}
    </TouchableOpacity>
  );
}

function Badge({ label }: { label: string }) {
  const isGreen = label.startsWith('↑');
  return (
    <View style={[s.badge, { backgroundColor: isGreen ? 'rgba(4,209,130,0.1)' : 'rgba(201,168,76,0.12)' }]}>
      <Text style={[s.badgeText, { color: isGreen ? '#04D182' : '#C9A84C' }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const EP_W = Math.max(150, Math.min(SW * 0.42, 180));
const RECO_W = Math.max(170, Math.min(SW * 0.48, 200));

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },
  scroll: { flex: 1 },
  loadWrap: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },

  // ── TOP NAV ──────────────────────────────────────────────────────────
  topNav: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    backgroundColor: 'rgba(10,10,10,0.95)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } as any : {}),
  },
  logoRow: { flexDirection: 'row', alignItems: 'flex-end' },
  logoText: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    letterSpacing: 5,
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
  navSearchBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── HERO ─────────────────────────────────────────────────────────────
  hero: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 28,
    overflow: 'hidden',
    position: 'relative',
    backgroundImage: 'linear-gradient(160deg, #111111 0%, #0A0A0A 100%)',
    ...(Platform.OS === 'web' ? { background: 'linear-gradient(160deg, #111111 0%, #0A0A0A 100%)' } as any : { backgroundColor: '#111111' }),
  } as any,
  heroGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(4,209,130,0.05)',
    pointerEvents: 'none',
  } as any,
  heroEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  heroEyebrowLine: {
    width: 18,
    height: 1,
  },
  heroEyebrowText: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: 'Cinzel',
    fontSize: 19,
    fontWeight: '400',
    color: '#F5F0E8',
    lineHeight: 26,
    letterSpacing: 1,
    marginBottom: 10,
  },
  heroDesc: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 14,
    color: 'rgba(245,240,232,0.55)',
    lineHeight: 22,
    marginBottom: 18,
  },
  heroBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#04D182',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  btnPrimaryText: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    color: '#0A0A0A',
    letterSpacing: 3,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.35)',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  btnSecondaryText: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    color: '#C9A84C',
    letterSpacing: 3,
  },

  // ── SECTIONS ─────────────────────────────────────────────────────────
  block: { paddingTop: 28 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    color: '#F5F0E8',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  sectionLink: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 13,
    color: '#C9A84C',
  },
  hList: { paddingHorizontal: 20, gap: 10 },

  // ── EPISODE CARD ─────────────────────────────────────────────────────
  epCard: {
    width: EP_W,
    backgroundColor: '#1A1A1A',
    padding: 14,
    minHeight: 120,
    justifyContent: 'space-between',
    cursor: 'pointer',
  } as any,
  epLabel: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  epTitle: {
    fontFamily: 'EB Garamond',
    fontSize: 13,
    color: '#F5F0E8',
    lineHeight: 18,
    flex: 1,
  },
  epMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  epMeta: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    color: '#777777',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── RECO CARD ────────────────────────────────────────────────────────
  recoCard: {
    width: RECO_W,
    backgroundColor: '#1A1A1A',
    padding: 14,
    minHeight: 150,
    justifyContent: 'space-between',
    cursor: 'pointer',
  } as any,
  recoTitle: {
    fontFamily: 'EB Garamond',
    fontSize: 13,
    color: '#F5F0E8',
    lineHeight: 18,
    flex: 1,
  },
  recoReasonWrap: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(201,168,76,0.3)',
    paddingLeft: 8,
    marginVertical: 6,
  },
  recoReason: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 11,
    color: '#777777',
    lineHeight: 16,
  },

  // ── TOP 5 ────────────────────────────────────────────────────────────
  top5TitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  top5Month: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 11,
    color: '#777777',
  },
  top5Row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#1A1A1A',
    marginBottom: 2,
    cursor: 'pointer',
  } as any,
  top5RowBorder: {
    borderBottomWidth: 0,
  },
  top5Rank: {
    fontFamily: 'Cinzel',
    fontWeight: '600',
    fontSize: 22,
    width: 32,
    textAlign: 'center',
    lineHeight: 28,
    flexShrink: 0,
  },
  top5Info: { flex: 1, minWidth: 0 },
  top5Label: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  top5Title: {
    fontFamily: 'EB Garamond',
    fontSize: 13,
    color: '#F5F0E8',
    lineHeight: 17,
    marginBottom: 3,
  },
  top5Author: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 11,
    color: '#777777',
  },
  top5Right: {
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: 4,
  },
  top5Duration: {
    fontFamily: 'EB Garamond',
    fontSize: 12,
    color: '#777777',
  },
  // ── BADGE ────────────────────────────────────────────────────────────
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: 'Cinzel',
    fontSize: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
