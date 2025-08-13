import React from "react";
import { 
  View, 
  Text, 
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert
} from "react-native";
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

export default function SummarizeScreen() {
  const { summary, fileName, userLevel = "Basic" } = useLocalSearchParams();

  const downloadPDF = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial; line-height: 1.6; padding: 20px; }
              .header { border-bottom: 2px solid #4E9F3D; padding-bottom: 20px; margin-bottom: 30px; }
              .level-badge { 
                background: ${getLevelColor()}; 
                color: white; 
                padding: 5px 15px; 
                border-radius: 20px; 
                display: inline-block;
                font-size: 14px;
                font-weight: bold;
              }
              strong { font-size: 18px; color: #333; }
              ul { margin-left: 20px; }
              li { margin-bottom: 8px; }
              h1, h2, h3 { color: #2C3E50; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>PDF Summary</h1>
              <p><strong>File:</strong> ${fileName}</p>
              <span class="level-badge">${userLevel} Level Summary</span>
            </div>
            ${summary?.toString().replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const newUri = FileSystem.documentDirectory + `${userLevel}_summary.pdf`;
      await FileSystem.moveAsync({ from: uri, to: newUri });
      await Sharing.shareAsync(newUri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert("Error", "Failed to generate PDF");
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

  const getLevelDescription = () => {
    switch (userLevel) {
      case "Advanced":
        return "Comprehensive technical analysis with detailed explanations";
      case "Intermediate":
        return "Balanced explanation with moderate technical detail";
      case "Basic":
        return "Simple, easy-to-understand summary";
      default:
        return "Personalized summary";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Summary</Text>
        
        {/* Level Badge */}
        <View style={[styles.levelBadge, { backgroundColor: getLevelColor() }]}>
          <Ionicons name="school" size={16} color="#FFF" />
          <Text style={styles.levelBadgeText}>{userLevel} Level</Text>
        </View>
        
        <Text style={styles.levelDescription}>{getLevelDescription()}</Text>
        
        {fileName && (
          <View style={styles.fileInfo}>
            <Ionicons name="document-text" size={16} color="#4E9F3D" />
            <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
          </View>
        )}
      </View>

      {/* Summary Content */}
      <ScrollView style={styles.content}>
        {summary ? (
          <View style={styles.summaryCard}>
            <Markdown style={getMarkdownStyles(userLevel)}>{summary.toString()}</Markdown>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="document-text-outline" size={48} color="#E9ECEF" />
            <Text style={styles.placeholderText}>No summary generated</Text>
          </View>
        )}
      </ScrollView>

      {/* Download Button */}
      {summary && (
        <TouchableOpacity 
          style={[styles.downloadButton, { backgroundColor: getLevelColor() }]}
          onPress={downloadPDF}
        >
          <Ionicons name="download" size={20} color="#FFF" />
          <Text style={styles.downloadButtonText}>Download {userLevel} Summary</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const getMarkdownStyles = (level: string) => {
  const baseSize = level === "Basic" ? 16 : level === "Intermediate" ? 15 : 14;
  
  return {
    body: { 
      fontSize: baseSize, 
      lineHeight: level === "Basic" ? 26 : level === "Intermediate" ? 24 : 22,
      color: '#2D3748'
    },
    heading1: {
      fontSize: level === "Basic" ? 22 : level === "Intermediate" ? 24 : 26,
      fontWeight: '700',
      color: '#1A365D',
      marginVertical: 16
    },
    heading2: {
      fontSize: level === "Basic" ? 18 : level === "Intermediate" ? 20 : 22,
      fontWeight: '600',
      color: '#2C5282',
      marginVertical: 12
    },
    heading3: {
      fontSize: level === "Basic" ? 16 : level === "Intermediate" ? 18 : 20,
      fontWeight: '600',
      color: '#3182CE',
      marginVertical: 8
    },
    strong: { 
      fontWeight: '600', 
      color: '#1A365D' 
    },
    paragraph: {
      marginBottom: level === "Basic" ? 20 : level === "Intermediate" ? 16 : 14
    },
    bullet_list: {
      marginBottom: 16
    },
    ordered_list: {
      marginBottom: 16
    },
    list_item: {
      marginBottom: level === "Basic" ? 12 : 8
    }
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A365D',
    textAlign: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 8,
  },
  levelBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  levelDescription: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#EDF7ED',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  fileName: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4E9F3D',
    flex: 1,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderText: {
    fontSize: 16,
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 10,
    margin: 24,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  downloadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});