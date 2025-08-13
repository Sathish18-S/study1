import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert('Login Success', 'Welcome back!');
      router.replace('/(tabs)/HomeScreen');
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome back! Glad to see you, Again!</Text>

      <TextInput
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#999"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          style={styles.passwordInput}
          secureTextEntry={!showPassword}
          placeholderTextColor="#999"
        />
        <Pressable onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#555" />
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/auth/ForgotPasswordScreen')}>
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </Pressable>

      <Text style={styles.orText}>Or Login with</Text>

      <View style={styles.socialContainer}>
        <Pressable style={styles.socialBtn}>
          <Image source={{ uri: 'https://img.icons8.com/ios-filled/50/facebook.png' }} style={styles.icon} />
        </Pressable>
        <Pressable style={styles.socialBtn}>
          <Image source={{ uri: 'https://img.icons8.com/color/48/google-logo.png' }} style={styles.icon} />
        </Pressable>
        <Pressable style={styles.socialBtn}>
          <Image source={{ uri: 'https://img.icons8.com/ios-filled/50/mac-os.png' }} style={styles.icon} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    color: '#2C1E1E',
  },
  input: {
    backgroundColor: 'rgba(239, 235, 235, 0.8)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 235, 235, 0.8)',
    borderRadius: 12,
    padding: 15,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  passwordInput: {
    flex: 1,
  },
  forgotText: {
    alignSelf: 'flex-end',
    marginBottom: 25,
    color: '#555',
  },
  button: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  orText: {
    textAlign: 'center',
    marginBottom: 15,
    color: '#444',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  socialBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    elevation: 3,
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});