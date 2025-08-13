import { Stack } from 'expo-router';

export default function ScreensLayout() {
  return (
    <Stack>
      <Stack.Screen name="welcome" options={{ title: '' }} />
      <Stack.Screen name="WelcomeScreen" options={{ title: '' }} />
      {/* Add other screens here */}
    </Stack>
  );
}