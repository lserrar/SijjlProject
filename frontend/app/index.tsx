import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const SPLASH_DURATION = 5000; // 5 seconds

export default function SplashScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [canNavigate, setCanNavigate] = useState(false);
  const hasNavigated = useRef(false);
  const mountTime = useRef(Date.now());
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Start animations on mount
  useEffect(() => {
    mountTime.current = Date.now();
    
    // Fade in and scale up animation
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.15,
        duration: 4800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    // Allow navigation after splash duration
    const timer = setTimeout(() => {
      setCanNavigate(true);
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, []);

  // Navigate when both splash is complete AND auth is ready
  useEffect(() => {
    if (canNavigate && !isLoading && !hasNavigated.current) {
      hasNavigated.current = true;
      // Small delay for smooth transition
      setTimeout(() => {
        if (isAuthenticated) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      }, 100);
    }
  }, [canNavigate, isLoading, isAuthenticated]);

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoSijill: {
    fontFamily: 'Cinzel',
    fontSize: 42,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 42 * 0.18,
    marginBottom: 2,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoProject: {
    fontFamily: 'Cinzel',
    fontSize: 42,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 3,
  },
  greenDot: {
    width: 10,
    height: 10,
    backgroundColor: '#04D182',
    borderRadius: 5,
    marginLeft: 4,
    shadowColor: '#04D182',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
});
