import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

export interface AudioTrack {
  id: string;
  title: string;
  scholar_name: string;
  thumbnail: string;
  audio_url: string;
  type: string;
  duration?: number;
}

interface PlayerContextType {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  position: number; // seconds
  duration: number; // seconds
  playTrack: (track: AudioTrack) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (positionSeconds: number) => Promise<void>;
  skipForward: (seconds?: number) => Promise<void>;
  skipBackward: (seconds?: number) => Promise<void>;
  stopTrack: () => Promise<void>;
  setSpeed: (speed: number) => Promise<void>;
  speed: number;
}

const PlayerContext = createContext<PlayerContextType>(null!);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeedState] = useState(1.0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: true,
    });
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      soundRef.current?.unloadAsync();
    };
  }, []);

  const startPositionTracking = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          setPosition(status.positionMillis / 1000);
          setDuration((status.durationMillis || 0) / 1000);
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }
      }
    }, 500);
  };

  const playTrack = async (track: AudioTrack) => {
    try {
      // Unload previous sound
      if (soundRef.current) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      setCurrentTrack(track);
      setPosition(0);
      setIsPlaying(false);

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audio_url },
        { shouldPlay: true, rate: speed, volume: 1.0 }
      );

      soundRef.current = sound;
      setIsPlaying(true);
      startPositionTracking();
    } catch (e) {
      console.error('Player error:', e);
    }
  };

  const togglePlayPause = async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (status.isLoaded) {
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    }
  };

  const seekTo = async (positionSeconds: number) => {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(positionSeconds * 1000);
    setPosition(positionSeconds);
  };

  const skipForward = async (seconds = 15) => {
    await seekTo(Math.min(position + seconds, duration));
  };

  const skipBackward = async (seconds = 15) => {
    await seekTo(Math.max(position - seconds, 0));
  };

  const stopTrack = async () => {
    if (soundRef.current) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  };

  const setSpeed = async (newSpeed: number) => {
    setSpeedState(newSpeed);
    if (soundRef.current) {
      await soundRef.current.setRateAsync(newSpeed, true);
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        position,
        duration,
        speed,
        playTrack,
        togglePlayPause,
        seekTo,
        skipForward,
        skipBackward,
        stopTrack,
        setSpeed,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
