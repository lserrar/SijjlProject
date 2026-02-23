import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MiniPlayer from '../../components/MiniPlayer';
import { usePlayer } from '../../context/PlayerContext';
import { TAB_BAR_HEIGHT, MINI_PLAYER_HEIGHT } from '../../constants/theme';

const ACTIVE = '#04D182';
const INACTIVE = '#777777';
const BG = 'rgba(17,17,17,0.97)';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return <Ionicons name={name as any} size={22} color={focused ? ACTIVE : INACTIVE} />;
}

export default function TabLayout() {
  const { currentTrack } = usePlayer();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 72 + insets.bottom;

  return (
    <View style={styles.wrapper}>
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
            title: 'Épisodes',
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'play-circle' : 'play-circle-outline'} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="live"
          options={{
            title: 'Profs',
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="about"
          options={{
            title: 'Biblio',
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'bookmark' : 'bookmark-outline'} focused={focused} />,
          }}
        />
        {/* Hidden screens */}
        <Tabs.Screen name="profil" options={{ href: null }} />
        <Tabs.Screen name="explorer" options={{ href: null }} />
      </Tabs>

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
  miniPlayerWrapper: { position: 'absolute', left: 0, right: 0, zIndex: 100 },
});

function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <Ionicons
      name={name as any}
      size={22}
      color={focused ? colors.brand.primary : colors.text.secondary}
    />
  );
}

export default function TabLayout() {
  const { currentTrack } = usePlayer();
  const insets = useSafeAreaInsets();

  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View style={styles.wrapper}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0A0A0A',
            borderTopColor: '#222222',
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#F5F0E8',
          tabBarInactiveTintColor: '#888888',
          tabBarLabelStyle: {
            fontFamily: 'Cinzel',
            fontSize: 7,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Accueil',
            tabBarIcon: ({ focused }) => (
              <TabBarIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="cursus"
          options={{
            title: 'Cursus',
            tabBarIcon: ({ focused }) => (
              <TabBarIcon name={focused ? 'school' : 'school-outline'} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="bibliotheque"
          options={{
            title: 'Ressources',
            tabBarIcon: ({ focused }) => (
              <TabBarIcon name={focused ? 'library' : 'library-outline'} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="live"
          options={{
            title: 'Live',
            tabBarIcon: ({ focused }) => (
              <TabBarIcon name={focused ? 'videocam' : 'videocam-outline'} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            title: 'Profil',
            tabBarIcon: ({ focused }) => (
              <TabBarIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="about"
          options={{
            title: 'À propos',
            tabBarIcon: ({ focused }) => (
              <TabBarIcon name={focused ? 'information-circle' : 'information-circle-outline'} focused={focused} />
            ),
          }}
        />
        {/* Hidden screens */}
        <Tabs.Screen
          name="explorer"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>

      {/* Mini Player positioned above tab bar */}
      {currentTrack && (
        <View style={[styles.miniPlayerWrapper, { bottom: tabBarHeight }]}>
          <MiniPlayer />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  miniPlayerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
  },
});
