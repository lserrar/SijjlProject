import { useState, useEffect, useCallback } from 'react';
import { useAuth, apiRequest } from '../context/AuthContext';

export interface AccessStatus {
  hasAccess: boolean;
  reason: string;
  expiresAt?: string;
  loading: boolean;
  error?: string;
}

export function useAccessCheck(contentType?: string, contentId?: string) {
  const { token, user } = useAuth();
  const [accessStatus, setAccessStatus] = useState<AccessStatus>({
    hasAccess: false,
    reason: 'checking',
    loading: true,
  });

  const checkAccess = useCallback(async () => {
    if (!token) {
      setAccessStatus({
        hasAccess: false,
        reason: 'not_authenticated',
        loading: false,
      });
      return;
    }

    try {
      let endpoint = '/user/access';
      if (contentType && contentId) {
        endpoint += `?content_type=${contentType}&content_id=${contentId}`;
      }
      
      const resp = await apiRequest(endpoint, token);
      const data = await resp.json();
      
      setAccessStatus({
        hasAccess: data.has_access,
        reason: data.reason,
        expiresAt: data.expires_at,
        loading: false,
      });
    } catch (e: any) {
      console.error('Access check error:', e);
      setAccessStatus({
        hasAccess: false,
        reason: 'error',
        error: e.message,
        loading: false,
      });
    }
  }, [token, contentType, contentId]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return { ...accessStatus, refresh: checkAccess };
}

// Helper function to get a user-friendly message for access denial
export function getAccessDeniedMessage(reason: string): string {
  switch (reason) {
    case 'not_authenticated':
      return 'Connectez-vous pour accéder à ce contenu';
    case 'no_access':
      return 'Abonnez-vous pour accéder à ce contenu premium';
    case 'expired':
      return 'Votre abonnement a expiré';
    case 'user_not_found':
      return 'Utilisateur non trouvé';
    default:
      return 'Accès non autorisé';
  }
}
