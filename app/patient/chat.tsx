import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Animated, TouchableOpacity, Dimensions } from 'react-native'
import { TextInput, Button, Card, Text, Chip, ActivityIndicator, Divider, List } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, ChatMessage, Patient } from '../../lib/supabase'
import { PanGestureHandler } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8

interface ChatBubbleProps {
  message: ChatMessage
  isUser: boolean
}

interface SessionInfo {
  session_id: string
  created_at: string
  message_count: number
  last_message: string
  last_message_time: string
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
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const drawerTranslateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current

  const patient = userProfile as Patient

  // Generate a unique session ID
  const generateSessionId = (): string => {
    const timestamp = Date.now()
    const randomPart = Math.random().toString(36).substring(2, 15)
    return `session_${patient?.id}_${timestamp}_${randomPart}`
  }

  // Start a new session
  const startNewSession = () => {
    const newSessionId = generateSessionId()
    setCurrentSessionId(newSessionId)
    setMessages([]) // Clear current messages
    console.log('New session started:', newSessionId)
    return newSessionId
  }

  // Load all sessions for the patient
  const loadSessions = async () => {
    if (!patient) return

    setSessionsLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('session_id, timestamp, message, role')
        .eq('patient_id', patient.id)
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('Error loading sessions:', error)
        return
      }

      // Group messages by session_id and create session info
      const sessionMap = new Map<string, SessionInfo>()

      data?.forEach((message) => {
        if (!message.session_id) return

        if (!sessionMap.has(message.session_id)) {
          sessionMap.set(message.session_id, {
            session_id: message.session_id,
            created_at: message.timestamp,
            message_count: 0,
            last_message: message.message,
            last_message_time: message.timestamp,
          })
        }

        const session = sessionMap.get(message.session_id)!
        session.message_count++

        // Update last message if this message is more recent
        if (new Date(message.timestamp) > new Date(session.last_message_time)) {
          session.last_message = message.message
          session.last_message_time = message.timestamp
        }

        // Update created_at if this message is older (to get the actual session start)
        if (new Date(message.timestamp) < new Date(session.created_at)) {
          session.created_at = message.timestamp
        }
      })

