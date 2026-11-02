import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="boasvindas" options={{ title: 'Boas-vindas' }} />
      <Stack.Screen name="funcao" options={{ title: 'Quem é você?' }} />
      <Stack.Screen name="embreve" options={{ title: 'Em breve' }} />
      <Stack.Screen name="login" options={{ title: 'Entrar' }} />
      <Stack.Screen name="register" options={{ title: 'Criar conta' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Recuperar acesso' }} />
    </Stack>
  );
}
