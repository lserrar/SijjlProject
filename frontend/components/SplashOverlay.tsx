import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const SPLASH_DURATION = 5000; // 5 seconds

interface SplashOverlayProps {
  onComplete: () => void;
}

export default function SplashOverlay({ onComplete }: SplashOverlayProps) {
  const [visible, setVisible] = useState(true);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const fadeOutAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 4500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    // Fade out and hide after duration
    const timer = setTimeout(() => {
      Animated.timing(fadeOutAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start(() => {
        setVisible(false);
        onComplete();
      });
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeOutAnim }]}>
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        <Text style={styles.logoSijill}>SIJILL</Text>
        <View style={styles.projectRow}>
          <Text style={styles.logoProject}>PROJECT</Text>
          <View style={styles.greenDot} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoSijill: {
    fontFamily: 'Cinzel',
    fontSize: 44,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 12,
    marginBottom: 4,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoProject: {
    fontFamily: 'Cinzel',
    fontSize: 44,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 4,
  },
  greenDot: {
    width: 12,
    height: 12,
    backgroundColor: '#04D182',
    borderRadius: 6,
    marginLeft: 6,
    shadowColor: '#04D182',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
});