      const sessionsArray = Array.from(sessionMap.values())
        .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime())

      setSessions(sessionsArray)
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setSessionsLoading(false)
    }
  }

  useEffect(() => {
    // Generate session ID when component mounts
    const sessionId = generateSessionId()
    setCurrentSessionId(sessionId)
    console.log('Initial session ID:', sessionId)

    loadChatHistory()
    loadSessions()
  }, [])

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true })
    }
  }, [messages])

  useEffect(() => {
    // Load chat history when session changes
    if (currentSessionId) {
      loadChatHistory()
    }
  }, [currentSessionId])

  const loadChatHistory = async () => {
    if (!patient || !currentSessionId) return

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('session_id', currentSessionId)
        .order('timestamp', { ascending: true })

      if (error) {
        console.error('Error loading chat history:', error)
      } else {
        setMessages(data || [])
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputText.trim() || !patient || loading) return

    const userMessage = inputText.trim()
    setInputText('')
    setLoading(true)

    try {
      // Add user message to local state immediately
      const tempUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        patient_id: patient.id,
        session_id: currentSessionId,
        role: 'user',
        message: userMessage,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, tempUserMessage])

      // Get conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        message: msg.message,
        timestamp: msg.timestamp,
      }))

      // Call Gemini chat function with session ID
      console.log('Sending message with session ID:', currentSessionId)
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: patient.id,
          message: userMessage,
          conversationHistory,
          sessionId: currentSessionId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      console.log(data)
      if (data.success) {
        // Reload chat history and sessions
        await loadChatHistory()
        await loadSessions()
      } else {
        throw new Error(data.error || 'Failed to get AI response')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert('Error', 'Failed to send message. Please try again.')

      // Remove the temporary user message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')))
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all chat messages? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('chat_messages')
                .delete()
                .eq('patient_id', patient?.id)

              if (error) {
                console.error('Error clearing chat:', error)
                Alert.alert('Error', 'Failed to clear chat history')
              } else {
                setMessages([])
                setSessions([])
                startNewSession()
              }
            } catch (error) {
              console.error('Error clearing chat:', error)
              Alert.alert('Error', 'Failed to clear chat history')
            }
          },
        },
      ]
    )
  }

  const handleNewSession = () => {
    startNewSession()
    setDrawerVisible(false)
    Alert.alert('New Session', 'Started a new conversation session!')
  }

  const switchToSession = (sessionId: string) => {
    setCurrentSessionId(sessionId)
    setDrawerVisible(false)
    console.log('Switched to session:', sessionId)
  }

  const toggleDrawer = () => {
    setDrawerVisible(!drawerVisible)
    Animated.timing(drawerTranslateX, {
      toValue: drawerVisible ? -DRAWER_WIDTH : 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }

  const handlePanGesture = (event: any) => {
    const { translationX } = event.nativeEvent

    if (translationX > 50 && !drawerVisible) {
      // Swipe right to open drawer
      setDrawerVisible(true)
      Animated.timing(drawerTranslateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else if (translationX < -50 && drawerVisible) {
      // Swipe left to close drawer
      setDrawerVisible(false)
      Animated.timing(drawerTranslateX, {
        toValue: -DRAWER_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start()
    }
  }

  const formatSessionDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const suggestedQuestions = [
    "How are my recent vital signs?",
    "What should I know about my last visit?",
    "Are there any patterns in my health data?",
    "What questions should I ask my doctor?",
    "Help me understand my medications",
  ]

  const handleSuggestedQuestion = (question: string) => {
    setInputText(question)
  }

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading chat history...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <PanGestureHandler onGestureEvent={handlePanGesture}>
        <Animated.View style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Chat Header */}
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
                  <MaterialIcons name="menu" size={24} color="#2196F3" />
                </TouchableOpacity>
                <MaterialIcons name="smart-toy" size={24} color="#2196F3" />
                <Text style={styles.headerText}>AI Health Assistant</Text>
              </View>
              <View style={styles.headerActions}>
                <Button mode="text" compact onPress={handleNewSession} style={styles.headerButton}>
                  New Session
                </Button>
                <Button mode="text" compact onPress={clearChat}>
                  Clear
                </Button>
              </View>
            </View>

            {/* Session Info */}
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionText}>
                Session: {currentSessionId.split('_').pop()?.substring(0, 8)}...
              </Text>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
              {messages.length === 0 ? (
                <View style={styles.welcomeContainer}>
                  <MaterialIcons name="chat" size={64} color="#ccc" />
                  <Text style={styles.welcomeText}>Welcome to your AI Health Assistant!</Text>
                  <Text style={styles.welcomeText}>
                    I can help you understand your health data, answer questions about your visits,
                    and provide insights based on your medical history.
                  </Text>

                  <View style={styles.suggestedContainer}>
                    <Text style={styles.suggestedText}>Try asking:</Text>
                    {suggestedQuestions.map((question, index) => (
                      <Chip
                        key={index}
                        mode="outlined"
                        onPress={() => handleSuggestedQuestion(question)}
                        style={styles.suggestedChip}
                      >
                        {question}
                      </Chip>
                    ))}
                  </View>
                </View>
              ) : (
                messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    message={message}
                    isUser={message.role === 'user'}
                  />
                ))
              )}

              {loading && (
                <View style={styles.typingIndicator}>
                  <Card style={styles.typingBubble}>
                    <Card.Content style={styles.typingContent}>
                      <ActivityIndicator size="small" color="#2196F3" />
                      <Text style={styles.typingText}>AI is thinking...</Text>
                    </Card.Content>
                  </Card>
                </View>
              )}
            </ScrollView>

            {/* Input Area */}
            <View style={styles.inputContainer}>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask about your health..."
                mode="outlined"
                multiline
                maxLength={500}
                style={styles.textInput}
                right={
                  <TextInput.Icon
                    icon="send"
                    onPress={sendMessage}
                    disabled={!inputText.trim() || loading}
                  />
                }
              />
            </View>
          </KeyboardAvoidingView>

          {/* Session Drawer */}
          <Animated.View
            style={[
              styles.drawer,
              {
                transform: [{ translateX: drawerTranslateX }],
              }
            ]}
          >
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerText}>Chat Sessions</Text>
              <TouchableOpacity onPress={toggleDrawer}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Divider />

            <TouchableOpacity style={styles.newSessionButton} onPress={handleNewSession}>
              <MaterialIcons name="add" size={20} color="#2196F3" />
              <Text style={styles.newSessionText}>Start New Session</Text>
            </TouchableOpacity>

            <Divider />

            <ScrollView style={styles.sessionsList}>
              {sessionsLoading ? (
                <View style={styles.sessionsLoading}>
                  <ActivityIndicator size="small" color="#2196F3" />
                  <Text style={styles.loadingText}>Loading sessions...</Text>
                </View>
              ) : sessions.length === 0 ? (
                <View style={styles.noSessions}>
                  <Text style={styles.noSessionsText}>No previous sessions</Text>
                </View>
              ) : (
                sessions.map((session) => (
                  <TouchableOpacity
                    key={session.session_id}
                    style={[
                      styles.sessionItem,
                      currentSessionId === session.session_id && styles.activeSession
                    ]}
                    onPress={() => switchToSession(session.session_id)}
                  >
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionDate}>
                        {formatSessionDate(session.created_at)}
                      </Text>
                      <Text style={styles.sessionPreview} numberOfLines={2}>
                        {session.last_message}
                      </Text>
                      <Text style={styles.sessionMeta}>
                        {session.message_count} messages
                      </Text>
                    </View>
                    {currentSessionId === session.session_id && (
                      <MaterialIcons name="check-circle" size={20} color="#2196F3" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Animated.View>

          {/* Drawer Overlay */}
          {drawerVisible && (
            <TouchableOpacity
              style={styles.overlay}
              onPress={toggleDrawer}
              activeOpacity={1}
            />
          )}
        </Animated.View>
      </PanGestureHandler>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: 0
  },
  keyboardAvoidingView: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    marginRight: 12,
    padding: 4,
  },
  headerText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginRight: 8,
  },
  sessionInfo: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  sessionText: {
    fontSize: 12,
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },

  welcomeText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  suggestedContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  suggestedText: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  suggestedChip: {
    marginVertical: 4,
    marginHorizontal: 8,
  },
  messageContainer: {
    marginVertical: 4,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#2196F3',
  },
  aiBubble: {
    backgroundColor: '#fff',
  },
  messageContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  messageText: {
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
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
    color: '#999',
  },
  typingIndicator: {
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  typingBubble: {
    backgroundColor: '#fff',
    elevation: 1,
  },
  typingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  typingText: {
    marginLeft: 8,
    color: '#666',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    maxHeight: 100,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  drawerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  newSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f8ff',
  },
  newSessionText: {
    marginLeft: 8,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  sessionsList: {
    flex: 1,
  },
  sessionsLoading: {
    padding: 20,
    alignItems: 'center',
  },
  noSessions: {
    padding: 20,
    alignItems: 'center',
  },
  noSessionsText: {
    color: '#666',
    fontStyle: 'italic',
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activeSession: {
    backgroundColor: '#e3f2fd',
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  sessionPreview: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sessionMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
})

export default PatientChatScreen