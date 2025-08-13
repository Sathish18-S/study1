import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function QuizGeneratorScreen() {
  const router = useRouter();
  const [numQuestions, setNumQuestions] = useState("10");
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<any>(null);
  const [userLevel, setUserLevel] = useState<string>("Basic"); // New state for user level

  // Get user level when component mounts
  useEffect(() => {
    fetchUserLevel();
  }, []);

  const fetchUserLevel = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserLevel(userData.initialLevel || "Basic");
        }
      }
    } catch (error) {
      console.error("Error fetching user level:", error);
      // Default to Basic if error
      setUserLevel("Basic");
    }
  };

  const pickDocument = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({ 
        type: ["application/pdf", "text/plain"],
        copyToCacheDirectory: true
      });
      
      if (result.canceled) return;
      
      const selectedFile = result.assets[0];
      setFileName(selectedFile.name);
      setFile({
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/pdf'
      });
    } catch (err) {
      console.error("Document picker error:", err);
      Alert.alert("Error", "Failed to select document. Please try again.");
    }
  };

  const generateQuiz = async () => {
    if (!file) {
      Alert.alert("Error", "Please select a PDF or text file first");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      
      // Proper file append with correct field name
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.type
      } as any);
      
      // Validate number of questions
      const questionCount = Math.min(Math.max(parseInt(numQuestions) || 10, 20));
      formData.append("num_questions", questionCount.toString());
      
      // Add user level to the request
      formData.append("user_level", userLevel);

      const response = await fetch("http://172.16.45.79:8081/qui/pdf", {
        method: "POST",
        body: formData,
        // Let React Native set the Content-Type with boundary
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          errorData.error || 
          `Server responded with status ${response.status}`
        );
      }

      const data = await response.json();

      if (!data?.questions?.length) {
        throw new Error("The server didn't generate any questions");
      }

      router.push({
        pathname: "/QuizScreen",
        params: { 
          questions: JSON.stringify(data.questions),
          fileName: fileName,
          userLevel: userLevel // Pass user level to quiz screen
        }
      });

    } catch (error: any) {
      console.error("Quiz generation error:", error);
      Alert.alert(
        "Generation Failed", 
        error.message || "Failed to process your file. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch(level) {
      case "Advanced": return "#E53E3E";
      case "Intermediate": return "#FF8C00";
      case "Basic": return "#38A169";
      default: return "#38A169";
    }
  };

  const getDifficultyIcon = (level: string) => {
    switch(level) {
      case "Advanced": return "trending-up";
      case "Intermediate": return "remove";
      case "Basic": return "trending-down";
      default: return "trending-down";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quiz Generator</Text>
        <Text style={styles.headerSubtitle}>Upload a PDF or text file to create a quiz</Text>
        
        {/* User Level Display */}
        <View style={[styles.levelBadge, { backgroundColor: getDifficultyColor(userLevel) + '15' }]}>
          <Ionicons 
            name={getDifficultyIcon(userLevel)} 
            size={16} 
            color={getDifficultyColor(userLevel)} 
          />
          <Text style={[styles.levelText, { color: getDifficultyColor(userLevel) }]}>
            {userLevel} Level
          </Text>
        </View>
      </View>

      <View style={styles.inputSection}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Number of Questions (1-20)</Text>
          <TextInput
            style={styles.input}
            placeholder="10"
            keyboardType="numeric"
            value={numQuestions}
            onChangeText={(text) => setNumQuestions(text.replace(/[^0-9]/g, ''))}
            maxLength={2}
          />
        </View>
        
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickDocument}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Ionicons name="cloud-upload" size={20} color="#FFF" />
          <Text style={styles.uploadButtonText}>
            {fileName ? "Change File" : "Select File"}
          </Text>
        </TouchableOpacity>

        {fileName && (
          <View style={styles.fileInfo}>
            <Ionicons 
              name={fileName.endsWith('.pdf') ? "document" : "document-text"} 
              size={16} 
              color="#4E9F3D" 
            />
            <Text 
              style={styles.fileName} 
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {fileName}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.generateButton,
          (!file || isLoading) && styles.disabledButton
        ]}
        onPress={generateQuiz}
        disabled={!file || isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <Ionicons name="sparkles" size={20} color="#FFF" />
            <Text style={styles.generateButtonText}>
              {isLoading ? "Generating..." : `Generate ${userLevel} Quiz`}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    padding: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#7F8C8D",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  levelText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#495057",
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#FFF",
    color: "#212529",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4E9F3D",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: "#4E9F3D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#EDF7ED",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  fileName: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4E9F3D",
    flex: 1,
    fontWeight: "500",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 10,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: "#CED4DA",
    shadowColor: "#ADB5BD",
  },
  generateButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
});