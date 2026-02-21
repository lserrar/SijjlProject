import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getAccessDeniedMessage } from '../hooks/useAccessCheck';

interface PaywallOverlayProps {
  reason: string;
  onSubscribe?: () => void;
}

export function PaywallOverlay({ reason, onSubscribe }: PaywallOverlayProps) {
  const router = useRouter();
  const message = getAccessDeniedMessage(reason);

  const handleSubscribe = () => {
    if (onSubscribe) {
      onSubscribe();
    } else {
      router.push('/subscription-choice' as any);
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={48} color={colors.brand.primary} />
        </View>
        
        <Text style={styles.title}>Contenu Premium</Text>
        <Text style={styles.message}>{message}</Text>
        
        <TouchableOpacity
          style={styles.subscribeBtn}
          onPress={handleSubscribe}
          testID="paywall-subscribe-btn"
        >
          <Ionicons name="star" size={18} color="#000" />
          <Text style={styles.subscribeBtnText}>S'abonner</Text>
        </TouchableOpacity>
        
        <Text style={styles.trialText}>
          Essayez gratuitement pendant 3 jours
        </Text>
      </View>
    </View>
  );
}

interface ContentPreviewProps {
  children: React.ReactNode;
  hasAccess: boolean;
  reason: string;
  previewContent?: React.ReactNode;
}

export function ContentPreview({ children, hasAccess, reason, previewContent }: ContentPreviewProps) {
  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <View style={styles.previewWrapper}>
      {previewContent || (
        <View style={styles.blurredContent}>
          <Text style={styles.previewText}>Aperçu du contenu...</Text>
        </View>
      )}
      <PaywallOverlay reason={reason} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    backgroundColor: colors.background.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(217, 255, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  message: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  subscribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  subscribeBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#000',
  },
  trialText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: spacing.md,
  },
  previewWrapper: {
    flex: 1,
    position: 'relative',
  },
  blurredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.3,
  },
  previewText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: colors.text.tertiary,
  },
});
