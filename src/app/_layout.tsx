import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerTintColor: '#2e7d32' }}>
        <Stack.Screen name="index" options={{ title: 'Opskrift' }} />
        <Stack.Screen name="ingredients" options={{ title: 'Ingredienser' }} />
        <Stack.Screen name="nutrients" options={{ title: 'Næringsstoffer' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
