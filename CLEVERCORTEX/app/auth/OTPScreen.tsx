import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';

export default function PasswordChangedScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Checkmark Image */}
      <View style={styles.iconContainer}>
        <Image
          source={require('../../assets/images/checkmark.png')} // Add checkmark image in assets folder
          style={styles.icon}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>Password Changed!</Text>
      <Text style={styles.subtitle}>Check your email to change password.</Text>

      <Pressable style={styles.button} onPress={() => router.replace('/auth/LoginScreen')}>
        <Text style={styles.buttonText}>Back to Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(252, 252, 252)', // Soft white background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  icon: {
    width: 300,
    height: 150,
    
  },
  
  
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
});
