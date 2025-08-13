import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from 'expo-file-system';
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { auth, db } from "../firebase";

import { doc, getDoc } from "firebase/firestore";

type DocumentResult = {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
};

export default function StudyPlanGeneratorScreen() {
  const navigation = useNavigation();
  const route = useRoute(); 
  const { height, width } = Dimensions.get('window');
  const API_BASE_URL = "http://172.16.45.79:5000/api";

  const [examDate, setExamDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [syllabus, setSyllabus] = useState<DocumentResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [userLevel, setUserLevel] = useState<string>("Basic"); // Default level
  const [loadingUserData, setLoadingUserData] = useState<boolean>(true);
  
  const formHeight = useRef(new Animated.Value(height * 0.7)).current;

  // Fetch user level from Firebase when component mounts
  useEffect(() => {
    fetchUserLevel();
  }, []);

  const fetchUserLevel = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const level = userData.initialLevel || "Basic";
          setUserLevel(level);
          addLog(`User level retrieved: ${level}`);
        } else {
          addLog("No user data found, using default level: Basic");
          setUserLevel("Basic");
        }
      }
    } catch (error) {
      console.error("Error fetching user level:", error);
      addLog(`Error fetching user level: ${error.message}`);
      setUserLevel("Basic"); // Fallback to Basic level
    } finally {
      setLoadingUserData(false);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage].slice(-50));
    console.log(logMessage);
  };
  
  const pickDocument = async (): Promise<void> => {
    try {
      addLog('Starting document picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        addLog('Document picking canceled by user');
        return;
      }

      const file = result.assets[0];
      addLog(`Selected file: ${file.name} (${file.size} bytes)`);
      
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      if (!fileInfo.exists) {
        throw new Error('Selected file does not exist');
      }

      setSyllabus({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
      });
      setError(null);
    } catch (err: any) {
      const errorMsg = `Document picker failed: ${err.message}`;
      addLog(errorMsg);
      setError("Failed to select PDF file");
      Alert.alert("Error", "Failed to select PDF file");
    }
  };

  const processSyllabus = async (): Promise<void> => {
    if (!syllabus) {
      const errorMsg = 'No syllabus PDF selected';
      addLog(errorMsg);
      setError(errorMsg);
      Alert.alert("Error", errorMsg);
      return;
    }

    setLoading(true);
    setError(null);
    addLog(`Starting PDF processing with user level: ${userLevel}...`);

    try {
      const fileInfo = await FileSystem.getInfoAsync(syllabus.uri);
      if (!fileInfo.exists) throw new Error('File no longer exists');

      const formData = new FormData();
      formData.append('pdf', {
        uri: syllabus.uri,
        type: syllabus.mimeType || 'application/pdf',
        name: syllabus.name,
      } as any);
      
      // Add user level to the request
      formData.append('userLevel', userLevel);
      formData.append('examDate', examDate.toISOString());
      
      addLog(`Sending request with level: ${userLevel}`);
      
      const response = await axios.post(`${API_BASE_URL}/process`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
        timeout: 60000,
      });

      addLog(`Response received: ${JSON.stringify(response.data)}`);
      
      if (!response.data?.schedule) {
        throw new Error("Invalid response format");
      }

      const transformedPlan = response.data.schedule
        .filter((item: any) => item.topic && item.summary)
        .map((item: any, index: number) => ({
          topic_id: index + 1,
          topic: item.topic.replace(/\*\*/g, ''),
          start_time: item.start_time,
          end_time: item.end_time,
          allocated_time: item.allocated_time,
          completed: false,
          summary: item.summary,
          qna: item.qna || [],
          suggested_time: item.allocated_time - (item.qna ? 10 : 0),
          sessions: item.sessions,
          userLevel: userLevel // Pass level to study plan screen
        }));

      console.log('Processed study plan:', transformedPlan);
      addLog(`Study plan generated with ${transformedPlan.length} topics for ${userLevel} level`);
      
      navigation.navigate('StudyPlanScreen', { 
        studyPlan: transformedPlan,
        userLevel: userLevel 
      });
    } catch (error: any) {
      let errorMessage = "Failed to process syllabus";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || error.message;
        addLog(`Axios error: ${errorMessage} (Status: ${error.response?.status})`);
      } else {
        errorMessage = error.message || "Unknown error";
        addLog(`Processing error: ${errorMessage}`);
      }
      setError(errorMessage);
      Alert.alert("Processing Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'basic':
        return '#10B981'; // Green
      case 'intermediate':
        return '#F59E0B'; // Orange
      case 'advanced':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const getLevelDescription = (level: string) => {
    switch (level.toLowerCase()) {
      case 'basic':
        return 'Fundamental concepts with detailed explanations';
      case 'intermediate':
        return 'Balanced approach with moderate complexity';
      case 'advanced':
        return 'In-depth analysis with complex concepts';
      default:
        return 'Personalized learning approach';
    }
  };

  if (loadingUserData) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient 
      colors={['#f7f9fc', '#eef2f5']} 
      style={styles.container}
    >
      <StatusBar style="dark" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Updated level display */}
        <View style={styles.levelDisplayContainer}>
          <Text style={styles.levelDisplayText}>
            I will generate based on your
          </Text>
          <View style={[styles.levelBadge, { backgroundColor: getLevelColor(userLevel) }]}>
            <MaterialIcons 
              name={userLevel.toLowerCase() === 'basic' ? 'school' : 
                    userLevel.toLowerCase() === 'intermediate' ? 'psychology' : 'rocket-launch'} 
              size={20} 
              color="white" 
            />
            <Text style={styles.levelBadgeText}>{userLevel} Level</Text>
          </View>
          <Text style={styles.levelDescription}>
            {getLevelDescription(userLevel)}
          </Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Study Plan Generator</Text>
          <Text style={styles.headerSubtitle}>Create your personalized study schedule</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="upload-file" size={24} color="#4F46E5" />
              <Text style={styles.sectionTitle}>Upload Syllabus</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Select your syllabus PDF to generate a personalized study plan
            </Text>
            
            <TouchableOpacity 
              style={styles.uploadButton} 
              onPress={pickDocument}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons name="upload-file" size={24} color="white" />
                <Text style={styles.buttonText}>
                  {syllabus ? 'Change PDF' : 'Select PDF'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            {syllabus && (
              <View style={styles.fileInfoContainer}>
                <MaterialIcons name="description" size={20} color="#4F46E5" />
                <Text style={styles.fileName} numberOfLines={1}>
                  {syllabus.name}
                </Text>
                <Text style={styles.fileSize}>
                  {(syllabus.size! / (1024 * 1024)).toFixed(2)} MB
                </Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="event" size={24} color="#4F46E5" />
              <Text style={styles.sectionTitle}>Exam Date</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Select your exam date to optimize the study schedule
            </Text>
            
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons name="event" size={24} color="white" />
                <Text style={styles.buttonText}>
                  {examDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={examDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) setExamDate(date);
                  setShowDatePicker(false);
                }}
              />
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.generateButton, (loading || !syllabus) && styles.disabledButton]}
            onPress={processSyllabus}
            disabled={loading || !syllabus}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.generateButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <MaterialIcons name="auto-awesome" size={24} color="white" />
                  <Text style={styles.generateButtonText}>
                    Generate {userLevel} Study Plan
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  safeArea: {
    flex: 1,
  },
  levelDisplayContainer: {
    alignItems: 'center',
    marginBottom: 0,
    paddingTop: 30,
    paddingHorizontal: 24,
  },
  levelDisplayText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#555',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Inter-Medium',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  levelBadgeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
    fontFamily: 'Inter-Bold',
  },
  levelDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  header: {
    padding: 1,
    paddingBottom: 25,
  },
  headerTitle: {
    fontSize: 35,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
    fontFamily: 'Inter-Bold',
    paddingTop: 80,
    paddingLeft: 25,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    fontFamily: 'Inter-Regular',
    paddingLeft: 35,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
    fontFamily: 'Inter-SemiBold',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  uploadButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  dateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    fontFamily: 'Inter-SemiBold',
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  fileName: {
    color: '#4F46E5',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    fontFamily: 'Inter-Medium',
  },
  fileSize: {
    color: '#6B7280',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    backgroundColor: 'transparent',
  },
  generateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    fontFamily: 'Inter-SemiBold',
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#DC2626',
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});