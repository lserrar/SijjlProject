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

// Mini waveform - 15 barres rectangulaires
const MINI_WF_HEIGHTS = [35, 55, 40, 70, 50, 85, 60, 95, 55, 75, 45, 80, 60, 50, 40];

function formatTime(s: number) {
  if (!s || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function MiniPlayer() {
  const { currentTrack, isPlaying, position, duration, togglePlayPause, stopTrack } = usePlayer();
  const router = useRouter();

  if (!currentTrack) return null;

  const progress = duration > 0 ? position / duration : 0;
  const cursusLetter: string = (currentTrack as any).cursus_letter || 'A';
  const cursusColor: string = (currentTrack as any).cursus_color || CURSUS_COLORS[cursusLetter] || '#04D182';
  const scholarName: string = (currentTrack as any).scholar_name || '';
  
  // Nombre de barres allumées selon la progression
  const playedBars = Math.floor(progress * MINI_WF_HEIGHTS.length);

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
      <View style={styles.content}>
        {/* Gauche: Badge cursus */}
        <View style={[styles.badge, { backgroundColor: `${cursusColor}1A` }]}>
          <Text style={[styles.badgeLetter, { color: cursusColor }]}>{cursusLetter}</Text>
        </View>

        {/* Centre: Titre + Professeur */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
          {scholarName ? (
            <Text style={styles.scholar} numberOfLines={1}>{scholarName}</Text>
          ) : null}
        </View>

        {/* Droite: Waveform rectangles + Timer + Contrôles */}
        <View style={styles.rightSection}>
          {/* Mini Waveform - barres rectangulaires */}
          <View style={styles.waveformContainer}>
            {MINI_WF_HEIGHTS.map((h, i) => (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    height: Math.max(4, Math.round(h / 100 * 20)),
                    backgroundColor: i < playedBars ? cursusColor : '#333333',
                  },
                ]}
              />
            ))}
          </View>

          {/* Timer en chiffres */}
          <View style={styles.timerContainer}>
            <Text style={[styles.timerCurrent, { color: cursusColor }]}>
              {formatTime(position)}
            </Text>
            <Text style={styles.timerSeparator}>/</Text>
            <Text style={styles.timerTotal}>
              {formatTime(duration)}
            </Text>
          </View>

          {/* Bouton Play/Pause */}
          <TouchableOpacity
            testID="mini-player-play-pause"
            style={[styles.playBtn, { backgroundColor: cursusColor }]}
            onPress={(e) => { e.stopPropagation(); togglePlayPause(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={14}
              color="#0A0A0A"
              style={!isPlaying ? { marginLeft: 1 } : {}}
            />
          </TouchableOpacity>

          {/* Bouton Fermer */}
          <TouchableOpacity
            testID="mini-player-close"
            style={styles.closeBtn}
            onPress={(e) => { e.stopPropagation(); stopTrack(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color="#555555" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barre de progression fine en bas */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: cursusColor }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    backgroundColor: 'rgba(17,17,17,0.98)',
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },

  // Badge cursus
  badge: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeLetter: {
    fontFamily: 'Cinzel',
    fontSize: 13,
    fontWeight: '600',
  },

  // Info (titre + prof)
  info: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    letterSpacing: 0.3,
    color: '#F5F0E8',
    marginBottom: 2,
  },
  scholar: {
    fontFamily: 'EBGaramond',
    fontSize: 11,
    fontStyle: 'italic',
    color: '#C9A84C',
  },

  // Section droite
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },

  // Waveform rectangles
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
  },
  waveformBar: {
    width: 3,
    // height défini dynamiquement
    // backgroundColor défini dynamiquement
  },

  // Timer
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 65,
  },
  timerCurrent: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  timerSeparator: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    color: '#555555',
    marginHorizontal: 2,
  },
  timerTotal: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    color: '#666666',
    letterSpacing: 0.5,
  },

  // Bouton Play
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bouton Fermer
  closeBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Barre de progression en bas
  progressTrack: {
    height: 2,
    backgroundColor: '#1A1A1A',
    width: '100%',
  },
  progressFill: {
    height: 2,
  },
});
