import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Modal,
  TextInput,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Image,
  Linking
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';

type Session = {
  type: 'study' | 'qna' | 'break';
  start_time: string;
  end_time: string;
  duration: number;
};

type MCQ = {
  question: string;
  options: string[];
  correct: string;
};

type Topic = {
  topic_id: number;
  topic: string;
  start_time: string;
  end_time: string;
  allocated_time: number;
  completed: boolean;
  summary: string;
  qna: MCQ[];
  suggested_time?: number;
  sessions?: Session[];
};

type VideoResource = {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  channel: string;
  duration: string;
  viewCount: string;
};

export default function StudyPlanScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { studyPlan: initialStudyPlan } = route.params;

  const [studyPlan, setStudyPlan] = useState<Topic[]>(initialStudyPlan);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [completedTopics, setCompletedTopics] = useState<number[]>([]);
  const [showQnA, setShowQnA] = useState<boolean>(false);
  const [selectedTopicForQnA, setSelectedTopicForQnA] = useState<Topic | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: string}>({});
  const [showTimeAdjustModal, setShowTimeAdjustModal] = useState<boolean>(false);
  const [selectedTopicForTimeAdjust, setSelectedTopicForTimeAdjust] = useState<Topic | null>(null);
  const [adjustedTime, setAdjustedTime] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'hindi' | 'tamil' | 'telugu'>('english');
  const [videos, setVideos] = useState<Record<string, VideoResource[]>>({});
  const [loadingVideos, setLoadingVideos] = useState<boolean>(false);

  const currentTopic = studyPlan[currentPage];

  const YOUTUBE_API_KEY = 'AIzaSyDXs8ZtCM4gBkUm7mLKmOvBHUpf_tyqiXY';

  // Sample video resources for each topic (in a real app, this would come from an API)
  useEffect(() => {
    // Load videos for each topic when the component mounts
    const loadVideosForTopics = async () => {
      const videosData: Record<string, VideoResource[]> = {};
      
      for (const topic of studyPlan) {
        if (!videosData[topic.topic]) {
          try {
            setLoadingVideos(true);
            const englishVideos = await fetchYouTubeVideos(topic.topic, 'en');
            const hindiVideos = await fetchYouTubeVideos(topic.topic, 'hi');
            const tamilVideos = await fetchYouTubeVideos(topic.topic, 'ta');
            const teluguVideos = await fetchYouTubeVideos(topic.topic, 'te');
            
            videosData[topic.topic] = [
              ...(englishVideos || []),
              ...(hindiVideos || []),
              ...(tamilVideos || []),
              ...(teluguVideos || [])
            ];
          } catch (error) {
            console.error(`Error fetching videos for ${topic.topic}:`, error);
            videosData[topic.topic] = [];
          } finally {
            setLoadingVideos(false);
          }
        }
      }
      
      setVideos(videosData);
    };

    loadVideosForTopics();
  }, [studyPlan]);

  const fetchYouTubeVideos = async (query: string, languageCode: string): Promise<VideoResource[] | null> => {
    try {
      // First search for videos
      const searchResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(query)}&relevanceLanguage=${languageCode}&type=video&key=${YOUTUBE_API_KEY}`
      );

      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        return null;
      }

      // Get video details (duration, view count)
      const videoIds = searchResponse.data.items.map((item: any) => item.id.videoId).join(',');
      const videoResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`
      );

      return videoResponse.data.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnail: item.snippet.thumbnails.medium.url,
        channel: item.snippet.channelTitle,
        duration: formatDuration(item.contentDetails.duration),
        viewCount: formatViewCount(item.statistics.viewCount)
      }));
    } catch (error) {
      console.error('Error fetching YouTube videos:', error);
      return null;
    }
  };

  const formatDuration = (duration: string): string => {
    // Convert ISO 8601 duration to readable format (e.g., PT15M33S -> 15:33)
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return '0:00';
    
    const hours = match[1] ? match[1].replace('H', '') : '';
    const minutes = match[2] ? match[2].replace('M', '') : '0';
    const seconds = match[3] ? match[3].replace('S', '') : '00';
    
    if (hours) {
      return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.padStart(2, '0')}`;
  };

  const formatViewCount = (count: string): string => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M views`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K views`;
    }
    return `${num} views`;
  };

  const getVideosForCurrentTopic = () => {
  if (!currentTopic || !videos[currentTopic.topic]) return [];
  
  // Get videos for current topic
  const topicVideos = videos[currentTopic.topic];
  
  // Filter videos by selected language
  return topicVideos.filter(video => {
    if (selectedLanguage === 'english') {
      return !video.title.match(/hindi|tamil|telugu|தமிழ்|తెలుగు|हिंदी/i);
    }
    if (selectedLanguage === 'hindi') {
      return video.title.match(/hindi|हिंदी/i) || 
             video.channel.match(/hindi|हिंदी/i);
    }
    if (selectedLanguage === 'tamil') {
      return video.title.match(/tamil|தமிழ்/i) || 
             video.channel.match(/tamil|தமிழ்/i);
    }
    if (selectedLanguage === 'telugu') {
      return video.title.match(/telugu|తెలుగు/i) || 
             video.channel.match(/telugu|తెలుగు/i);
    }
    return true;
  });
};
  const addMinutes = (timeStr: string, minutes: number): string => {
    const [time, period] = timeStr.split(' ');
    const [hour, min] = time.split(':').map(Number);
    let totalMinutes = hour * 60 + min + minutes;
    if (period === 'PM' && hour !== 12) totalMinutes += 720;
    const newHour = Math.floor(totalMinutes / 60) % 12 || 12;
    const newMin = totalMinutes % 60;
    const newPeriod = totalMinutes >= 720 ? 'PM' : 'AM';
    return `${newHour}:${newMin.toString().padStart(2, '0')} ${newPeriod}`;
  };

  const handleAnswerSelect = (questionIndex: number, optionKey: string) => {
    const key = optionKey[0].toLowerCase();
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: key
    }));
  };

  const evaluateAnswers = () => {
    if (!selectedTopicForQnA || selectedTopicForQnA.qna.length === 0) {
      Alert.alert("Error", "No questions available");
      return;
    }
  
    let score = 0;
    const results = selectedTopicForQnA.qna.map((qna, index) => {
      const selectedKey = selectedAnswers[index]?.toLowerCase().charAt(0);
      const correctKey = qna.correct?.toLowerCase().charAt(0);
      const isCorrect = selectedKey === correctKey;
      
      if (isCorrect) score++;
      
      return {
        question: qna.question,
        correct: correctKey ? `${correctKey.toUpperCase()}) ${qna.options[correctKey.charCodeAt(0) - 97]}` : "N/A",
        selected: selectedKey ? `${selectedKey.toUpperCase()}) ${qna.options[selectedKey.charCodeAt(0) - 97] || 'Not answered'}` : "Not answered",
        isCorrect
      };
    });

    // Automatically mark topic as completed
    const topicId = selectedTopicForQnA.topic_id;
    if (!completedTopics.includes(topicId)) {
      setCompletedTopics(prev => [...prev, topicId]);
      setStudyPlan(prev => 
        prev.map(topic => 
          topic.topic_id === topicId ? { ...topic, completed: true } : topic
        )
      );
    }

    Alert.alert(
      "Quiz Results",
      `You scored ${score}/${selectedTopicForQnA.qna.length}`,
      [
        {
          text: "Review Answers",
          onPress: () => showAnswerDetails(results)
        },
        { 
          text: "Continue",
          onPress: () => {
            setShowQnA(false);
            setSelectedAnswers({});
            // Move to next topic if not last
            if (currentPage < studyPlan.length - 1) {
              setCurrentPage(prev => prev + 1);
            }
          }
        }
      ]
    );
  };

  const showAnswerDetails = (results: any[]) => {
    let message = "";
    results.forEach((result, index) => {
      message += `Q${index + 1}: ${result.question}\n` +
                 `Your answer: ${result.selected || 'Not answered'}\n` +
                 `Correct answer: ${result.correct}\n\n`;
    });
    Alert.alert("Detailed Results", message);
  };

  const openTimeAdjustModal = (topic: Topic) => {
    setSelectedTopicForTimeAdjust(topic);
    setAdjustedTime(topic.allocated_time.toString());
    setShowTimeAdjustModal(true);
  };

  const applyTimeAdjustment = () => {
    if (!selectedTopicForTimeAdjust || !adjustedTime) return;
    
    const newTime = parseInt(adjustedTime);
    if (isNaN(newTime) || newTime <= 0) {
      Alert.alert("Invalid Time", "Please enter a valid positive number");
      return;
    }

    const topicId = selectedTopicForTimeAdjust.topic_id;
    const topicIndex = studyPlan.findIndex(t => t.topic_id === topicId);
    if (topicIndex === -1) return;

    const timeDifference = newTime - selectedTopicForTimeAdjust.allocated_time;
    
    setStudyPlan(prev => {
      const newPlan = [...prev];
      newPlan[topicIndex].allocated_time = newTime;
      newPlan[topicIndex].end_time = addMinutes(
        newPlan[topicIndex].start_time, 
        newTime
      );
      
      for (let i = topicIndex + 1; i < newPlan.length; i++) {
        newPlan[i].start_time = addMinutes(newPlan[i].start_time, timeDifference);
        newPlan[i].end_time = addMinutes(newPlan[i].end_time, timeDifference);
      }
      
      return newPlan;
    });

    setShowTimeAdjustModal(false);
    Alert.alert("Success", "Schedule updated successfully");
  };

  const renderTopicScreen = () => {
    if (!currentTopic) return null;
    const filteredVideos = getVideosForCurrentTopic();

    return (
      <ScrollView 
        contentContainerStyle={styles.topicContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topicHeader}>
          <Text style={styles.topicTitle}>{currentTopic.topic}</Text>
          {currentTopic.completed && (
            <View style={styles.completedBadge}>
              <MaterialIcons name="check-circle" size={16} color="#fff" />
              <Text style={styles.completedBadgeText}>Completed</Text>
            </View>
          )}
        </View>
        
        <View style={styles.timeInfoContainer}>
          <View style={styles.timeInfo}>
            <MaterialIcons name="schedule" size={20} color="#4F46E5" />
            <Text style={styles.timeText}>
              {currentTopic.start_time} - {currentTopic.end_time}
            </Text>
          </View>
          <Text style={styles.durationText}>
            {currentTopic.allocated_time} minutes
          </Text>
          {currentTopic.sessions && (
            <Text style={styles.sessionBreakdown}>
              Study: {currentTopic.sessions[0].duration}m • Q&A: {currentTopic.sessions[1]?.duration || 0}m
            </Text>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{currentTopic.summary}</Text>
          </View>
        </View>
        
        {/* Language Selection */}
        <View style={styles.section}>
          <View style={styles.languageSelector}>
    
            <TouchableOpacity
              style={[
                styles.languageButton,
                selectedLanguage === 'english' && styles.selectedLanguageButton
              ]}
              onPress={() => setSelectedLanguage('english')}
            >
              <Text style={[
                styles.languageButtonText,
                selectedLanguage === 'english' && styles.selectedLanguageButtonText
              ]}>                            YOUTUBE VIDEOS                                          </Text>
            </TouchableOpacity>
      
          </View>
          
         {loadingVideos ? (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4F46E5" />
    <Text style={styles.loadingText}>Loading videos...</Text>
  </View>
) : filteredVideos.length > 0 ? (
  <View style={styles.videosContainer}>
    {filteredVideos.map((video, index) => (
      <TouchableOpacity
        key={`video-${video.id}-${index}`}
        style={styles.videoCard}
        onPress={() => Linking.openURL(video.url)}
      >
        <View style={styles.videoThumbnailContainer}>
          <Image 
            source={{ uri: video.thumbnail }} 
            style={styles.videoThumbnail}
            resizeMode="cover"
          />
          <View style={styles.videoDurationBadge}>
            <Text style={styles.videoDurationText}>{video.duration}</Text>
          </View>
        </View>
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
          <Text style={styles.videoChannel}>{video.channel}</Text>
          <Text style={styles.videoViews}>{video.viewCount}</Text>
        </View>
      </TouchableOpacity>
    ))}
  </View>
) : (
  <View style={styles.noVideosContainer}>
    <MaterialIcons name="error-outline" size={40} color="#6B7280" />
    <Text style={styles.noVideosText}>
      No videos available in {selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)} for this topic
    </Text>
  </View>
)}
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.quizButton,
              currentTopic.qna.length === 0 && styles.disabledButton
            ]}
            onPress={() => {
              if (currentTopic.qna.length > 0) {
                setSelectedTopicForQnA(currentTopic);
                setSelectedAnswers({});
                setShowQnA(true);
              } else {
                // Mark as completed if no questions
                if (!completedTopics.includes(currentTopic.topic_id)) {
                  setCompletedTopics(prev => [...prev, currentTopic.topic_id]);
                  setStudyPlan(prev => 
                    prev.map(t => 
                      t.topic_id === currentTopic.topic_id ? { ...t, completed: true } : t
                    )
                  );
                }
                Alert.alert("No Quiz", "This topic doesn't have any quiz questions");
              }
            }}
          >
            <LinearGradient
              colors={['#4F46E5', '#6366F1']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons name="quiz" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {currentTopic.qna.length > 0 ? `Take Quiz (${currentTopic.qna.length})` : "No Quiz"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.timeButton]}
            onPress={() => openTimeAdjustModal(currentTopic)}
          >
            <LinearGradient
              colors={['#4F46E5', '#6366F1']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons name="edit" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Adjust Time</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderQnAModal = () => {
    if (!selectedTopicForQnA) return null;
  
    if (selectedTopicForQnA.qna.length === 0) {
      return (
        <Modal
          visible={showQnA}
          animationType="slide"
          onRequestClose={() => setShowQnA(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <LinearGradient
              colors={['#4F46E5', '#4338CA']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>{selectedTopicForQnA.topic}</Text>
              <TouchableOpacity onPress={() => {
                setShowQnA(false);
                // Mark as completed when closing modal if no questions
                const topicId = selectedTopicForQnA.topic_id;
                if (!completedTopics.includes(topicId)) {
                  setCompletedTopics(prev => [...prev, topicId]);
                  setStudyPlan(prev => 
                    prev.map(topic => 
                      topic.topic_id === topicId ? { ...topic, completed: true } : topic
                    )
                  );
                }
              }}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            
            <View style={styles.noQuestionsContainer}>
              <Text style={styles.noQuestionsText}>
                No quiz questions available for this topic
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowQnA(false);
                  // Mark as completed when closing modal if no questions
                  const topicId = selectedTopicForQnA.topic_id;
                  if (!completedTopics.includes(topicId)) {
                    setCompletedTopics(prev => [...prev, topicId]);
                    setStudyPlan(prev => 
                      prev.map(topic => 
                        topic.topic_id === topicId ? { ...topic, completed: true } : topic
                      )
                    );
                  }
                }}
              >
                <LinearGradient
                  colors={['#4F46E5', '#6366F1']}
                  style={styles.closeButtonGradient}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      );
    }
  
    return (
      <Modal
        visible={showQnA}
        animationType="slide"
        onRequestClose={() => setShowQnA(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <LinearGradient
            colors={['#4F46E5', '#4338CA']}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>{selectedTopicForQnA.topic} Quiz</Text>
            <TouchableOpacity onPress={() => setShowQnA(false)}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
          
          <ScrollView style={styles.qnaScrollContainer}>
            <View style={styles.modalSummaryBox}>
              <Text style={styles.summaryText}>
                {selectedTopicForQnA.summary}
              </Text>
            </View>
            
            <Text style={styles.quizSectionTitle}>Test Your Knowledge</Text>
            
            {selectedTopicForQnA.qna.map((qna, index) => {
              const correctKey = qna.correct?.toLowerCase().charAt(0);
              const selectedKey = selectedAnswers[index]?.toLowerCase().charAt(0);
              
              return (
                <View key={`qna-${index}`} style={styles.questionContainer}>
                  <Text style={styles.questionText}>
                    Q{index + 1}: {qna.question}
                  </Text>
                  
                  {['a', 'b', 'c', 'd'].map((optionChar, optIndex) => {
                    if (optIndex >= qna.options.length) return null;
                    
                    const isSelected = selectedKey === optionChar;
                    const isCorrectOption = correctKey === optionChar;
                    const showCorrectness = selectedKey && isSelected;
                    
                    return (
                      <TouchableOpacity
                        key={`opt-${optIndex}`}
                        style={[
                          styles.optionButton,
                          isSelected && styles.selectedOption,
                          showCorrectness && (
                            isCorrectOption 
                              ? styles.correctOption 
                              : styles.incorrectOption
                          )
                        ]}
                        onPress={() => handleAnswerSelect(index, optionChar)}
                      >
                        <Text style={styles.optionText}>
                          {optionChar.toUpperCase()}) {qna.options[optIndex]}
                        </Text>
                        {showCorrectness && (
                          <MaterialIcons 
                            name={isCorrectOption ? "check-circle" : "cancel"} 
                            size={20} 
                            color={isCorrectOption ? "#10B981" : "#EF4444"} 
                            style={styles.optionIcon}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
          
          <TouchableOpacity
            style={[
              styles.evaluateButton,
              Object.keys(selectedAnswers).length < selectedTopicForQnA.qna.length && 
                styles.evaluateButtonDisabled
            ]}
            onPress={evaluateAnswers}
            disabled={Object.keys(selectedAnswers).length < selectedTopicForQnA.qna.length}
          >
            <LinearGradient
              colors={['#4F46E5', '#6366F1']}
              style={styles.evaluateButtonGradient}
            >
              <Text style={styles.evaluateButtonText}>
                Evaluate Answers ({Object.keys(selectedAnswers).length}/{selectedTopicForQnA.qna.length})
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderTimeAdjustModal = () => (
    <Modal
      visible={showTimeAdjustModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowTimeAdjustModal(false)}
    >
      <View style={styles.timeModalOverlay}>
        <View style={styles.timeModalContainer}>
          <Text style={styles.timeModalTitle}>
            Adjust Time for {selectedTopicForTimeAdjust?.topic}
          </Text>
          
          <Text style={styles.timeModalSubtitle}>
            Current time: {selectedTopicForTimeAdjust?.allocated_time} minutes
          </Text>
          
          <View style={styles.timeInputContainer}>
            <TextInput
              style={styles.timeInput}
              value={adjustedTime}
              onChangeText={setAdjustedTime}
              keyboardType="numeric"
              placeholder="Enter new time in minutes"
              placeholderTextColor="#94A3B8"
            />
          </View>
          
          <View style={styles.timeModalButtons}>
            <TouchableOpacity
              style={[styles.timeModalButton, styles.cancelButton]}
              onPress={() => setShowTimeAdjustModal(false)}
            >
              <Text style={[styles.timeModalButtonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.timeModalButton, styles.applyButton]}
              onPress={applyTimeAdjustment}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                style={styles.timeModalButtonGradient}
              >
                <Text style={styles.timeModalButtonText}>Apply</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderNavigationButtons = () => {
    const isLastTopic = currentPage === studyPlan.length - 1;
    const isCompleted = currentTopic?.completed || false;

    return (
      <View style={styles.navControls}>
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.prevButton,
            currentPage === 0 && styles.disabledNavButton
          ]}
          onPress={() => {
            if (currentPage > 0) {
              setCurrentPage(prev => prev - 1);
            }
          }}
          disabled={currentPage === 0}
        >
          <LinearGradient
            colors={['#6B7280', '#4B5563']}
            style={styles.navButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialIcons name="arrow-back" size={20} color="white" />
            <Text style={styles.navButtonText}>Previous</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.navButton,
            isLastTopic ? styles.finishButton : styles.nextButton,
            isCompleted && styles.completedNavButton
          ]}
          onPress={() => {
            if (currentPage < studyPlan.length - 1) {
              setCurrentPage(prev => prev + 1);
            } else {
              Alert.alert("🎉 Complete!", "You've finished all topics!");
            }
          }}
        >
          <LinearGradient
            colors={isCompleted ? ['#10B981', '#059669'] : ['#4F46E5', '#6366F1']}
            style={styles.navButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.navButtonText}>
              {isLastTopic ? "Finish" : "Next"}
            </Text>
            <MaterialIcons 
              name={isLastTopic ? "check-circle" : "arrow-forward"} 
              size={20} 
              color="white" 
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#4F46E5', '#312E81']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Study Plan</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {renderTopicScreen()}

      {studyPlan.length > 0 && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Topic {currentPage + 1} of {studyPlan.length}
          </Text>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#4F46E5', '#6366F1']}
              style={[styles.progressFill, {
                width: `${((currentPage + 1) / studyPlan.length) * 100}%`
              }]}
            />
          </View>
          <Text style={styles.completionText}>
            Completed: {completedTopics.length}/{studyPlan.length} ({Math.round((completedTopics.length / studyPlan.length) * 100)}%)
          </Text>
        </View>
      )}

      {studyPlan.length > 0 && renderNavigationButtons()}
      
      {renderQnAModal()}
      {renderTimeAdjustModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    paddingTop: RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 16 : 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  backButton: {
    padding: 4,
  },
  headerText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  topicContainer: {
    padding: 24,
    paddingBottom: 120,
  },
  topicHeader: {
    marginBottom: 24,
  },
  topicTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#10B981',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  completedBadgeText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
  timeInfoContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    marginLeft: 8,
    color: '#4B5563',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  durationText: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginLeft: 28,
  },
  sessionBreakdown: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 28,
    fontFamily: 'Inter-Regular',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    fontFamily: 'Inter-SemiBold',
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryText: {
    color: '#374151',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
  },
  // Language selector styles
  languageSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  languageButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    minWidth: 80,
    alignItems: 'center',
  },
  selectedLanguageButton: {
    backgroundColor: '#4F46E5',
  },
  languageButtonText: {
    color: '#4B5563',
    fontWeight: '500',
  },
  selectedLanguageButtonText: {
    color: 'white',
  },
  // Video styles
  videosContainer: {
    marginTop: 8,
  },
  videoCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
  elevation: 1,
  overflow: 'hidden',
},
videoThumbnailContainer: {
  position: 'relative',
  height: 180,
},
videoThumbnail: {
  width: '100%',
  height: '100%',
},
videoDurationBadge: {
  position: 'absolute',
  bottom: 8,
  right: 8,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  borderRadius: 4,
  paddingHorizontal: 6,
  paddingVertical: 2,
},
videoDurationText: {
  color: 'white',
  fontSize: 12,
  fontFamily: 'Inter-Regular',
},
videoInfo: {
  padding: 12,
},
videoTitle: {
  fontSize: 14,
  fontWeight: '500',
  color: '#111827',
  fontFamily: 'Inter-Medium',
  marginBottom: 4,
},
videoChannel: {
  fontSize: 12,
  color: '#6B7280',
  fontFamily: 'Inter-Regular',
},
videoViews: {
  fontSize: 12,
  color: '#6B7280',
  fontFamily: 'Inter-Regular',
  marginTop: 2,
},
  noVideosContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noVideosText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quizButton: {},
  timeButton: {
    flex: 0,
    width: 170,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'Inter-SemiBold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 20 : 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
  },
  noQuestionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noQuestionsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Inter-Regular',
  },
  closeButton: {
    borderRadius: 8,
    overflow: 'hidden',
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonGradient: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  qnaScrollContainer: {
    flex: 1,
    padding: 20,
  },
  modalSummaryBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  quizSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    fontFamily: 'Inter-SemiBold',
  },
  questionContainer: {
    marginBottom: 20,
    padding: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 14,
    color: '#111827',
    fontFamily: 'Inter-Medium',
  },
  optionButton: {
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectedOption: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  correctOption: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  incorrectOption: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  optionText: {
    color: '#111827',
    flex: 1,
    fontFamily: 'Inter-Regular',
  },
  optionIcon: {
    marginLeft: 10,
  },
  evaluateButton: {
    borderRadius: 8,
    margin: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  evaluateButtonGradient: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evaluateButtonDisabled: {
    opacity: 0.6,
  },
  evaluateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
  },
  completionText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  navControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  navButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '48%',
  },
  navButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  prevButton: {},
  nextButton: {},
  finishButton: {},
  completedNavButton: {},
  disabledNavButton: {
    opacity: 0.6,
  },
  navButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginHorizontal: 8,
    fontFamily: 'Inter-SemiBold',
  },
  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  timeModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  timeModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
  },
  timeModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Inter-Regular',
  },
  timeInputContainer: {
    marginBottom: 24,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F8FAFC',
    fontFamily: 'Inter-Regular',
  },
  timeModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  timeModalButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  applyButton: {},
  timeModalButtonGradient: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeModalButtonText: {
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Inter-SemiBold',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontFamily: 'Inter-SemiBold',
  },
});