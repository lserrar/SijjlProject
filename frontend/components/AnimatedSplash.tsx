import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}

export default function AnimatedSplash({ onAnimationComplete }: AnimatedSplashProps) {
  // Animation values
  const sijillOpacity = useRef(new Animated.Value(0)).current;
  const projectOpacity = useRef(new Animated.Value(0)).current;
  const dotScale = useRef(new Animated.Value(0)).current;
  const dotGlow = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const overallOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // 1. Fade in "SIJILL"
      Animated.timing(sijillOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      
      // 2. Fade in "PROJECT" with dot
      Animated.parallel([
        Animated.timing(projectOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(dotScale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
      
      // 3. Dot glow pulse
      Animated.sequence([
        Animated.timing(dotGlow, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(dotGlow, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      
      // 4. Line expansion
      Animated.timing(lineWidth, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
      
      // 5. Tagline fade in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // 6. Hold for a moment
      Animated.delay(800),
      
      // 7. Fade out everything
      Animated.timing(overallOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onAnimationComplete();
    });
  }, []);

  const lineWidthInterpolate = lineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  return (
    <Animated.View style={[styles.container, { opacity: overallOpacity }]}>
      {/* Background gradient effect */}
      <View style={styles.backgroundGlow} />
      
      {/* Logo Container */}
      <View style={styles.logoContainer}>
        {/* SIJILL */}
        <Animated.Text style={[styles.sijillText, { opacity: sijillOpacity }]}>
          SIJILL
        </Animated.Text>
        
        {/* PROJECT with dot */}
        <View style={styles.projectRow}>
          <Animated.Text style={[styles.projectText, { opacity: projectOpacity }]}>
            PROJECT
          </Animated.Text>
          <Animated.View
            style={[
              styles.dot,
              {
                transform: [{ scale: dotScale }],
                opacity: dotGlow.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.8, 1, 1],
                }),
              },
            ]}
          />
          {/* Dot glow effect */}
          <Animated.View
            style={[
              styles.dotGlow,
              {
                transform: [{ scale: dotScale }],
                opacity: dotGlow.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.3, 0.6],
                }),
              },
            ]}
          />
        </View>
        
        {/* Animated line */}
        <View style={styles.lineContainer}>
          <Animated.View style={[styles.lineLeft, { width: lineWidthInterpolate }]} />
          <View style={styles.lineDiamond} />
          <Animated.View style={[styles.lineRight, { width: lineWidthInterpolate }]} />
        </View>
        
        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Sciences Islamiques
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  backgroundGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#04D182',
    opacity: 0.03,
  },
  logoContainer: {
    alignItems: 'center',
  },
  sijillText: {
    fontFamily: 'Cinzel',
    fontSize: 48,
    fontWeight: '400',
    color: '#04D182',
    letterSpacing: 16,
    marginBottom: 4,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectText: {
    fontFamily: 'Cinzel',
    fontSize: 48,
    fontWeight: '400',
    color: '#04D182',
    letterSpacing: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#04D182',
    marginLeft: -6,
    marginBottom: 8,
  },
  dotGlow: {
    position: 'absolute',
    right: -8,
    bottom: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#04D182',
  },
  lineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  lineLeft: {
    height: 1,
    backgroundColor: '#1A1A1A',
  },
  lineRight: {
    height: 1,
    backgroundColor: '#04D182',
  },
  lineDiamond: {
    width: 8,
    height: 8,
    backgroundColor: '#04D182',
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 12,
  },
  tagline: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 18,
    color: '#C9A84C',
    letterSpacing: 4,
  },
});
