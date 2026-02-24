import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MiniPlayer from '../../components/MiniPlayer';
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
          name="live"
          options={{
            title: 'Professeurs',
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
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
          name="profil"
          options={{
            title: 'Profil',
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />,
          }}
        />
        {/* Hidden screens */}
        <Tabs.Screen name="about" options={{ href: null }} />
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
