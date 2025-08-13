import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { auth, db } from "../firebase"; // Adjust path as needed
import { doc, getDoc } from "firebase/firestore";

export default function SummarizeGeneratorScreen() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [userLevel, setUserLevel] = useState("Basic"); // Default to Basic
  const [loadingUserData, setLoadingUserData] = useState(true);

  // Fetch user level from Firebase on component mount
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
      console.error("Error fetching user data:", error);
      // Keep default "Basic" level if error occurs
    } finally {
      setLoadingUserData(false);
    }
  };

  const pickDocument = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
      if (result.canceled) return;
      setFileName(result.assets[0].name);
      setFile(result.assets[0]);
    } catch (err) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const generateSummary = async () => {
    if (!file) {
      Alert.alert("Error", "Please select a PDF file first");
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType
    });
    // Add user level to the request
    formData.append("user_level", userLevel);

    try {
      const response = await fetch("http://172.16.45.79:8000/upload/", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate summary");
      }

      if (data.summary) {
        router.push({
          pathname: "/SummarizeScreen",
          params: { 
            summary: data.summary,
            fileName: fileName,
            userLevel: userLevel // Pass level to display screen
          }
        });
      } else {
        Alert.alert("Error", "No summary was generated. Try a different PDF.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", error.message || "Failed to process PDF");
    } finally {
      setIsLoading(false);
    }
  };

  const getLevelDescription = () => {
    switch (userLevel) {
      case "Advanced":
        return "Detailed technical analysis with complex concepts";
      case "Intermediate":
        return "Balanced explanation with moderate detail";
      case "Basic":
        return "Simple, easy-to-understand summary";
      default:
        return "Personalized summary based on your level";
    }
  };

  const getLevelColor = () => {
    switch (userLevel) {
      case "Advanced": return "#E53E3E";
      case "Intermediate": return "#F6AD55";
      case "Basic": return "#48BB78";
      default: return "#4E9F3D";
    }
  };

  if (loadingUserData) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4E9F3D" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PDF Summarizer</Text>
        <Text style={styles.headerSubtitle}>Upload a PDF to generate personalized summary</Text>
        
        {/* User Level Display */}
        <View style={[styles.levelCard, { borderColor: getLevelColor() }]}>
          <View style={styles.levelHeader}>
            <Ionicons name="person" size={16} color={getLevelColor()} />
            <Text style={[styles.levelTitle, { color: getLevelColor() }]}>
              Your Level: {userLevel}
            </Text>
          </View>
          <Text style={styles.levelDescription}>{getLevelDescription()}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.uploadButton} 
        onPress={pickDocument}
        activeOpacity={0.8}
      >
        <Ionicons name="cloud-upload" size={20} color="#FFF" />
        <Text style={styles.uploadButtonText}>
          {fileName ? "Change PDF" : "Select PDF"}
        </Text>
      </TouchableOpacity>

      {fileName && (
        <View style={styles.fileInfo}>
          <Ionicons name="document-text" size={16} color="#4E9F3D" />
          <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.generateButton,
          (!file || isLoading) && styles.disabledButton
        ]}
        onPress={generateSummary}
        disabled={!file || isLoading}
      >
        {isLoading ? (
          <>
            <ActivityIndicator color="#FFF" />
            <Text style={styles.generateButtonText}>Generating {userLevel} Summary...</Text>
          </>
        ) : (
          <>
            <Ionicons name="sparkles" size={20} color="#FFF" />
            <Text style={styles.generateButtonText}>Generate {userLevel} Summary</Text>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6C757D",
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6C757D",
    textAlign: "center",
    marginBottom: 20,
  },
  levelCard: {
    width: '100%',
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  levelDescription: {
    fontSize: 14,
    color: "#6C757D",
    fontStyle: 'italic',
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4E9F3D",
    padding: 18,
    borderRadius: 10,
    marginBottom: 20,
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
    marginBottom: 20,
  },
  fileName: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4E9F3D",
    flex: 1,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    padding: 18,
    borderRadius: 10,
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: "#B0BEC5",
  },
  generateButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
  },
});