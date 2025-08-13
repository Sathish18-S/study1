import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Animated,
  Dimensions
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { auth, db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";

const { width } = Dimensions.get('window');

export default function OnboardingQuizScreen() {
  const router = useRouter();
  const { questions: questionsString, isOnboarding } = useLocalSearchParams();
  const questions = JSON.parse(questionsString as string);
  
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [progressAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(1));

  const selectAnswer = (qIndex: number, option: string) => {
    setSelectedAnswers({ ...selectedAnswers, [qIndex]: option });
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, { duration: 200, toValue: 0, useNativeDriver: true }),
        Animated.timing(fadeAnim, { duration: 200, toValue: 1, useNativeDriver: true })
      ]).start();
      
      setCurrentQuestion(currentQuestion + 1);
      updateProgress();
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      updateProgress();
    }
  };

  const updateProgress = () => {
    Animated.timing(progressAnim, {
      toValue: (currentQuestion + 1) / questions.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    updateProgress();
  }, [currentQuestion]);

  const calculateScore = async () => {
    setIsSubmitting(true);
    
    let correct = 0;
    questions.forEach((q: any, i: number) => {
      if (selectedAnswers[i] === q.answer) correct++;
    });
    
    setScore(correct);
    setShowResults(true);
    
    if (isOnboarding === "true") {
      await handleOnboardingCompletion(correct, questions.length);
    }
    
    setIsSubmitting(false);
  };

  const handleOnboardingCompletion = async (correct: number, total: number) => {
    const percentage = (correct / total) * 100;
    let level = "Basic";
    let levelColor = "#48BB78";
    let recommendation = "";
    
    if (percentage >= 80) {
      level = "Advanced";
      levelColor = "#E53E3E";
      recommendation = "Excellent! You're ready for advanced challenges.";
    } else if (percentage >= 60) {
      level = "Intermediate";  
      levelColor = "#F6AD55";
      recommendation = "Good foundation! Let's build on your knowledge.";
    } else {
      level = "Basic";
      levelColor = "#48BB78";
      recommendation = "Great start! We'll help you build strong fundamentals.";
    }

    try {
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, "users", user.uid), {
          hasTakenTest: true,
          initialLevel: level,
          lastTestScore: percentage,
          lastTestDate: new Date().toISOString(),
          needsImprovement: percentage < 50,
          strongAreas: getStrongAreas(correct, total),
          weakAreas: getWeakAreas(correct, total)
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error updating user data:", error);
      Alert.alert("Error", "Failed to save your results");
      return;
    }
  };

  const getStrongAreas = (correct: number, total: number) => {
    // Analyze which question types were answered correctly
    return correct > total * 0.7 ? ["analytical thinking", "problem solving"] : ["basic concepts"];
  };

  const getWeakAreas = (correct: number, total: number) => {
    return correct < total * 0.5 ? ["fundamental concepts", "advanced applications"] : [];
  };

  const getPerformanceLevel = () => {
    if (!score) return { level: "", color: "", message: "", emoji: "" };
    
    const percentage = (score / questions.length) * 100;
    
    if (percentage >= 80) {
      return {
        level: "Advanced",
        color: "#E53E3E",
        message: "Outstanding! You're a pro! 🚀",
        emoji: "🏆",
        suggestion: "Ready for advanced challenges!"
      };
    } else if (percentage >= 60) {
      return {
        level: "Intermediate", 
        color: "#F6AD55",
        message: "Good job! Solid foundation! 📈",
        emoji: "⭐",
        suggestion: "Let's tackle intermediate topics!"
      };
    } else if (percentage >= 40) {
      return {
        level: "Basic",
        color: "#48BB78", 
        message: "Nice effort! Room to grow! 🌱",
        emoji: "💪",
        suggestion: "Let's strengthen your fundamentals!"
      };
    } else {
      return {
        level: "Beginner",
        color: "#4299E1",
        message: "Great start! Every expert was once a beginner! ✨",
        emoji: "🌟",
        suggestion: "Let's build your foundation together!"
      };
    }
  };

  const retakeTest = () => {
    Alert.alert(
      "Retake Assessment?",
      "This will reset your current progress. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Retake", 
          onPress: () => {
            setSelectedAnswers({});
            setScore(null);
            setShowResults(false);
            setCurrentQuestion(0);
            setProgressAnim(new Animated.Value(0));
          }
        }
      ]
    );
  };

  const continueToApp = () => {
    const performance = getPerformanceLevel();
    router.replace({
      pathname: "/(tabs)/HomeScreen",
      params: { 
        initialLevel: performance.level,
        showWelcome: "true",
        score: score?.toString(),
        totalQuestions: questions.length.toString()
      }
    });
  };

  if (showResults && score !== null) {
    const performance = getPerformanceLevel();
    const percentage = Math.round((score / questions.length) * 100);
    const needsImprovement = percentage < 50;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Assessment Complete! {performance.emoji}</Text>
            
            <View style={[styles.scoreCircle, { borderColor: performance.color }]}>
              <Text style={[styles.scoreText, { color: performance.color }]}>{score}</Text>
              <Text style={styles.scoreDivider}>—</Text>
              <Text style={styles.totalText}>{questions.length}</Text>
            </View>
            
            <Text style={[styles.percentageText, { color: performance.color }]}>
              {percentage}% Correct
            </Text>
            
            <View style={[styles.levelBadge, { backgroundColor: performance.color }]}>
              <Text style={styles.levelBadgeText}>{performance.level} Level</Text>
            </View>
            
            <Text style={styles.performanceMessage}>{performance.message}</Text>
            <Text style={styles.suggestionText}>{performance.suggestion}</Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { backgroundColor: `${performance.color}30` }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${percentage}%`, 
                    backgroundColor: performance.color 
                  }
                ]} 
              />
            </View>
          </View>

          {needsImprovement && (
            <View style={styles.improvementCard}>
              <Ionicons name="bulb" size={24} color="#F6AD55" />
              <View style={styles.improvementContent}>
                <Text style={styles.improvementTitle}>💡 Improvement Opportunity</Text>
                <Text style={styles.improvementText}>
                  Consider retaking the assessment or start with foundational topics to strengthen your knowledge base.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.actionButtonsContainer}>
            {needsImprovement && (
              <TouchableOpacity style={styles.retakeButton} onPress={retakeTest}>
                <Ionicons name="refresh" size={20} color="#FFF" />
                <Text style={styles.retakeButtonText}>Retake Assessment</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.continueButton, { backgroundColor: performance.color }]}
              onPress={continueToApp}
            >
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
              <Text style={styles.continueButtonText}>Start Learning Journey</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const currentQ = questions[currentQuestion];
  const isAnswered = selectedAnswers[currentQuestion] !== undefined;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Skill Assessment</Text>
        <Text style={styles.questionCounter}>
          Question {currentQuestion + 1} of {questions.length}
        </Text>
        
        <View style={styles.progressContainer}>
          <Animated.View 
            style={[
              styles.progressFill,
              { 
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                }),
                backgroundColor: '#3498DB'
              }
            ]} 
          />
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{currentQ.question}</Text>
            
            {currentQ.options.map((option: string, idx: number) => {
              const isSelected = selectedAnswers[currentQuestion] === option;
              
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.optionButton,
                    isSelected && styles.selectedOption
                  ]}
                  onPress={() => selectAnswer(currentQuestion, option)}
                >
                  <Ionicons 
                    name={isSelected ? "radio-button-on" : "radio-button-off"} 
                    size={20} 
                    color={isSelected ? "#3498DB" : "#BDC3C7"} 
                  />
                  <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentQuestion === 0 && styles.disabledNavButton]}
          onPress={prevQuestion}
          disabled={currentQuestion === 0}
        >
          <Ionicons name="chevron-back" size={20} color={currentQuestion === 0 ? "#BDC3C7" : "#3498DB"} />
          <Text style={[styles.navButtonText, currentQuestion === 0 && styles.disabledNavButtonText]}>
            Previous
          </Text>
        </TouchableOpacity>

        {currentQuestion === questions.length - 1 ? (
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
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.submitButtonText}>Complete Assessment</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, !isAnswered && styles.disabledNavButton]}
            onPress={nextQuestion}
            disabled={!isAnswered}
          >
            <Text style={[styles.navButtonText, !isAnswered && styles.disabledNavButtonText]}>
              Next
            </Text>
            <Ionicons name="chevron-forward" size={20} color={!isAnswered ? "#BDC3C7" : "#3498DB"} />
          </TouchableOpacity>
        )}
      </View>
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
    fontSize: 24,
    fontWeight: "700",
    color: "#2C3E50",
    textAlign: "center"
  },
  questionCounter: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16
  },
  progressContainer: {
    height: 6,
    backgroundColor: "#ECF0F1",
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  content: {
    flex: 1,
    padding: 20
  },
  questionCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#34495E",
    marginBottom: 24,
    lineHeight: 24
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "#ECF0F1"
  },
  selectedOption: {
    backgroundColor: "#EBF5FB",
    borderColor: "#3498DB"
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
    color: "#2C3E50",
    flex: 1,
    lineHeight: 22
  },
  selectedOptionText: {
    color: "#2C3E50",
    fontWeight: "500"
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#ECF0F1"
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    minWidth: 100
  },
  disabledNavButton: {
    opacity: 0.5
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3498DB",
    marginHorizontal: 8
  },
  disabledNavButtonText: {
    color: "#BDC3C7"
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2ECC71",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 180
  },
  disabledButton: {
    backgroundColor: "#BDC3C7"
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8
  },
  // Results Screen Styles
  resultsContainer: {
    flex: 1,
    padding: 24
  },
  resultsHeader: {
    alignItems: "center",
    marginBottom: 32
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 24
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  scoreText: {
    fontSize: 32,
    fontWeight: "700"
  },
  scoreDivider: {
    fontSize: 16,
    color: "#BDC3C7",
    fontWeight: "300"
  },
  totalText: {
    fontSize: 18,
    color: "#7F8C8D",
    fontWeight: "500"
  },
  percentageText: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16
  },
  levelBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16
  },
  levelBadgeText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600"
  },
  performanceMessage: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 8
  },
  suggestionText: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center"
  },
  progressBarContainer: {
    marginBottom: 24
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden'
  },
  improvementCard: {
    flexDirection: "row",
    backgroundColor: "#FFFBF0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F6AD55"
  },
  improvementContent: {
    flex: 1,
    marginLeft: 12
  },
  improvementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 4
  },
  improvementText: {
    fontSize: 14,
    color: "#7F8C8D",
    lineHeight: 20
  },
  actionButtonsContainer: {
    gap: 12
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E74C3C",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#E74C3C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  retakeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  continueButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8
  }
});