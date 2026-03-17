import { Redirect } from 'expo-router';

// Payment verification removed - Reader App model
export default function SubscriptionSuccess() {
  return <Redirect href="/(tabs)" />;
}
