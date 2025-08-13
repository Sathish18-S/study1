import React, { useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  SafeAreaView 
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { auth, db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";

export default function OnboardingQuizScreen() {
  const router = useRouter();
  const { questions: questionsString, isOnboarding } = useLocalSearchParams();
  const questions = JSON.parse(questionsString as string);
  
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectAnswer = (qIndex: number, option: string) => {
    setSelectedAnswers({ ...selectedAnswers, [qIndex]: option });
  };

  const calculateScore = async () => {
    setIsSubmitting(true);
    
    let correct = 0;
    questions.forEach((q: any, i: number) => {
      if (selectedAnswers[i] === q.answer) correct++;
    });
    
    setScore(correct);
    
    if (isOnboarding === "true") {
      await handleOnboardingCompletion(correct, questions.length);
    }
    
    setIsSubmitting(false);
  };

  const handleOnboardingCompletion = async (correct: number, total: number) => {
    const percentage = (correct / total) * 100;
    let level = "Beginner";
    
    if (percentage >= 80) level = "Advanced";
    else if (percentage >= 60 ) level = "Intermediate";
    else if (percentage >= 0) level = "Basic";

    try {
      // Update user document in Firestore
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, "users", user.uid), {
          hasTakenTest: true,
          initialLevel: level,
          lastTestScore: percentage,
          lastTestDate: new Date().toISOString()
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error updating user data:", error);
      Alert.alert("Error", "Failed to save your results");
      return;
    }

    Alert.alert(
      "Assessment Complete",
      `Your starting level: ${level}\nScore: ${correct}/${total}`,
      [
        {
          text: "Continue to Home",
          onPress: () => {
            // Complete navigation reset
            router.replace({
              pathname: "/(tabs)/HomeScreen",
              params: { 
                initialLevel: level,
                showWelcome: "true" 
              }
            });
          }
        }
      ],
      { cancelable: false }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Skill Assessment</Text>
        <Text style={styles.progressText}>
          {Object.keys(selectedAnswers).length}/{questions.length} answered
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {questions.map((q: any, index: number) => (
          <View key={index} style={styles.questionCard}>
            <Text style={styles.questionText}>{index + 1}. {q.question}</Text>
            
            {q.options.map((option: string, idx: number) => {
              const isSelected = selectedAnswers[index] === option;
              const isCorrect = score !== null && option === q.answer;
              
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.optionButton,
                    isSelected && styles.selectedOption,
                    isCorrect && score !== null && styles.correctOption,
                    score !== null && isSelected && !isCorrect && styles.incorrectOption
                  ]}
                  onPress={() => selectAnswer(index, option)}
                  disabled={score !== null}
                >
                  <Ionicons 
                    name={
                      isCorrect && score !== null ? "checkmark-circle" :
                      isSelected && score !== null ? "close-circle" :
                      isSelected ? "radio-button-on" : "radio-button-off"
                    } 
                    size={20} 
                    color={
                      isCorrect && score !== null ? "#2ECC71" :
                      isSelected && score !== null ? "#E74C3C" :
                      isSelected ? "#3498DB" : "#BDC3C7"
                    } 
                  />
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {score === null && (
        <TouchableOpacity
          style={[
            styles.submitButton,
            Object.keys(selectedAnswers).length !== questions.length && styles.disabledButton
          ]}
          onPress={calculateScore}
          disabled={Object.keys(selectedAnswers).length !== questions.length || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Assessment</Text>
          )}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA"
  },
  header: {
    padding: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#ECF0F1"
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2C3E50",
    textAlign: "center"
  },
  progressText: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center",
    marginTop: 8
  },
  content: {
    padding: 20,
    paddingBottom: 100
  },
  questionCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#34495E",
    marginBottom: 15
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#ECF0F1"
  },
  selectedOption: {
    backgroundColor: "#EBF5FB",
    borderColor: "#3498DB"
  },
  correctOption: {
    backgroundColor: "#E8F8F5",
    borderColor: "#2ECC71"
  },
  incorrectOption: {
    backgroundColor: "#FDEDEC",
    borderColor: "#E74C3C"
  },
  optionText: {
    fontSize: 15,
    marginLeft: 12,
    color: "#2C3E50",
    flex: 1
  },
  submitButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#3498DB",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  disabledButton: {
    backgroundColor: "#BDC3C7"
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600"
  }
});