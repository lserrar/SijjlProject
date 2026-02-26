import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';
import { API_URL } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';

const { width: SW } = Dimensions.get('window');

// Waveform bar heights
const WF_HEIGHTS = [40, 60, 45, 80, 55, 90, 70, 50, 65, 85, 40, 55, 75, 60, 95, 50, 70, 40, 60, 45, 80, 55, 90, 50, 30, 70, 85, 60, 45, 55];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Cursus color mapping
const CURSUS_COLORS: Record<string, string> = {
  'cursus-falsafa': '#04D182',
  'cursus-theologie': '#C9A84C',
  'cursus-sciences-islamiques': '#3B82F6',
  'cursus-arts': '#8B5CF6',
  'cursus-spiritualites': '#EC4899',
};

interface AudioConference {
  id: string;
  filename: string;
  subject: string;
  speaker: string;
  module_number: number;
  title: string;
  description?: string;
  credits?: string;
  size_mb: number;
  format: string;
  stream_url: string;
}

export default function ConferenceScreen() {
  const { id, cursusId } = useLocalSearchParams<{ id: string; cursusId?: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [conference, setConference] = useState<AudioConference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1.0);

  const accentColor = CURSUS_COLORS[cursusId || ''] || '#04D182';
  const SPEEDS = [1.0, 1.25, 1.5, 2.0, 0.75];

  useEffect(() => {
    const fetchConference = async () => {
      try {
        const response = await fetch(`${API_URL}/api/resources/audio`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        
        if (!response.ok) throw new Error('Erreur de chargement');
        
        const data = await response.json();
        const conf = data.resources?.find((r: AudioConference) => r.id === id);
        
        if (!conf) throw new Error('Conférence non trouvée');
        
        setConference(conf);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConference();
  }, [id, token]);

  // Web audio handling
  useEffect(() => {
    if (Platform.OS === 'web' && conference) {
      const audio = new Audio(`${API_URL}${conference.stream_url}`);
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        setPosition(audio.currentTime);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setPosition(0);
      });

      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, [conference]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = (p: number) => {
    if (!audioRef.current || !duration) return;
    const newPos = p * duration;
    audioRef.current.currentTime = newPos;
    setPosition(newPos);
  };

  const skipForward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 30);
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15);
  };

  const cycleSpeed = () => {
    const currentIdx = SPEEDS.indexOf(speed);
    const nextIdx = (currentIdx + 1) % SPEEDS.length;
    const newSpeed = SPEEDS[nextIdx];
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const progress = duration > 0 ? position / duration : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !conference) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF4444" />
          <Text style={styles.errorText}>{error || 'Conférence non trouvée'}</Text>
          <TouchableOpacity onPress={handleBack} style={styles.backLink}>
            <Text style={[styles.backLinkText, { color: accentColor }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#F5F0E8" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <View style={[styles.typeBadge, { backgroundColor: `${accentColor}20` }]}>
              <Ionicons name="mic" size={12} color={accentColor} />
              <Text style={[styles.typeBadgeText, { color: accentColor }]}>CONFÉRENCE</Text>
            </View>
          </View>
        </View>

        {/* Conference Info */}
        <View style={styles.infoSection}>
          {/* Module badge */}
          {conference.module_number > 0 && (
            <Text style={styles.moduleBadge}>Module {conference.module_number}</Text>
          )}

          {/* Title */}
          <Text style={styles.title}>{conference.title}</Text>

          {/* Speaker */}
          {conference.speaker && (
            <View style={styles.speakerRow}>
              <View style={[styles.speakerAvatar, { backgroundColor: `${accentColor}20` }]}>
                <Ionicons name="person" size={16} color={accentColor} />
              </View>
              <Text style={styles.speakerName}>{conference.speaker}</Text>
            </View>
          )}

          {/* Description */}
          {conference.description && (
            <Text style={styles.description}>{conference.description}</Text>
          )}

          {/* Meta info */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.metaText}>{conference.size_mb} Mo</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="musical-note-outline" size={14} color="#666" />
              <Text style={styles.metaText}>{conference.format.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Player Section */}
        <View style={styles.playerSection}>
          {/* Waveform */}
          <TouchableOpacity
            style={styles.waveform}
            onPress={(evt: any) => {
              const x = evt.nativeEvent?.locationX ?? evt.nativeEvent?.offsetX ?? 0;
              const w = SW - 48;
              seekTo(Math.max(0, Math.min(1, x / w)));
            }}
            activeOpacity={1}
          >
            {WF_HEIGHTS.map((h, i) => {
              const playedCount = Math.floor(progress * WF_HEIGHTS.length);
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: Math.max(4, Math.round(h / 100 * 40)),
                    backgroundColor: i < playedCount ? accentColor : '#222222',
                    borderRadius: 1,
                  }}
                />
              );
            })}
          </TouchableOpacity>

          {/* Time display */}
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {/* Speed */}
            <TouchableOpacity style={styles.speedBtn} onPress={cycleSpeed}>
              <Text style={styles.speedText}>{speed}x</Text>
            </TouchableOpacity>

            {/* Skip back */}
            <TouchableOpacity style={styles.skipBtn} onPress={skipBackward}>
              <Ionicons name="play-back" size={28} color="#F5F0E8" />
              <Text style={styles.skipLabel}>15</Text>
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
              style={[styles.playBtn, { backgroundColor: accentColor }]}
              onPress={togglePlayPause}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color="#0A0A0A"
                style={!isPlaying ? { marginLeft: 3 } : {}}
              />
            </TouchableOpacity>

            {/* Skip forward */}
            <TouchableOpacity style={styles.skipBtn} onPress={skipForward}>
              <Ionicons name="play-forward" size={28} color="#F5F0E8" />
              <Text style={styles.skipLabel}>30</Text>
            </TouchableOpacity>

            {/* Placeholder for symmetry */}
            <View style={styles.speedBtn} />
          </View>
        </View>

        {/* Credits */}
        {conference.credits && (
          <View style={styles.creditsSection}>
            <Text style={styles.creditsTitle}>Crédits</Text>
            <Text style={styles.creditsText}>{conference.credits}</Text>
          </View>
        )}

        {/* Footer brand */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Sijill Project — Sciences Islamiques</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'EB Garamond',
    fontSize: 14,
    color: '#888',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  errorText: {
    fontFamily: 'EB Garamond',
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  backLink: {
    marginTop: 16,
  },
  backLinkText: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    letterSpacing: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  typeBadgeText: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    letterSpacing: 1,
  },

  // Info Section
  infoSection: {
    marginTop: 8,
    marginBottom: 32,
  },
  moduleBadge: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    letterSpacing: 2,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 24,
    color: '#F5F0E8',
    marginBottom: 16,
    lineHeight: 32,
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  speakerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakerName: {
    fontFamily: 'EB Garamond',
    fontSize: 16,
    color: '#C9A84C',
    fontStyle: 'italic',
  },
  description: {
    fontFamily: 'EB Garamond',
    fontSize: 15,
    color: '#AAA',
    lineHeight: 24,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 24,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: 'EB Garamond',
    fontSize: 13,
    color: '#666',
  },

  // Player Section
  playerSection: {
    backgroundColor: '#111',
    padding: 20,
    marginBottom: 24,
  },
  waveform: {
    flexDirection: 'row',
    height: 40,
    alignItems: 'flex-end',
    gap: 2,
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  speedBtn: {
    width: 48,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#888',
  },
  skipBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  skipLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    color: '#666',
    position: 'absolute',
    bottom: 4,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Credits
  creditsSection: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  creditsTitle: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    letterSpacing: 2,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  creditsText: {
    fontFamily: 'EB Garamond',
    fontSize: 14,
    color: '#888',
    lineHeight: 22,
  },

  // Footer
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'EB Garamond',
    fontSize: 12,
    color: '#444',
    fontStyle: 'italic',
  },
});
