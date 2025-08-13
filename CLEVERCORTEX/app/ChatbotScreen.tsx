import React, { useState, useEffect } from "react";
import { 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  FlatList, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Pressable
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GEMINI_API_KEY = "AIzaSyCQr234zDt8-gCeCVcgyJ45P4kkG64V9NI"; // 🔴 Replace with your API key

type Message = {
  text: string;
  sender: "user" | "gemini";
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
  pdfName: string | null;
  createdAt: number;
};

const App = () => {
  const [msg, setMsg] = useState<string>("");
  const [currentChat, setCurrentChat] = useState<Chat>({
    id: 'default',
    title: 'New Chat',
    messages: [{
      text: "Hello! I'm your AI assistant. Ask me anything or upload a PDF for document-specific questions.",
      sender: "gemini"
    }],
    pdfName: null,
    createdAt: Date.now()
  });
  const [pdfText, setPdfText] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load chats from storage on app start
  useEffect(() => {
    const loadChats = async () => {
      try {
        const savedChats = await AsyncStorage.getItem('chats');
        if (savedChats) {
          setChats(JSON.parse(savedChats));
        }
      } catch (error) {
        console.error('Failed to load chats', error);
      }
    };
    loadChats();
  }, []);

  // Save chats to storage whenever they change
  useEffect(() => {
    const saveChats = async () => {
      try {
        await AsyncStorage.setItem('chats', JSON.stringify(chats));
      } catch (error) {
        console.error('Failed to save chats', error);
      }
    };
    saveChats();
  }, [chats]);

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
      });

      if (result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        const name = result.assets[0].name || "document.pdf";

        const formData = new FormData();
        formData.append("pdf", {
          uri,
          name,
          type: "application/pdf",
        });

        setIsTyping(true);
        const response = await fetch("http://10.156.245.249:5000/extract-text", {
          method: "POST",
          body: formData,
          headers: { "Content-Type": "multipart/form-data" },
        });

        const data = await response.json();
        const extractedText = data.text || "No text extracted.";

        setPdfText(extractedText);
        setCurrentChat(prev => ({
          ...prev,
          pdfName: name,
          messages: [
            { text: `📄 PDF Selected: ${name}`, sender: "user" },
            { text: "I've loaded the document. You can now ask questions about it.", sender: "gemini" },
            ...prev.messages
          ]
        }));
        setIsTyping(false);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!msg.trim() || isTyping) return;

    const userMessage: Message = { text: msg, sender: "user" };
    const updatedMessages = [userMessage, ...currentChat.messages];
    
    // Update current chat
    const updatedChat = {
      ...currentChat,
      messages: updatedMessages,
      title: msg.length > 20 ? `${msg.substring(0, 20)}...` : msg // Use first message as title
    };
    
    setCurrentChat(updatedChat);
    setMsg("");
    setIsTyping(true);

    try {
      let prompt = msg;
      
      if (pdfText) {
        prompt = `Based on this document:\n${pdfText}\n\nAnswer this question: ${msg}`;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response. Please try again.";

      const finalChat = {
        ...updatedChat,
        messages: [{ text: reply, sender: "gemini" }, ...updatedMessages]
      };

      setCurrentChat(finalChat);
      
      // Update chats list - replace if exists, add if new
      setChats(prev => {
        const existingIndex = prev.findIndex(chat => chat.id === finalChat.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = finalChat;
          return updated;
        }
        return [finalChat, ...prev];
      });
    } catch (error) {
      console.error("Error:", error);
      setCurrentChat(prev => ({
        ...prev,
        messages: [{
          text: "Sorry, I encountered an error processing your request. Please try again later.",
          sender: "gemini"
        }, ...prev.messages]
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const startNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [{
        text: "Hello! I'm your AI assistant. Ask me anything or upload a PDF for document-specific questions.",
        sender: "gemini"
      }],
      pdfName: null,
      createdAt: Date.now()
    };
    setCurrentChat(newChat);
    setChats(prev => [newChat, ...prev]);
    setPdfText(null);
    setShowHistory(false);
  };

  const loadChat = (chat: Chat) => {
    setCurrentChat(chat);
    setPdfText(null); // Reset PDF text - you might want to handle this differently
    setShowHistory(false);
  };

  const deleteChat = (chatId: string) => {
    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this chat?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: () => {
            setChats(prev => prev.filter(chat => chat.id !== chatId));
            if (currentChat.id === chatId) {
              startNewChat();
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer, 
      item.sender === "user" ? styles.userContainer : styles.geminiContainer
    ]}>
      <View style={styles.avatar}>
        {item.sender === "user" ? (
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={18} color="#fff" />
          </View>
        ) : (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={18} color="#fff" />
          </View>
        )}
      </View>
      <View style={[
        styles.message, 
        item.sender === "user" ? styles.userMessage : styles.geminiMessage
      ]}>
        <Text style={[
          styles.messageText, 
          item.sender === "user" ? styles.userMessageText : styles.geminiMessageText
        ]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  const renderChatItem = ({ item }: { item: Chat }) => (
    <Pressable 
      style={styles.chatItem} 
      onPress={() => loadChat(item)}
      onLongPress={() => deleteChat(item.id)}
    >
      <Ionicons 
        name="chatbubble-ellipses" 
        size={20} 
        color={currentChat.id === item.id ? "#10a37f" : "#6e6e80"} 
      />
      <View style={styles.chatInfo}>
        <Text 
          style={[
            styles.chatTitle,
            currentChat.id === item.id && styles.activeChatTitle
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text style={styles.chatDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      {item.pdfName && (
        <Ionicons name="document" size={16} color="#10a37f" style={styles.chatDocIcon} />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowHistory(true)}>
          <Ionicons name="menu" size={24} color="#202123" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentChat.title}
        </Text>
        <TouchableOpacity onPress={startNewChat}>
          <Ionicons name="add" size={24} color="#202123" />
        </TouchableOpacity>
      </View>

      {currentChat.pdfName && (
        <View style={styles.documentBadge}>
          <Ionicons name="document" size={14} color="#10a37f" />
          <Text style={styles.documentText} numberOfLines={1}>
            {currentChat.pdfName}
          </Text>
        </View>
      )}

      <FlatList
        data={currentChat.messages}
        renderItem={renderItem}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.messagesContainer}
        inverted
        style={styles.chatContainer}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.attachButton} 
            onPress={handleDocumentPick}
          >
            <Ionicons name="attach" size={24} color="#6e6e80" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Message AI Assistant..."
            placeholderTextColor="#8e8ea0"
            value={msg}
            onChangeText={setMsg}
            multiline
            onSubmitEditing={handleSendMessage}
          />
          
          <TouchableOpacity 
            style={[styles.sendButton, isTyping && styles.disabledButton]} 
            onPress={handleSendMessage}
            disabled={isTyping}
          >
            {isTyping ? (
              <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Chat History Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showHistory}
        onRequestClose={() => setShowHistory(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chat History</Text>
            <TouchableOpacity onPress={() => setShowHistory(false)}>
              <Ionicons name="close" size={24} color="#202123" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={chats}
            renderItem={renderChatItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.chatListContainer}
            ListEmptyComponent={
              <Text style={styles.emptyChatsText}>No chat history yet</Text>
            }
          />
          
          <TouchableOpacity 
            style={styles.newChatButton} 
            onPress={startNewChat}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.newChatButtonText}>New Chat</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f8",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#202123",
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  documentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 163, 127, 0.1)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  documentText: {
    fontSize: 12,
    color: "#10a37f",
    marginLeft: 4,
  },
  chatContainer: {
    flex: 1,
    paddingBottom: 16,
  },
  messagesContainer: {
    paddingBottom: 24,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  geminiContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    marginRight: 12,
    marginTop: 4,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#10a37f",
    alignItems: "center",
    justifyContent: "center",
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#5436da",
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 12,
  },
  userMessage: {
    backgroundColor: "#10a37f",
    borderBottomRightRadius: 0,
  },
  geminiMessage: {
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderColor: "#e5e5e6",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: "#ffffff",
  },
  geminiMessageText: {
    color: "#343541",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e6",
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f7f7f8",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    maxHeight: 120,
    fontSize: 16,
    color: "#343541",
    borderWidth: 1,
    borderColor: "#e5e5e6",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#10a37f",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: "#c5c5d2",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#f7f7f8",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e6",
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#202123",
  },
  chatListContainer: {
    paddingBottom: 80,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e6",
    backgroundColor: "#fff",
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatTitle: {
    fontSize: 16,
    color: "#6e6e80",
  },
  activeChatTitle: {
    color: "#10a37f",
    fontWeight: "600",
  },
  chatDate: {
    fontSize: 12,
    color: "#8e8ea0",
    marginTop: 4,
  },
  chatDocIcon: {
    marginLeft: 8,
  },
  emptyChatsText: {
    textAlign: "center",
    marginTop: 32,
    color: "#8e8ea0",
  },
  newChatButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    flexDirection: "row",
    backgroundColor: "#10a37f",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  newChatButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default App;