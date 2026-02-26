import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

// Navigation items
const NAV_ITEMS = [
  { label: 'Accueil', path: '/(tabs)' },
  { label: 'Cursus', path: '/(tabs)/cursus' },
  { label: 'Professeurs', path: '/(tabs)/live' },
  { label: 'Bibliothèque', path: '/(tabs)/bibliotheque' },
  { label: 'Profil', path: '/(tabs)/profil' },
];

interface GlobalHeaderProps {
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export default function GlobalHeader({ showBackButton, onBackPress }: GlobalHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  
  // Use hook to get dynamic window dimensions
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const isActive = (path: string) => {
    if (path === '/(tabs)') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    }
    return pathname.includes(path.replace('/(tabs)', ''));
  };

  const handleNavPress = (path: string) => {
    setMenuOpen(false);
    router.push(path as any);
  };

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleSearch = () => {
    router.push('/search' as any);
  };

  const handleProfile = () => {
    router.push('/(tabs)/profil' as any);
  };

  // Desktop Header
  if (IS_DESKTOP) {
    return (
      <View style={[styles.header, styles.headerDesktop, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          {/* LEFT: Logo */}
          <TouchableOpacity 
            style={styles.logoContainer} 
            onPress={() => router.push('/(tabs)' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.wordmarkRow}>
              <Text style={styles.logoSijill}>SIJILL</Text>
              <Text style={styles.logoProject}>PROJECT</Text>
              <View style={styles.logoDot} />
            </View>
            <Text style={styles.tagline}>Études islamiques · Plateforme académique</Text>
          </TouchableOpacity>

          {/* CENTER: Navigation */}
          <View style={styles.navContainer}>
            {NAV_ITEMS.map((item, index) => (
              <React.Fragment key={item.path}>
                <TouchableOpacity
                  style={styles.navItem}
                  onPress={() => handleNavPress(item.path)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.navText,
                    isActive(item.path) && styles.navTextActive
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
                {index < NAV_ITEMS.length - 1 && (
                  <Text style={styles.navSeparator}>·</Text>
                )}
              </React.Fragment>
            ))}
          </View>

          {/* RIGHT: Search + Avatar */}
          <View style={styles.rightContainer}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleSearch}>
              <Ionicons name="search" size={20} color="#888888" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarBtn} onPress={handleProfile}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Mobile Header
  return (
    <>
      <View style={[styles.header, styles.headerMobile, { paddingTop: insets.top }]}>
        <View style={styles.headerInnerMobile}>
          {/* LEFT: Back Arrow */}
          <View style={styles.mobileLeft}>
            {showBackButton ? (
              <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
                <Ionicons name="arrow-back" size={22} color="#F5F0E8" />
              </TouchableOpacity>
            ) : (
              <View style={styles.iconPlaceholder} />
            )}
          </View>

          {/* CENTER: Logo (wordmark only) */}
          <TouchableOpacity 
            style={styles.logoContainerMobile} 
            onPress={() => router.push('/(tabs)' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.wordmarkRow}>
              <Text style={[styles.logoSijill, styles.logoSijillMobile]}>SIJILL</Text>
              <Text style={[styles.logoProject, styles.logoProjectMobile]}>PROJECT</Text>
              <View style={[styles.logoDot, styles.logoDotMobile]} />
            </View>
          </TouchableOpacity>

          {/* RIGHT: Hamburger Menu */}
          <View style={styles.mobileRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setMenuOpen(!menuOpen)}>
              <View style={styles.hamburger}>
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <View style={[styles.mobileMenu, { top: 52 + insets.top }]}>
          {NAV_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.path}
              style={styles.mobileMenuItem}
              onPress={() => handleNavPress(item.path)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.mobileMenuText,
                isActive(item.path) && styles.mobileMenuTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.mobileMenuDivider} />
          <TouchableOpacity
            style={styles.mobileMenuItem}
            onPress={() => { setMenuOpen(false); handleSearch(); }}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={18} color="#888888" style={{ marginRight: 12 }} />
            <Text style={styles.mobileMenuText}>Rechercher</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // ─── HEADER BASE ─────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerDesktop: {
    height: 56,
  },
  headerMobile: {
    height: 52,
  },
  headerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    height: 56,
  },
  headerInnerMobile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
  },

  // ─── LOGO ────────────────────────────────────────────────────────────────────
  logoContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  logoContainerMobile: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoSijill: {
    fontFamily: 'Cinzel',
    fontWeight: '400',
    fontSize: 18,
    letterSpacing: 18 * 0.16,
    color: '#F5F0E8',
  },
  logoSijillMobile: {
    fontSize: 15,
    letterSpacing: 15 * 0.16,
  },
  logoProject: {
    fontFamily: 'Cinzel',
    fontWeight: '400',
    fontSize: 18 * 0.62,
    letterSpacing: (18 * 0.62) * 0.22,
    color: '#888888',
    marginLeft: 4,
  },
  logoProjectMobile: {
    fontSize: 15 * 0.62,
    letterSpacing: (15 * 0.62) * 0.22,
    marginLeft: 3,
  },
  logoDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#04D182',
    marginLeft: 0,
    marginBottom: 2,
    ...Platform.select({
      web: {
        boxShadow: '0 0 12px rgba(4,209,130,0.55), 0 0 28px rgba(4,209,130,0.25)',
      },
      default: {
        shadowColor: '#04D182',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
      },
    }),
  },
  logoDotMobile: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tagline: {
    fontFamily: 'EB Garamond Italic',
    fontWeight: '400',
    fontSize: 11,
    letterSpacing: 11 * 0.08,
    color: '#888888',
    marginTop: 2,
  },

  // ─── NAVIGATION (DESKTOP) ────────────────────────────────────────────────────
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navText: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    letterSpacing: 9 * 0.2,
    textTransform: 'uppercase',
    color: '#888888',
  },
  navTextActive: {
    color: '#F5F0E8',
  },
  navSeparator: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    color: '#444444',
    marginHorizontal: 4,
  },

  // ─── RIGHT SECTION ───────────────────────────────────────────────────────────
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 8,
  },
  iconPlaceholder: {
    width: 38,
    height: 38,
  },
  avatarBtn: {
    padding: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#04D182',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    fontWeight: '600',
    color: '#0A0A0A',
  },

  // ─── MOBILE LAYOUT ───────────────────────────────────────────────────────────
  mobileLeft: {
    width: 50,
    alignItems: 'flex-start',
  },
  mobileRight: {
    width: 50,
    alignItems: 'flex-end',
  },
  hamburger: {
    width: 20,
    height: 14,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: '#F5F0E8',
  },

  // ─── MOBILE MENU ─────────────────────────────────────────────────────────────
  mobileMenu: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    zIndex: 999,
    paddingVertical: 8,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  mobileMenuText: {
    fontFamily: 'Cinzel',
    fontSize: 11,
    letterSpacing: 11 * 0.15,
    textTransform: 'uppercase',
    color: '#888888',
  },
  mobileMenuTextActive: {
    color: '#F5F0E8',
  },
  mobileMenuDivider: {
    height: 1,
    backgroundColor: '#222222',
    marginVertical: 8,
    marginHorizontal: 24,
  },
});
