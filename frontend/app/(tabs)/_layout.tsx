import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MiniPlayer from '../../components/MiniPlayer';
import { usePlayer } from '../../context/PlayerContext';
import { colors, TAB_BAR_HEIGHT, MINI_PLAYER_HEIGHT } from '../../constants/theme';

function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <Ionicons
      name={name as any}
      size={24}
      color={focused ? colors.text.primary : colors.text.secondary}
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
            backgroundColor: 'rgba(18, 18, 18, 0.97)',
            borderTopColor: colors.border.subtle,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.text.primary,
          tabBarInactiveTintColor: colors.text.secondary,
          tabBarLabelStyle: {
            fontFamily: 'Inter-Medium',
            fontSize: 10,
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
          name="explorer"
          options={{
            title: 'Explorer',
            tabBarIcon: ({ focused }) => (
              <TabBarIcon name={focused ? 'search' : 'search-outline'} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="bibliotheque"
          options={{
            title: 'Bibliothèque',
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
              <TabBarIcon name={focused ? 'radio' : 'radio-outline'} focused={focused} />
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
