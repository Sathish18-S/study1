import { StyleSheet, View, Image, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router'; // ✅ correct import for navigation

export default function WelcomeScreen() {
  const router = useRouter(); // ✅ useRouter for navigation

  return (
    <View style={styles.container}>
      <Text style={styles.header}>C L E V E R C O R T E X</Text>

      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.icon}
        resizeMode="contain"
      />

      <Text style={styles.description}>
        CleverCortex suggests a smart, capable, and efficient AI study companion that aids in learning and thinking processes, much like the cerebral cortex of the brain.
      </Text>

      <Pressable style={styles.button} onPress={() => router.push('./welcome')}>
        <Text style={styles.buttonText}>Get Started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#333',
    marginBottom: 30,
  },
  icon: {
    width: 200,
    height: 230,
    marginBottom: 10,
    marginTop: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
