import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();
  

  return (
    <View style={styles.container}>
      <Text style={styles.header}>C L E V E R C O R T E X</Text>

      <Pressable style={styles.loginBtn} onPress={() => router.push('/auth/LoginScreen')}>
        <Text style={styles.loginText}>Login</Text>
      </Pressable>

      <Pressable style={styles.registerBtn} onPress={() => router.push('/auth/RegisterScreen')}>
        <Text style={styles.registerText}>Register</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loginBtn: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#333',
    marginBottom: 30,
    marginLeft: 80,
  },
  loginText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  registerBtn: {
    borderWidth: 1,
    borderColor: '#2C1E1E',
    padding: 15,
    borderRadius: 12,
  },
  registerText: {
    color: '#2C1E1E',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
