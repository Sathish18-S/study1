import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="LoginScreen" options={{ headerShown: false }} />
      <Stack.Screen name="RegisterScreen" options={{ headerShown: false }} />
      <Stack.Screen name="ForgotPasswordScreen" options={{ headerShown: false }} />
      <Stack.Screen name="OTPScreen" options={{ headerShown: false }} />
      <Stack.Screen 
        name="OnboardingTest" 
        options={{ 
          headerShown: false,
          gestureEnabled: false // Prevent swiping back
        }} 
      />
      <Stack.Screen 
        name="OnboardingQuizScreen" 
        options={{ 
          headerShown: false,
          gestureEnabled: false // Prevent swiping back
        }} 
      />
    </Stack>
  );
}