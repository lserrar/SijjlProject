import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { apiRequest } from '../../context/AuthContext';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { colors, spacing, radius } from '../../constants/theme';
import { formatDuration, getTypeLabel } from '../../constants/mockData';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SPEEDS = [0.75, 1.0, 1.25, 1.5, 2.0];

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
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedProgress = useRef(0);

  const isCurrentTrack = currentTrack?.id === id;
  const displayPosition = isCurrentTrack ? position : 0;
  const displayDuration = isCurrentTrack ? duration : (audio?.duration || 0);
  const progress = displayDuration > 0 ? displayPosition / displayDuration : 0;

  const currentIndex = playlist.findIndex(p => p.audio_id === id);
  const nextItem = currentIndex >= 0 && currentIndex < playlist.length - 1 ? playlist[currentIndex + 1] : null;

  useEffect(() => {
    loadAudio();
    if (course_id) loadPlaylist();
  }, [id]);

  // Auto-play when arriving from "Commencer le cours"
  useEffect(() => {
    if (!loading && audio && autoplay === '1' && !isCurrentTrack) {
      play(audio);
    }
  }, [loading, audio]);

  // Register auto-next callback
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

  // Auto-save progress every 30s
  useEffect(() => {
    if (!isCurrentTrack || !isPlaying) return;
    const interval = setInterval(() => {
      if (Math.abs(progress - lastSavedProgress.current) > 0.01) {
        saveProgress();
        lastSavedProgress.current = progress;
      }
    }, 30000);
    return () => clearInterval(interval);
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
    if (isCurrentTrack) {
      await togglePlayPause();
    } else if (audio) {
      await play(audio);
    }
  };

  const handleSaveFavorite = async () => {
    if (!token) return;
    if (isFavorite) {
      await apiRequest(`/user/favorites/audio/${id}`, token, { method: 'DELETE' });
      setIsFavorite(false);
    } else {
      await apiRequest('/user/favorites', token, {
        method: 'POST',
        body: JSON.stringify({ content_id: id, content_type: 'audio' }),
      });
      setIsFavorite(true);
    }
  };

  const handleSeek = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    const seekProgress = Math.max(0, Math.min(1, x / (SCREEN_WIDTH - spacing.lg * 2)));
    seekTo(seekProgress * displayDuration);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const speedIndex = SPEEDS.indexOf(speed);
  const nextSpeed = SPEEDS[(speedIndex + 1) % SPEEDS.length];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  if (!audio) return null;

  return (
    <View style={styles.container}>
      {/* Background */}
      <Image source={{ uri: audio.thumbnail }} style={styles.bgImage} blurRadius={20} />
      <LinearGradient
        colors={['rgba(18,18,18,0.6)', 'rgba(18,18,18,0.95)', '#121212']}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity testID="audio-back-btn" style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-down" size={26} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>{getTypeLabel(audio.type).toUpperCase()}</Text>
          </View>
          <TouchableOpacity
            testID="audio-favorite-btn"
            style={styles.iconBtn}
            onPress={handleSaveFavorite}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? colors.brand.primary : colors.text.primary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Cover Art */}
          <View style={styles.coverContainer}>
            <Image source={{ uri: audio.thumbnail }} style={styles.coverArt} />
          </View>

          {/* Title & Scholar */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{audio.title}</Text>
            <TouchableOpacity
              testID="audio-scholar-link"
              onPress={() => router.push(`/scholar/${audio.scholar_id}` as any)}
            >
              <Text style={styles.scholar}>{audio.scholar_name}</Text>
            </TouchableOpacity>
            <View style={styles.topicChip}>
              <Text style={styles.topicText}>{audio.topic}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.playerSection}>
            <TouchableOpacity
              testID="audio-seek-bar"
              style={styles.seekBarContainer}
              onPress={handleSeek}
              activeOpacity={1}
            >
              <View style={styles.seekTrack}>
                <View style={[styles.seekFill, { width: `${progress * 100}%` }]} />
                <View style={[styles.seekThumb, { left: `${progress * 100}%` }]} />
              </View>
            </TouchableOpacity>

            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(displayPosition)}</Text>
              <Text style={styles.timeText}>{formatTime(displayDuration)}</Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                testID="audio-speed-btn"
                style={styles.speedBtn}
                onPress={() => setSpeed(nextSpeed)}
              >
                <Text style={styles.speedText}>{speed}×</Text>
              </TouchableOpacity>

              <TouchableOpacity testID="audio-skip-back" style={styles.skipBtn} onPress={() => skipBackward(15)}>
                <Ionicons name="play-back-outline" size={28} color={colors.text.primary} />
                <Text style={styles.skipLabel}>15</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="audio-play-pause"
                style={styles.playBtn}
                onPress={handlePlayPause}
              >
                <Ionicons
                  name={isCurrentTrack && isPlaying ? 'pause' : 'play'}
                  size={32}
                  color="#000"
                />
              </TouchableOpacity>

              <TouchableOpacity testID="audio-skip-forward" style={styles.skipBtn} onPress={() => skipForward(15)}>
                <Ionicons name="play-forward-outline" size={28} color={colors.text.primary} />
                <Text style={styles.skipLabel}>15</Text>
              </TouchableOpacity>

              <TouchableOpacity testID="audio-share-btn" style={styles.speedBtn} onPress={() => {}}>
                <Ionicons name="share-outline" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descSection}>
            <Text style={styles.descTitle}>À propos</Text>
            <Text style={styles.descText}>{audio.description}</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  bgImage: { position: 'absolute', width: '100%', height: 400, top: 0 },
  safe: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: colors.text.secondary, letterSpacing: 1 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: spacing.lg },
  coverContainer: { alignItems: 'center', marginVertical: spacing.xl },
  coverArt: { width: 220, height: 220, borderRadius: radius.xl, backgroundColor: colors.background.card },
  titleSection: { marginBottom: spacing.xl },
  title: { fontFamily: 'Inter-Bold', fontSize: 22, color: colors.text.primary, lineHeight: 30, marginBottom: spacing.sm },
  scholar: { fontFamily: 'DMSans-Regular', fontSize: 15, color: colors.brand.secondary, marginBottom: spacing.sm },
  topicChip: { alignSelf: 'flex-start', backgroundColor: 'rgba(4,209,130,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: colors.brand.primary },
  topicText: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.brand.primary },
  // Player
  playerSection: { marginBottom: spacing.xl },
  seekBarContainer: { paddingVertical: 12 },
  seekTrack: { height: 4, backgroundColor: colors.border.default, borderRadius: 2 },
  seekFill: { height: 4, backgroundColor: colors.brand.primary, borderRadius: 2, position: 'absolute' },
  seekThumb: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.text.primary, position: 'absolute', top: -5, marginLeft: -7 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: spacing.lg },
  timeText: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.text.secondary },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  speedBtn: { width: 52, height: 44, alignItems: 'center', justifyContent: 'center' },
  speedText: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.text.secondary },
  skipBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  skipLabel: { fontFamily: 'Inter-Bold', fontSize: 10, color: colors.text.secondary, position: 'absolute', bottom: 2 },
  playBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  // Description
  descSection: { backgroundColor: colors.background.card, borderRadius: radius.xl, padding: spacing.lg },
  descTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: colors.text.primary, marginBottom: spacing.sm },
  descText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.secondary, lineHeight: 22 },
});
