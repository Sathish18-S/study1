import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Code Sent', 'Check your inbox for password reset instructions.');
      router.replace('/auth/OTPScreen'); // Navigate to OTP screen instead
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password?</Text>
      <Text style={styles.subtitle}>
        Don’t worry! It occurs. Please enter the email address linked with your account.
      </Text>

      <TextInput
        placeholder="Enter your email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Pressable style={styles.button} onPress={handlePasswordReset}>
        <Text style={styles.buttonText}>Send Code</Text>
      </Pressable>

      <Text style={styles.footerText}>
        Remember Password?{' '}
        <Text style={styles.loginLink} onPress={() => router.replace('/auth/LoginScreen')}>
          Login
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Soft pink background
    padding: 30,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C1E1E',
    marginBottom: 10,
  },
  subtitle: {
    color: '#555',
    marginBottom: 30,
    fontSize: 14,
  },
  input: {
    backgroundColor: 'rgba(230, 230, 230, 0.5)', // Light pink background
    borderColor: '#000',
    borderWidth: 1,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 12,
    marginBottom: 30,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  footerText: {
    textAlign: 'center',
    color: '#444',
  },
  loginLink: {
    color: 'rgba(58, 58, 58, 0.5)',
    fontWeight: 'bold',
  },
});
