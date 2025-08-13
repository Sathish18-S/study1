import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Animated,
  Alert
} from 'react-native';
import { 
  Ionicons, 
  MaterialIcons, 
  FontAwesome5, 
  Entypo, 
  Feather, 
  MaterialCommunityIcons 
} from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [profileVisible, setProfileVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [userCount, setUserCount] = useState(0);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser) {
      setEmail(currentUser.email || '');
    }

    // Real-time user count listener
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      setUserCount(snapshot.size);
    });

    // Animation on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true
      })
    ]).start();

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      router.replace('/auth/LoginScreen');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const features = [
    {
      title: "AI Study Assistant",
      description: "Get personalized study plans and recommendations",
      icon: <FontAwesome5 name="robot" size={24} color="#6366f1" />,
      color: "#6366f1"
    },
    {
      title: "Smart Summaries",
      description: "Generate concise summaries from your notes",
      icon: <MaterialIcons name="summarize" size={24} color="#10b981" />,
      color: "#10b981"
    },
    {
      title: "Task Manager",
      description: "Organize your study tasks and deadlines",
      icon: <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={24} color="#f59e0b" />,
      color: "#f59e0b"
    },
    {
      title: "Quiz Generator",
      description: "Create practice quizzes to test your knowledge",
      icon: <Ionicons name="help-circle-outline" size={24} color="#ef4444" />,
      color: "#ef4444"
    }
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={styles.background}
      />

      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Image
          source={require('../../assets/images/ai-brain.png')}
          style={styles.headerImage}
        />
        <Text style={styles.headerTitle}>CleverCortex</Text>
        <Text style={styles.headerSubtitle}>Your AI-Powered Study Companion</Text>
      </Animated.View>

      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }]}]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.featureCard, { borderLeftColor: feature.color }]}
                onPress={() => router.push(
                  index === 0 ? '/ChatbotScreen' :
                  index === 1 ? '/SummarizeGeneratorScreen' :
                  index === 2 ? '/TodoScreen' : '/QuizGeneratorScreen'
                )}
              >
                <View style={styles.featureIconContainer}>{feature.icon}</View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.mainButton}
            onPress={() => router.push('/StudyPlanGeneratorScreen')}
          >
            <LinearGradient
              colors={['#4f46e5', '#6366f1']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="book-open" size={24} color="white" />
              <Text style={styles.mainButtonText}>Generate Study Plan</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userCount}</Text>
              <Text style={styles.statLabel}>Active Students</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>95%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>24/7</Text>
              <Text style={styles.statLabel}>AI Support</Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => setProfileVisible(true)}
      >
        <LinearGradient
          colors={['#6366f1', '#4f46e5']}
          style={styles.profileGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Entypo name="user" size={20} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent
        visible={profileVisible}
        onRequestClose={() => setProfileVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => setProfileVisible(false)}
          >
            <View style={styles.modalContent}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?img=12' }}
                style={styles.profileImage}
              />
              <Text style={styles.profileName}>Student Profile</Text>
              <Text style={styles.emailText}>{email}</Text>

              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatNumber}>12</Text>
                  <Text style={styles.modalStatLabel}>Plans</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatNumber}>24</Text>
                  <Text style={styles.modalStatLabel}>Tasks</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatNumber}>8</Text>
                  <Text style={styles.modalStatLabel}>Quizzes</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => router.push('/DeleteAccountScreen')}
              >
                <Text style={styles.secondaryButtonText}>Delete Account</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 10,
  },
  headerImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  featureIconContainer: {
    backgroundColor: '#0f172a',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  mainButton: {
    marginVertical: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  profileButton: {
    position: 'absolute',
    right: 24,
    bottom: 25,
    borderRadius: 30,
    overflow: 'hidden',
  },
  profileGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    width: '80%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  modalStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  modalStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
  },
});