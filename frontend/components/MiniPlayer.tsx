import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayer } from '../context/PlayerContext';
import { Ionicons } from '@expo/vector-icons';

const CURSUS_COLORS: Record<string, string> = {
  A: '#04D182', B: '#8B5CF6', C: '#F59E0B', D: '#EC4899', E: '#06B6D4',
};

// Mini waveform bar heights (12 bars for compact display)
const MINI_WF_HEIGHTS = [40, 70, 50, 85, 60, 95, 55, 75, 45, 80, 60, 70];

function formatTime(s: number) {
  if (!s || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── Mini Waveform Component ──────────────────────────────────────────────────
function MiniWaveform({ progress, color }: { progress: number; color: string }) {
  const playedCount = Math.floor(progress * MINI_WF_HEIGHTS.length);
  
  return (
    <View style={styles.waveformContainer}>
      {MINI_WF_HEIGHTS.map((h, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: Math.max(3, Math.round(h / 100 * 16)),
            backgroundColor: i < playedCount ? color : '#333333',
            marginHorizontal: 1,
          }}
        />
      ))}
    </View>
  );
}

export default function MiniPlayer() {
  const { currentTrack, isPlaying, position, duration, togglePlayPause, stopTrack } = usePlayer();
  const router = useRouter();

  if (!currentTrack) return null;

  const progress = duration > 0 ? position / duration : 0;
  const cursusLetter: string = (currentTrack as any).cursus_letter || 'A';
  const cursusColor: string = (currentTrack as any).cursus_color || CURSUS_COLORS[cursusLetter] || '#04D182';
  const scholarName: string = (currentTrack as any).scholar_name || '';

  const handlePress = () => {
    router.push(`/audio/${currentTrack.id}` as any);
  };

  return (
    <TouchableOpacity
      testID="mini-player"
      style={[
        styles.container,
        Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } as any : {},
      ]}
      onPress={handlePress}
      activeOpacity={0.95}
    >
      {/* Top progress bar — cursus color */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: cursusColor }]} />
      </View>

      <View style={styles.content}>
        {/* Left: Cursus letter badge */}
        <View style={[styles.badge, { backgroundColor: `${cursusColor}1A` }]}>
          <Text style={[styles.badgeLetter, { color: cursusColor }]}>{cursusLetter}</Text>
        </View>

        {/* Middle: Info + Timer */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
          <View style={styles.metaRow}>
            {scholarName ? (
              <Text style={styles.scholar} numberOfLines={1}>{scholarName}</Text>
            ) : null}
            {scholarName ? <View style={styles.metaDot} /> : null}
            <Text style={[styles.timer, { color: cursusColor }]}>
              {formatTime(position)} / {formatTime(duration)}
            </Text>
          </View>
        </View>

        {/* Right: Mini Waveform + Controls */}
        <View style={styles.rightSection}>
          {/* Mini Waveform */}
          <MiniWaveform progress={progress} color={cursusColor} />

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              testID="mini-player-play-pause"
              style={[styles.playBtn, { backgroundColor: cursusColor }]}
              onPress={togglePlayPause}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={15}
                color="#0A0A0A"
                style={!isPlaying ? { marginLeft: 1 } : {}}
              />
            </TouchableOpacity>
            <TouchableOpacity
              testID="mini-player-close"
              style={styles.closeBtn}
              onPress={stopTrack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color="#777777" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 68,
    backgroundColor: 'rgba(17,17,17,0.97)',
    borderTopWidth: 1,
    borderTopColor: '#222222',
    overflow: 'hidden',
  },
  progressTrack: {
    height: 2,
    backgroundColor: '#1E1E1E',
    width: '100%',
  },
  progressFill: {
    height: 2,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },

  // Cursus letter badge
  badge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeLetter: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    fontWeight: '600',
  },

  // Info
  info: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    letterSpacing: 0.5,
    color: '#F5F0E8',
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  scholar: {
    fontFamily: 'EBGaramond',
    fontSize: 11,
    fontStyle: 'italic',
    color: '#C9A84C',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#444444',
    marginHorizontal: 6,
  },
  timer: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 1,
  },

  // Right section (waveform + controls)
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },

  // Mini Waveform
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
