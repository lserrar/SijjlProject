import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiRequest, useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { Ionicons } from '@expo/vector-icons';
import TranscriptReader from '../../components/TranscriptReader';

const { width: SW } = Dimensions.get('window');
const SPEEDS = [1.0, 1.25, 1.5, 2.0, 0.75];

// Waveform bar heights (% of 32px container)
const WF_HEIGHTS = [40, 60, 45, 80, 55, 90, 70, 50, 65, 85, 40, 55, 75, 60, 95, 50, 70, 40, 60, 45, 80, 55, 90, 50, 30, 70, 85, 60, 45, 55];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function fmtDur(s: number) {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60 > 0 ? (m % 60) + 'min' : ''}`.trim();
  return `${m} min`;
}

// ─── Waveform ─────────────────────────────────────────────────────────────────
function Waveform({ progress, color, onSeek }: { progress: number; color: string; onSeek: (p: number) => void }) {
  const playedCount = Math.floor(progress * WF_HEIGHTS.length);
  const handlePress = (evt: any) => {
    const x = evt.nativeEvent?.locationX ?? evt.nativeEvent?.offsetX ?? 0;
    const w = SW - 40;
    onSeek(Math.max(0, Math.min(1, x / w)));
  };
  return (
    <TouchableOpacity
      testID="audio-waveform"
      style={s.waveform}
      onPress={handlePress}
      activeOpacity={1}
    >
      {WF_HEIGHTS.map((h, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(4, Math.round(h / 100 * 32)),
            backgroundColor: i < playedCount ? color : '#222222',
            borderRadius: 1,
          }}
        />
      ))}
    </TouchableOpacity>
  );
}

// ─── Scrubber ─────────────────────────────────────────────────────────────────
function Scrubber({ progress, duration, color, position, onSeek }: any) {
  const handlePress = (evt: any) => {
    const x = evt.nativeEvent?.locationX ?? evt.nativeEvent?.offsetX ?? 0;
    const w = SW - 40;
    onSeek(Math.max(0, Math.min(1, x / w)));
  };
  const pct = `${Math.min(100, progress * 100)}%`;
  return (
    <View testID="audio-scrubber">
      <TouchableOpacity style={s.scrubberWrap} onPress={handlePress} activeOpacity={1}>
        <View style={s.scrubberTrack}>
          <View style={[s.scrubberFill, { width: pct, backgroundColor: color }]} />
          <View style={[s.scrubberThumb, { left: pct, backgroundColor: color,
            ...(Platform.OS === 'web' ? { boxShadow: `0 0 8px ${color}66` } as any : { shadowColor: color, shadowOpacity: 0.4, shadowRadius: 4 }),
          }]} />
        </View>
      </TouchableOpacity>
      <View style={s.timeRow}>
        <Text style={s.timeElapsed}>{formatTime(position)}</Text>
        <Text style={s.timeDuration}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AudioDetailScreen() {
  const { id, course_id, autoplay } = useLocalSearchParams<{ id: string; course_id?: string; autoplay?: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { currentTrack, isPlaying, position, duration, togglePlayPause, seekTo, skipForward, skipBackward, setSpeed, speed, setOnFinish } = usePlayer();
  const { play } = useAudioPlayer();

  const [audio, setAudio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedProgress = useRef(0);

  const isCurrentTrack = currentTrack?.id === id;
  const displayPosition = isCurrentTrack ? position : 0;
  const displayDuration = isCurrentTrack ? duration : (audio?.duration || 0);
  const progress = displayDuration > 0 ? displayPosition / displayDuration : 0;

  const currentIndex = playlist.findIndex(p => p.audio_id === id);
  const nextItem = currentIndex >= 0 && currentIndex < playlist.length - 1 ? playlist[currentIndex + 1] : null;

  const cursusColor = audio?.cursus_color || '#04D182';
  const cursusLetter = audio?.cursus_letter || 'A';

  const speedIdx = SPEEDS.indexOf(speed);
  const nextSpeed = SPEEDS[(speedIdx + 1) % SPEEDS.length];

  useEffect(() => {
    loadAudio();
    if (course_id) loadPlaylist();
  }, [id]);

  useEffect(() => {
    if (!loading && audio && autoplay === '1' && !isCurrentTrack) {
      play(audio);
    }
  }, [loading, audio]);

  useEffect(() => {
    setOnFinish(() => {
      if (nextItem) {
        setShowNextOverlay(true);
        setCountdown(5);
        let count = 5;
        countdownRef.current = setInterval(() => {
          count -= 1;
          setCountdown(count);
          if (count <= 0) {
            clearInterval(countdownRef.current!);
            navigateToNext();
          }
        }, 1000);
      }
    });
    return () => {
      setOnFinish(null);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [nextItem, id]);

  // Auto-save progress every 30s
  useEffect(() => {
    if (!isCurrentTrack || !isPlaying) return;
    const iv = setInterval(() => {
      if (Math.abs(progress - lastSavedProgress.current) > 0.01) {
        saveProgress();
        lastSavedProgress.current = progress;
      }
    }, 30000);
    return () => clearInterval(iv);
  }, [isCurrentTrack, isPlaying, progress]);

  const loadAudio = async () => {
    try {
      const resp = await apiRequest(`/audios/${id}`, token);
      const data = await resp.json();
      setAudio(data);
    } catch (e) {
      console.error('Audio load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylist = async () => {
    try {
      const resp = await apiRequest(`/courses/${course_id}/playlist`, token);
      if (resp.ok) setPlaylist(await resp.json());
    } catch { }
  };

  const saveProgress = async () => {
    if (!token || !id || progress <= 0) return;
    try {
      await apiRequest('/user/progress', token, {
        method: 'POST',
        body: JSON.stringify({ content_id: id, content_type: 'audio', progress, position: displayPosition }),
      });
    } catch { }
  };

  const handlePlayPause = async () => {
    if (isCurrentTrack) await togglePlayPause();
    else if (audio) await play(audio);
  };

  const handleSeek = useCallback((p: number) => {
    if (!displayDuration) return;
    seekTo(p * displayDuration);
  }, [displayDuration, seekTo]);

  const handleSaveFavorite = async () => {
    if (!token) return;
    if (isFavorite) {
      await apiRequest(`/user/favorites/audio/${id}`, token, { method: 'DELETE' });
      setIsFavorite(false);
    } else {
      await apiRequest('/user/favorites', token, { method: 'POST', body: JSON.stringify({ content_id: id, content_type: 'audio' }) });
      setIsFavorite(true);
    }
  };

  const navigateToNext = () => {
    if (!nextItem) return;
    setShowNextOverlay(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    router.replace(`/audio/${nextItem.audio_id}?course_id=${course_id}&autoplay=1` as any);
  };

  const cancelNext = () => {
    setShowNextOverlay(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color="#04D182" />
      </View>
    );
  }
  if (!audio) return null;

  const totalEp = audio.total_episodes || (playlist.length > 0 ? playlist.length : 0);
  const epNum = audio.episode_number || (currentIndex >= 0 ? currentIndex + 1 : 1);
  const scholarInitials = (audio.scholar_name || 'P').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={s.root}>
      {/* Transcript Reading Mode - Full screen overlay */}
      {showTranscript ? (
        <TranscriptReader
          audioId={id!}
          cursusColor={cursusColor}
          onClose={() => setShowTranscript(false)}
          isPlaying={isCurrentTrack && isPlaying}
          onTogglePlay={handlePlayPause}
          currentPosition={displayPosition}
          duration={displayDuration}
        />
      ) : (
      <>
      {/* Auto-next overlay */}
      {showNextOverlay && nextItem && (
        <View style={s.nextOverlay}>
          <View style={[s.nextCard, { borderColor: `${cursusColor}44` }]}>
            <Text style={[s.nextLabel, { color: cursusColor }]}>Épisode suivant dans {countdown}s</Text>
            <Text style={s.nextTitle} numberOfLines={2}>{nextItem.module_name}</Text>
            <View style={s.nextBtns}>
              <TouchableOpacity style={s.nextBtnCancel} onPress={cancelNext}>
                <Text style={s.nextBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.nextBtnPlay, { backgroundColor: cursusColor }]} onPress={navigateToNext}>
                <Ionicons name="play" size={14} color="#0A0A0A" />
                <Text style={s.nextBtnPlayText}>Lancer maintenant</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Sticky top nav */}
      <SafeAreaView edges={['top']} style={s.navWrap}>
        <View style={s.nav}>
          <TouchableOpacity testID="audio-back-btn" style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color="#F5F0E8" />
            <Text style={s.backLabel}>Épisodes</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="audio-more-btn" style={s.moreBtn} onPress={() => {}}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#F5F0E8" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Cursus Badge */}
        <View style={s.cursusBadge}>
          <View style={[s.cursusDot, { backgroundColor: cursusColor,
            ...(Platform.OS === 'web' ? { boxShadow: `0 0 8px ${cursusColor}66` } as any : { shadowColor: cursusColor, shadowOpacity: 0.4, shadowRadius: 4 }),
          }]} />
          <Text style={[s.cursusLabel, { color: cursusColor }]}>
            Cursus {cursusLetter} · {audio.cursus_name || ''} · Épisode {epNum}
          </Text>
        </View>

        {/* Artwork */}
        <View style={s.artwork}>
          {/* Decorative circles */}
          <View style={[s.artCircleLg, { borderColor: `${cursusColor}0F` }]} />
          <View style={[s.artCircleSm, { borderColor: `${cursusColor}17` }]} />
          {/* Central content */}
          <View style={s.artCenter}>
            <Text style={[s.artLetter, { color: cursusColor + '26' }]}>{cursusLetter}</Text>
            <View style={[s.artLine, { background: undefined } as any,
              Platform.OS === 'web' ? { background: `linear-gradient(90deg, transparent, ${cursusColor}, transparent)` } as any : { backgroundColor: cursusColor }
            ]} />
          </View>
          {/* Episode number bottom-right */}
          <Text style={[s.artEpNum, { color: `${cursusColor}66` }]}>
            Ép. {String(epNum).padStart(2, '0')} · {fmtDur(audio.duration || displayDuration)}
          </Text>
        </View>

        {/* Episode header */}
        <View style={s.epHeader}>
          <Text style={s.epNumLabel}>
            {totalEp > 0 ? `Épisode ${epNum} sur ${totalEp}` : `Épisode ${epNum}`}
          </Text>
          <Text style={s.epTitle}>{audio.title}</Text>
          <View style={s.authorRow}>
            <View style={[s.authorAvatar, { backgroundColor: `${cursusColor}26` }]}>
              <Text style={[s.authorInitials, { color: cursusColor }]}>{scholarInitials}</Text>
            </View>
            <Text style={s.authorName}>{audio.scholar_name}</Text>
          </View>
        </View>

        {/* Player */}
        <View style={s.player}>
          {/* Waveform */}
          <Waveform progress={progress} color={cursusColor} onSeek={handleSeek} />

          {/* Scrubber */}
          <Scrubber
            progress={progress}
            duration={displayDuration}
            color={cursusColor}
            position={displayPosition}
            onSeek={handleSeek}
          />

          {/* Controls */}
          <View style={s.controls}>
            {/* Shuffle */}
            <TouchableOpacity testID="audio-shuffle" style={s.ctrlBtn} onPress={() => {}}>
              <Ionicons name="shuffle" size={20} color="#777777" />
            </TouchableOpacity>

            {/* Skip back 15s */}
            <TouchableOpacity testID="audio-skip-back" style={s.ctrlBtn} onPress={() => skipBackward(15)}>
              <View>
                <Ionicons name="refresh" size={22} color="#F5F0E8" style={{ transform: [{ scaleX: -1 }] }} />
                <Text style={s.skipNum}>15</Text>
              </View>
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
              testID="audio-play-pause"
              style={[s.playBtn, { backgroundColor: cursusColor,
                ...(Platform.OS === 'web' ? { boxShadow: `0 0 24px ${cursusColor}59` } as any : { shadowColor: cursusColor, shadowOpacity: 0.35, shadowRadius: 12 }),
              }]}
              onPress={handlePlayPause}
            >
              <Ionicons
                name={isCurrentTrack && isPlaying ? 'pause' : 'play'}
                size={22}
                color="#0A0A0A"
                style={!isPlaying ? { marginLeft: 2 } : {}}
              />
            </TouchableOpacity>

            {/* Skip forward 15s */}
            <TouchableOpacity testID="audio-skip-forward" style={s.ctrlBtn} onPress={() => skipForward(15)}>
              <View>
                <Ionicons name="refresh" size={22} color="#F5F0E8" />
                <Text style={s.skipNum}>15</Text>
              </View>
            </TouchableOpacity>

            {/* Playlist */}
            <TouchableOpacity testID="audio-playlist-btn" style={s.ctrlBtn} onPress={() => router.back()}>
              <Ionicons name="list" size={20} color="#777777" />
            </TouchableOpacity>
          </View>

          {/* Extras */}
          <View style={s.extras}>
            {/* Speed */}
            <TouchableOpacity
              testID="audio-speed-btn"
              style={s.speedBtn}
              onPress={() => setSpeed(nextSpeed)}
            >
              <Text style={s.speedText}>× {speed.toFixed(2).replace(/\.?0+$/, '')}</Text>
            </TouchableOpacity>

            {/* Actions */}
            <View style={s.actionsRow}>
              {audio.has_transcript && (
                <TouchableOpacity
                  testID="audio-read-btn"
                  style={[s.readBtn, { borderColor: cursusColor }]}
                  onPress={() => setShowTranscript(true)}
                >
                  <Ionicons name="book-outline" size={14} color={cursusColor} />
                  <Text style={[s.readBtnText, { color: cursusColor }]}>Lire</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity testID="audio-favorite-btn" onPress={handleSaveFavorite}>
                <Ionicons
                  name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={isFavorite ? '#C9A84C' : '#777777'}
                />
              </TouchableOpacity>
              <TouchableOpacity testID="audio-share-btn" onPress={() => {}}>
                <Ionicons name="share-social-outline" size={18} color="#777777" />
              </TouchableOpacity>
              <TouchableOpacity testID="audio-download-btn" onPress={() => {}}>
                <Ionicons name="download-outline" size={18} color="#777777" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Separator */}
        <View style={s.sep} />

        {/* Description */}
        {audio.description ? (
          <View style={s.descSection}>
            <Text style={[s.sectionLabel, { color: cursusColor }]}>À PROPOS DE CET ÉPISODE</Text>
            <Text
              style={s.descText}
              numberOfLines={descExpanded ? undefined : 4}
            >
              {audio.description}
            </Text>
            {!descExpanded && (
              <TouchableOpacity onPress={() => setDescExpanded(true)}>
                <Text style={s.readMore}>Lire plus →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Chapters — only if audio has chapters data */}
        {audio.chapters && audio.chapters.length > 0 && (
          <View style={s.chaptersSection}>
            <Text style={s.chapterSectionLabel}>CHAPITRES</Text>
            {audio.chapters.map((ch: any, i: number) => {
              const isPlayed = ch.position_seconds <= displayPosition;
              return (
                <TouchableOpacity
                  key={i}
                  style={s.chapterRow}
                  onPress={() => seekTo(ch.position_seconds)}
                >
                  <Text style={[s.chapterTs, { color: isPlayed ? cursusColor : '#444' }]}>
                    {formatTime(ch.position_seconds)}
                  </Text>
                  <Text style={[s.chapterTitle, { color: isPlayed ? '#F5F0E8' : 'rgba(245,240,232,0.45)' }]}>
                    {ch.title}
                  </Text>
                  <View style={[s.chapterDot, {
                    backgroundColor: isPlayed ? cursusColor : '#444',
                    ...(isPlayed && Platform.OS === 'web' ? { boxShadow: `0 0 6px ${cursusColor}66` } as any : {}),
                  }]} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Next Episode card */}
        {nextItem && (
          <View style={s.nextSection}>
            <Text style={s.sectionLabel}>ÉPISODE SUIVANT</Text>
            <TouchableOpacity
              style={s.nextEpCard}
              onPress={navigateToNext}
              activeOpacity={0.8}
            >
              {/* Vignette */}
              <View style={[s.nextEpThumb, { backgroundColor: `${cursusColor}1A` }]}>
                <Text style={[s.nextEpThumbLetter, { color: cursusColor }]}>{cursusLetter}</Text>
              </View>
              {/* Info */}
              <View style={s.nextEpInfo}>
                <Text style={[s.nextEpCursus, { color: cursusColor }]}>Cursus {cursusLetter}</Text>
                <Text style={s.nextEpTitle} numberOfLines={2}>{nextItem.module_name}</Text>
                <Text style={s.nextEpMeta}>
                  {nextItem.episode_number ? `Ép. ${nextItem.episode_number}` : `Ép. ${currentIndex + 2}`}
                </Text>
              </View>
              {/* Arrow */}
              <Ionicons name="chevron-forward" size={16} color="#777777" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  loadingWrap: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },

  // Top nav
  navWrap: { backgroundColor: 'rgba(10,10,10,0.92)' },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#222222',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backLabel: { fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 3, color: '#777777', textTransform: 'uppercase' },
  moreBtn: { padding: 4 },

  // Cursus badge
  cursusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginLeft: 20 },
  cursusDot: { width: 6, height: 6, borderRadius: 3 },
  cursusLabel: { fontFamily: 'Cinzel', fontSize: 7, letterSpacing: 3, textTransform: 'uppercase' },

  // Artwork
  artwork: {
    marginTop: 18, marginHorizontal: 20, height: 200,
    backgroundColor: '#080D0B', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  artCircleLg: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    borderWidth: 1, top: '50%', left: '50%',
    marginTop: -160, marginLeft: -160,
  },
  artCircleSm: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    borderWidth: 1, top: '50%', left: '50%',
    marginTop: -110, marginLeft: -110,
  },
  artCenter: { alignItems: 'center', gap: 10, zIndex: 2 },
  artLetter: { fontFamily: 'Cinzel', fontSize: 52, fontWeight: '600', lineHeight: 56 },
  artLine: { width: 40, height: 1 },
  artEpNum: {
    position: 'absolute', bottom: 14, right: 16, zIndex: 3,
    fontFamily: 'Cinzel', fontSize: 7, letterSpacing: 3, textTransform: 'uppercase',
  },

  // Episode header
  epHeader: { paddingTop: 20, paddingHorizontal: 20 },
  epNumLabel: { fontFamily: 'Cinzel', fontSize: 7, letterSpacing: 4, color: '#777777', textTransform: 'uppercase', marginBottom: 8 },
  epTitle: { fontFamily: 'Cinzel', fontSize: 17, fontWeight: '400', color: '#F5F0E8', letterSpacing: 0.5, lineHeight: 24, marginBottom: 8 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorAvatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  authorInitials: { fontFamily: 'Cinzel', fontSize: 8, fontWeight: '600' },
  authorName: { fontFamily: 'EBGaramond', fontSize: 13, fontStyle: 'italic', color: '#C9A84C' },

  // Player
  player: { paddingTop: 24, paddingHorizontal: 20 },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 32, marginBottom: 8 },

  // Scrubber
  scrubberWrap: { paddingVertical: 8 },
  scrubberTrack: { height: 3, backgroundColor: '#222222', borderRadius: 2, overflow: 'visible' },
  scrubberFill: { height: 3, position: 'absolute', borderRadius: 2 },
  scrubberThumb: {
    width: 10, height: 10, borderRadius: 5,
    position: 'absolute', top: -3.5, marginLeft: -5,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeElapsed: { fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 1, color: '#F5F0E8' },
  timeDuration: { fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 1, color: '#777777' },

  // Controls
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16 },
  ctrlBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  skipNum: { fontFamily: 'Cinzel', fontSize: 6, fontWeight: '600', color: '#F5F0E8', position: 'absolute', textAlign: 'center', alignSelf: 'center' },
  playBtn: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },

  // Extras
  extras: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18 },
  speedBtn: { borderWidth: 1, borderColor: '#222222', paddingHorizontal: 10, paddingVertical: 5 },
  speedText: { fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 2, color: '#777777' },
  actionsRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  readBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6,
  },
  readBtnText: { fontFamily: 'Cinzel', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' },

  // Separator
  sep: { height: 1, backgroundColor: '#222222', marginHorizontal: 20, marginTop: 22 },

  // Description
  descSection: { paddingTop: 18, paddingHorizontal: 20 },
  sectionLabel: { fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 },
  descText: { fontFamily: 'EBGaramond', fontSize: 14, color: 'rgba(245,240,232,0.60)', lineHeight: 24 },
  readMore: { fontFamily: 'EBGaramond', fontSize: 13, fontStyle: 'italic', color: '#C9A84C', marginTop: 8 },

  // Chapters
  chaptersSection: { paddingTop: 22, paddingHorizontal: 20 },
  chapterSectionLabel: { fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 4, color: '#777777', textTransform: 'uppercase', marginBottom: 12 },
  chapterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#222222',
  },
  chapterTs: { fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 1, width: 36, flexShrink: 0 },
  chapterTitle: { fontFamily: 'EBGaramond', fontSize: 13, flex: 1 },
  chapterDot: { width: 5, height: 5, borderRadius: 2.5, flexShrink: 0 },

  // Next episode
  nextSection: { marginTop: 22, marginHorizontal: 20, marginBottom: 24 },
  nextEpCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1A1A1A', padding: 14,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  nextEpThumb: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  nextEpThumbLetter: { fontFamily: 'Cinzel', fontSize: 14, fontWeight: '600' },
  nextEpInfo: { flex: 1, minWidth: 0 },
  nextEpCursus: { fontFamily: 'Cinzel', fontSize: 7, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  nextEpTitle: { fontFamily: 'EBGaramond', fontSize: 13, color: '#F5F0E8', marginBottom: 4 },
  nextEpMeta: { fontFamily: 'Cinzel', fontSize: 7, letterSpacing: 1, color: '#777777', textTransform: 'uppercase' },

  // Auto-next overlay
  nextOverlay: { position: 'absolute', bottom: 120, left: 20, right: 20, zIndex: 100 },
  nextCard: {
    backgroundColor: 'rgba(20,20,20,0.97)', padding: 20,
    borderWidth: 1,
  },
  nextLabel: { fontFamily: 'Cinzel', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  nextTitle: { fontFamily: 'Cinzel', fontSize: 14, color: '#F5F0E8', lineHeight: 22, marginBottom: 16 },
  nextBtns: { flexDirection: 'row', gap: 10 },
  nextBtnCancel: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#333333',
  },
  nextBtnCancelText: { fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 2, color: '#777777' },
  nextBtnPlay: {
    flex: 2, paddingVertical: 10, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  nextBtnPlayText: { fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 2, color: '#0A0A0A' },
});
