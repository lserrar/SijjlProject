import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MiniPlayer from '../../components/MiniPlayer';
import GlobalHeader from '../../components/GlobalHeader';
import { usePlayer } from '../../context/PlayerContext';

const ACTIVE = '#04D182';
const INACTIVE = '#777777';
const BG = 'rgba(17,17,17,0.97)';

// Check if running on web
const isWeb = Platform.OS === 'web';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return <Ionicons name={name as any} size={22} color={focused ? ACTIVE : INACTIVE} />;
}

export default function TabLayout() {
  const { currentTrack } = usePlayer();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  
  // Desktop = screen width >= 768px
  const isDesktop = screenWidth >= 768;
  
  // On web desktop: hide bottom tab bar (use top menu)
  // On web mobile: show bottom tab bar (hide top menu)
  // On native app: always show bottom tab bar
  const showBottomTabBar = !isWeb || (isWeb && !isDesktop);
  const showTopHeader = !isWeb || (isWeb && isDesktop);
  
  const headerHeight = showTopHeader ? ((isDesktop ? 56 : 52) + insets.top) : 0;
  const tabBarHeight = showBottomTabBar ? (72 + insets.bottom) : 0;

  return (
    <View style={styles.wrapper}>
      {/* Global Header - only on desktop web or native app */}
      {showTopHeader && <GlobalHeader />}

      {/* Main Content with padding for header */}
      <View style={[styles.content, { paddingTop: headerHeight }]}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: showBottomTabBar ? {
              backgroundColor: BG,
              borderTopColor: '#222222',
              borderTopWidth: 1,
              height: tabBarHeight,
              paddingBottom: insets.bottom,
              paddingTop: 10,
              position: 'absolute' as const,
              bottom: 0,
              left: 0,
              right: 0,
            } : { display: 'none' },
            tabBarActiveTintColor: ACTIVE,
            tabBarInactiveTintColor: INACTIVE,
            tabBarLabelStyle: {
              fontFamily: 'Cinzel',
              fontSize: 7.5,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginTop: 2,
            },
          }}
        >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Accueil',
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="cursus"
          options={{
            title: 'Cursus',
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="bibliotheque"
          options={{
            title: 'Bibliothèque',
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'bookmark' : 'bookmark-outline'} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="live"
          options={{
            title: 'Professeurs',
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="about"
          options={{
            title: 'À propos',
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'information-circle' : 'information-circle-outline'} focused={focused} />,
          }}
        />
        {/* Hidden screens - profil accessible via avatar en haut */}
        <Tabs.Screen name="profil" options={{ href: null }} />
        {/* Hidden screens */}
        <Tabs.Screen name="explorer" options={{ href: null }} />
      </Tabs>
      </View>

      {currentTrack && (
        <View style={[styles.miniPlayerWrapper, { bottom: tabBarHeight }]}>
          <MiniPlayer />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { flex: 1 },
  miniPlayerWrapper: { position: 'absolute', left: 0, right: 0, zIndex: 100 },
});
