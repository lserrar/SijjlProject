import { Redirect } from 'expo-router';

// Reader App: registration is only available on sijillproject.com
export default function Register() {
  return <Redirect href="/(auth)/login" />;
}
