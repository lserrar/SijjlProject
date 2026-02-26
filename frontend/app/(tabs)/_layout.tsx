import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MiniPlayer from '../../components/MiniPlayer';
import GlobalHeader from '../../components/GlobalHeader';
import { usePlayer } from '../../context/PlayerContext';

const ACTIVE = '#04D182';
const INACTIVE = '#777777';
const BG = 'rgba(17,17,17,0.97)';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return <Ionicons name={name as any} size={22} color={focused ? ACTIVE : INACTIVE} />;
}

export default function TabLayout() {
  const { currentTrack } = usePlayer();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;
  const headerHeight = (isDesktop ? 56 : 52) + insets.top;
  const tabBarHeight = 72 + insets.bottom;

  return (
    <View style={styles.wrapper}>
      {/* Global Header */}
      <GlobalHeader />

      {/* Main Content with padding for header */}
      <View style={[styles.content, { paddingTop: headerHeight }]}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: BG,
              borderTopColor: '#222222',
              borderTopWidth: 1,
              height: tabBarHeight,
              paddingBottom: insets.bottom,
              paddingTop: 10,
            },
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
