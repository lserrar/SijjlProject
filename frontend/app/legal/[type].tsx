import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiRequest } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_CONTENT: Record<string, { title: string; content: string }> = {
  privacy: {
    title: 'Politique de confidentialité',
    content: `**Dernière mise à jour : Février 2025**

## 1. Introduction

Sijill ("nous", "notre", "nos") s'engage à protéger la confidentialité de vos données personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos informations.

## 2. Données collectées

Nous collectons les données suivantes :
- **Données d'identification** : nom, prénom, adresse email
- **Données d'utilisation** : historique d'écoute, progression dans les cours, favoris
- **Données techniques** : type d'appareil, système d'exploitation, adresse IP

## 3. Utilisation des données

Vos données sont utilisées pour :
- Personnaliser votre expérience d'apprentissage
- Sauvegarder votre progression
- Vous envoyer des notifications pertinentes
- Améliorer nos services

## 4. Partage des données

Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos données avec :
- Nos prestataires de services (hébergement, paiement)
- Les autorités si requis par la loi

## 5. Sécurité

Nous utilisons des mesures de sécurité techniques et organisationnelles pour protéger vos données :
- Chiffrement SSL/TLS
- Accès restreint aux données
- Surveillance continue

## 6. Vos droits

Conformément au RGPD, vous avez le droit de :
- Accéder à vos données
- Rectifier vos données
- Supprimer vos données
- Exporter vos données

## 7. Contact

Pour toute question concernant vos données personnelles :
**Email** : privacy@sijill.com`,
  },
  terms: {
    title: "Conditions d'utilisation",
    content: `**Dernière mise à jour : Février 2025**

## 1. Acceptation des conditions

En utilisant l'application Sijill, vous acceptez les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.

## 2. Description du service

Sijill est une plateforme d'apprentissage dédiée aux études islamiques, proposant :
- Des cours audio sur la philosophie islamique, la théologie, les sciences et les arts
- Un suivi de progression personnalisé
- Des contenus produits par des universitaires reconnus

## 3. Compte utilisateur

- Vous devez créer un compte pour accéder aux contenus
- Vous êtes responsable de la confidentialité de vos identifiants
- Vous devez avoir au moins 16 ans pour utiliser le service

## 4. Abonnement

- Certains contenus nécessitent un abonnement actif
- Les abonnements sont gérés exclusivement via notre site web sijillproject.com
- L'application permet d'accéder aux contenus avec un abonnement valide

## 5. Propriété intellectuelle

- Tous les contenus (audio, textes, images) sont protégés par le droit d'auteur
- Vous n'êtes pas autorisé à copier, modifier ou redistribuer les contenus
- L'accès est strictement personnel et non transférable

## 6. Comportement de l'utilisateur

Vous vous engagez à :
- Utiliser le service de manière légale
- Ne pas tenter de contourner les mesures de sécurité
- Respecter les autres utilisateurs

## 7. Limitation de responsabilité

- Le service est fourni "tel quel"
- Nous ne garantissons pas une disponibilité continue
- Notre responsabilité est limitée au montant de votre abonnement

## 8. Modification des conditions

Nous pouvons modifier ces conditions à tout moment. Les modifications seront notifiées par email.

## 9. Droit applicable

Ces conditions sont régies par le droit français. Tout litige sera soumis aux tribunaux compétents de Paris.

## 10. Contact

Pour toute question :
**Email** : support@sijill.com`,
  },
};

export default function LegalScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<{ title: string; content: string } | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const res = await apiRequest(`/legal/${type}`);
        if (res.ok) {
          const data = await res.json();
          setContent({ title: data.title, content: data.content });
        } else {
          // Use default content
          setContent(DEFAULT_CONTENT[type as string] || DEFAULT_CONTENT.privacy);
        }
      } catch (e) {
        setContent(DEFAULT_CONTENT[type as string] || DEFAULT_CONTENT.privacy);
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, [type]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#04D182" />
      </View>
    );
  }

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('## ')) {
        return <Text key={idx} style={styles.heading2}>{line.replace('## ', '')}</Text>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <Text key={idx} style={styles.bold}>{line.replace(/\*\*/g, '')}</Text>;
      }
      if (line.startsWith('- ')) {
        return (
          <View key={idx} style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bodyText}>{line.replace('- ', '')}</Text>
          </View>
        );
      }
      if (line.trim() === '') {
        return <View key={idx} style={{ height: 12 }} />;
      }
      return <Text key={idx} style={styles.bodyText}>{line}</Text>;
    });
  };

  return (
    <View style={styles.root}>
      {/* Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity
          testID="legal-back-btn"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="rgba(245,240,232,0.6)" />
          <Text style={styles.backLabel}>Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{content?.title}</Text>
        <View style={styles.contentWrap}>
          {content && renderContent(content.content)}
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  loadingWrap: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backLabel: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(245,240,232,0.6)',
    textTransform: 'uppercase',
  },
  
  scroll: { flex: 1 },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 20,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  contentWrap: {
    paddingHorizontal: 20,
  },
  heading2: {
    fontFamily: 'Cinzel',
    fontSize: 13,
    fontWeight: '600',
    color: '#04D182',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
  },
  bold: {
    fontFamily: 'EBGaramond',
    fontSize: 12,
    fontStyle: 'italic',
    color: '#777777',
    marginBottom: 8,
  },
  bodyText: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    color: 'rgba(245,240,232,0.75)',
    lineHeight: 22,
  },
  listItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  bullet: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    color: '#04D182',
  },
});
