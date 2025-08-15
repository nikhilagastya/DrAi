import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { TextInput, Button, Card, Text, ActivityIndicator } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, ChatMessage, Patient } from '../../lib/supabase'

interface ChatBubbleProps {
  message: ChatMessage
  isUser: boolean
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isUser }) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.aiMessage]}>
      <Card style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Card.Content style={styles.messageContent}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {message.message}
          </Text>
          <Text style={[styles.messageTime, isUser ? styles.userTime : styles.aiTime]}>
            {formatTime(message.timestamp)}
          </Text>
        </Card.Content>
      </Card>
    </View>
  )
}

const PatientChatScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string>('')
  const scrollViewRef = useRef<ScrollView>(null)

  const patient = userProfile as Patient

  useEffect(() => {
    initializeChat()
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  const initializeChat = async () => {
    if (!patient) return

    try {
      // Generate a new session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setSessionId(newSessionId)

      // Load recent messages if any
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('patient_id', patient.id)
        .order('timestamp', { ascending: true })
        .limit(50)

      if (error) {
        console.error('Error loading messages:', error)
      } else if (data && data.length > 0) {
        setMessages(data)
      } else {
        // Send welcome message
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          patient_id: patient.id,
          session_id: newSessionId,
          message: `Hello ${patient.name}! I'm your AI health assistant. I can help you with general health questions, medication reminders, and wellness tips. How can I assist you today?`,
          role: 'ai',
          timestamp: new Date().toISOString(),
        }
        setMessages([welcomeMessage])
      }
    } catch (error) {
      console.error('Error initializing chat:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }

  const sendMessage = async () => {
    if (!inputText.trim() || loading || !patient) return

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      patient_id: patient.id,
      session_id: sessionId,
      message: inputText.trim(),
      role: 'user',
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setLoading(true)

    try {
      // Save user message to database
      const { error: userError } = await supabase
        .from('chat_messages')
        .insert(userMessage)

      if (userError) {
        console.error('Error saving user message:', userError)
      }

      // Simulate AI response (replace with actual AI integration)
      const aiResponse = await generateAIResponse(userMessage.message)

      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        patient_id: patient.id,
        session_id: sessionId,
        message: aiResponse,
        role: 'ai',
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev, aiMessage])

      // Save AI message to database
      const { error: aiError } = await supabase
        .from('chat_messages')
        .insert(aiMessage)

      if (aiError) {
        console.error('Error saving AI message:', aiError)
      }

    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert('Error', 'Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // This is a simple mock response. In a real app, you would integrate with an AI service
    const lowerMessage = userMessage.toLowerCase()
    
    if (lowerMessage.includes('pain') || lowerMessage.includes('hurt')) {
      return "I understand you're experiencing pain. While I can provide general information, it's important to consult with a healthcare professional for proper evaluation and treatment. In the meantime, you might consider rest, applying ice or heat as appropriate, and over-the-counter pain relievers if suitable for you. Would you like me to help you schedule an appointment with a doctor?"
    }
    
    if (lowerMessage.includes('medication') || lowerMessage.includes('medicine')) {
      return "For medication-related questions, I recommend consulting with your doctor or pharmacist for personalized advice. They can provide guidance on dosages, interactions, and side effects specific to your situation. Is there a general medication topic I can help you understand better?"
    }
    
    if (lowerMessage.includes('appointment') || lowerMessage.includes('doctor')) {
      return "I can help you with general information about preparing for doctor visits. It's good to write down your symptoms, questions, and current medications beforehand. Would you like tips on what to discuss with your doctor?"
    }
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! I'm here to help with your health-related questions. Feel free to ask me about symptoms, general health advice, or if you need help preparing for a doctor's visit."
    }
    
    return "Thank you for your message. While I can provide general health information, please remember that I'm not a substitute for professional medical advice. For specific health concerns, it's always best to consult with a healthcare provider. Is there a general health topic I can help you with?"
  }

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Initializing chat...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              isUser={message.role === 'user'}
            />
          ))}
          {loading && (
            <View style={styles.loadingMessage}>
              <ActivityIndicator size="small" color="#2196F3" />
              <Text style={styles.typingText}>AI is typing...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            multiline
            maxLength={500}
            mode="outlined"
            disabled={loading}
          />
          <Button
            mode="contained"
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
            style={styles.sendButton}
            contentStyle={styles.sendButtonContent}
          >
            <MaterialIcons name="send" size={20} color="white" />
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#2196F3',
  },
  aiBubble: {
    backgroundColor: '#ffffff',
  },
  messageContent: {
    padding: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: 'white',
  },
  aiText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  aiTime: {
    color: '#666',
  },
  loadingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  typingText: {
    marginLeft: 8,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    marginRight: 12,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 25,
  },
  sendButtonContent: {
    width: 50,
    height: 50,
  },
})

export default PatientChatScreen

