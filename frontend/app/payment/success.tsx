import { Redirect } from 'expo-router';

// Payment pages removed - Reader App model
// Subscriptions are managed via the website only
export default function PaymentSuccess() {
  return <Redirect href="/(tabs)" />;
}
