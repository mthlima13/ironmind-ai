import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ title: 'Entrar' }} />
      <Stack.Screen name="register" options={{ title: 'Criar conta' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Recuperar acesso' }} />
    </Stack>
  );
}
