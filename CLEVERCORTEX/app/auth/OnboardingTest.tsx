import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  StyleSheet 
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function OnboardingTestScreen() {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const startTest = async () => {
    if (!topic.trim()) {
      Alert.alert("Error", "Please enter a topic");
      return;
    }

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("text", topic.trim());
      formData.append("num_questions", "15");
      formData.append("user_level", "Basic");

      console.log("Making request to:", "http://172.16.45.79:8081/qui/text");
      console.log("FormData:", {
        text: topic.trim(),
        num_questions: "15",
        user_level: "Basic"
      });

      const response = await fetch("http://172.16.45.79:8081/qui/text", {
        method: "POST",
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      // Get response text first to see what we're actually getting
      const responseText = await response.text();
      console.log("Raw response:", responseText);

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Parsed response:", data);
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 200)}...`);
      }

      if (!response.ok) {
        console.error("HTTP error:", response.status, data);
        throw new Error(data?.error || data?.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!data?.questions?.length) {
        console.error("No questions in response:", data);
        throw new Error("No questions were generated. The API returned empty questions array.");
      }

      console.log("Successfully generated", data.questions.length, "questions");

      router.push({
        pathname: "/auth/OnboardingQuizScreen",
        params: { 
          questions: JSON.stringify(data.questions),
          isOnboarding: "true",
          topic: topic.trim()
        }
      });

    } catch (err) {
      console.error("Quiz generation error details:", err);
      
      // More specific error messages
      let errorMessage = "Something went wrong. Please try again.";
      
      if (err.message.includes("Network request failed")) {
        errorMessage = "Cannot connect to server. Please check your internet connection.";
      } else if (err.message.includes("Failed to fetch")) {
        errorMessage = "Cannot reach the quiz server. Please try again later.";
      } else if (err.message.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      Alert.alert(
        "Quiz Generation Failed", 
        errorMessage,
        [
          {
            text: "Retry",
            onPress: startTest
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Test connection function
  const testConnection = async () => {
    try {
      const response = await fetch("http://172.16.45.79:8081/health", {
        method: "GET",
        timeout: 5000
      });
      
      if (response.ok) {
        Alert.alert("Connection Test", "✅ Server is reachable!");
      } else {
        Alert.alert("Connection Test", `❌ Server responded with status: ${response.status}`);
      }
    } catch (error) {
      Alert.alert("Connection Test", `❌ Cannot reach server: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="school" size={48} color="#3498db" />
      </View>
      
      <Text style={styles.title}>Skill Assessment</Text>
      <Text style={styles.subtitle}>
        Enter a topic to determine your starting knowledge level. We'll create a personalized assessment to understand your current abilities.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Assessment Topic</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., JavaScript Fundamentals, Calculus Basics, World History"
          placeholderTextColor="#95a5a6"
          value={topic}
          onChangeText={setTopic}
          editable={!isLoading}
          autoCapitalize="words"
          autoCorrect={true}
          returnKeyType="go"
          onSubmitEditing={startTest}
        />
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color="#3498db" />
        <Text style={styles.infoText}>
          This assessment will help us create quizzes that match your knowledge level
        </Text>
      </View>

      {/* Debug section - remove in production */}
      <View style={styles.debugSection}>
        <TouchableOpacity style={styles.debugButton} onPress={testConnection}>
          <Text style={styles.debugButtonText}>Test Server Connection</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[
          styles.button, 
          isLoading && styles.disabledButton,
          !topic.trim() && styles.disabledButton
        ]} 
        onPress={startTest} 
        disabled={isLoading || !topic.trim()}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <Ionicons name="rocket-outline" size={20} color="#FFF" />
            <Text style={styles.buttonText}>Start Assessment</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 24, 
    backgroundColor: "#f8f9fa", 
    justifyContent: "center" 
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: { 
    fontSize: 28, 
    fontWeight: "700", 
    textAlign: "center", 
    marginBottom: 12, 
    color: "#2c3e50",
    letterSpacing: 0.5
  },
  subtitle: { 
    fontSize: 16, 
    textAlign: "center", 
    marginBottom: 32, 
    color: "#7f8c8d",
    lineHeight: 22,
    paddingHorizontal: 20
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1, 
    borderColor: "#bdc3c7", 
    borderRadius: 12,
    paddingHorizontal: 16, 
    height: 52, 
    backgroundColor: "#FFF", 
    fontSize: 16,
    color: "#2c3e50",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 16,
    borderRadius: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#90caf9",
  },
  infoText: {
    fontSize: 14,
    color: "#1976d2",
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  debugSection: {
    marginBottom: 20,
  },
  debugButton: {
    backgroundColor: "#e74c3c",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  debugButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  button: { 
    backgroundColor: "#3498db", 
    padding: 16, 
    borderRadius: 12, 
    flexDirection: "row", 
    justifyContent: "center", 
    alignItems: "center",
    shadowColor: "#2980b9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3
  },
  disabledButton: {
    backgroundColor: "#bdc3c7",
    shadowColor: "#95a5a6"
  },
  buttonText: { 
    color: "#FFF", 
    fontSize: 18, 
    fontWeight: "600", 
    marginLeft: 12,
    letterSpacing: 0.5
  }
});