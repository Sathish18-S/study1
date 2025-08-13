import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/firebase';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function HistoryScreen() {
  const router = useRouter();
  const auth = getAuth();
  const [studyPlans, setStudyPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudyPlans = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          Alert.alert('Error', 'User not authenticated');
          return;
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const q = query(
          collection(db, 'studyPlans'),
          where('userEmail', '==', user.email),
          where('createdAt', '>=', thirtyDaysAgo)
        );

        const querySnapshot = await getDocs(q);
        const plans = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate()
        }));

        setStudyPlans(plans);
      } catch (error) {
        Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudyPlans();
  }, []);

  const deletePlan = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'studyPlans', id));
      setStudyPlans(prev => prev.filter(plan => plan.id !== id));
    } catch (error) {
      Alert.alert('Error', 'Failed to delete study plan');
    }
  };

  const renderPlanItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.planCard}
      onPress={() => router.push({
        pathname: '/StudyPlanScreen',
        params: { studyPlan: JSON.stringify(item.topics) }
      })}
    >
      <View style={styles.planInfo}>
        <Text style={styles.planTitle}>{item.examSubject || 'Study Plan'}</Text>
        <Text style={styles.planDate}>
          Created: {item.createdAt.toLocaleDateString()}
        </Text>
        <Text style={styles.planStats}>
          {item.topics.length} topics | {item.totalDuration} minutes
        </Text>
      </View>
      <TouchableOpacity 
        onPress={() => deletePlan(item.id)}
        style={styles.deleteButton}
      >
        <MaterialIcons name="delete" size={24} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f8fafc', '#e2e8f0']}
        style={styles.background}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading your study plans...</Text>
        </View>
      ) : studyPlans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="history" size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>No study plans found</Text>
          <Text style={styles.emptySubtext}>Generated plans will appear here for 30 days</Text>
          
          <TouchableOpacity
            style={styles.generateButton}
            onPress={() => router.push('/StudyPlanGeneratorScreen')}
          >
            <LinearGradient
              colors={['#4f46e5', '#6366f1']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.generateButtonText}>Generate New Plan</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={studyPlans}
          renderItem={renderPlanItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  planDate: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  planStats: {
    fontSize: 12,
    color: '#4f46e5',
  },
  deleteButton: {
    padding: 8,
  },
  generateButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  buttonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  generateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});