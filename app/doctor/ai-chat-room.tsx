import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Animated, TouchableOpacity, Dimensions } from 'react-native'
import { TextInput, Button, Card, Text, ActivityIndicator, Chip, Divider } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, FieldDoctor, ChatMessage } from '../../lib/supabase'
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8

interface VitalData {
  weight?: number
  height?: number
  systolic_bp?: number
  diastolic_bp?: number
  heart_rate?: number
  temperature?: number
  blood_sugar?: number
  oxygen_saturation?: number
  respiratory_rate?: number
  symptoms?: string
  patient_name?: string
  patient_age?: number
  patient_gender?: string
  patient_id?: string
}

interface SessionInfo {
  session_id: string
  created_at: string
  message_count: number
  last_message: string
  last_message_time: string
  patient_name?: string
}

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

const DoctorAIChatRoomScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const params = useLocalSearchParams<{ vitals?: string }>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [vitalData, setVitalData] = useState<VitalData | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const drawerTranslateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current

  const doctor = userProfile as FieldDoctor

  // Generate a unique session ID for doctor-patient consultation
  const generateSessionId = (patientId?: string): string => {
    const timestamp = Date.now()
    const randomPart = Math.random().toString(36).substring(2, 15)
    const pid = patientId || 'unknown'
    return `doctor_session_${doctor?.id}_${pid}_${timestamp}_${randomPart}`
  }

  // Start a new session
  const startNewSession = () => {
    const newSessionId = generateSessionId(vitalData?.patient_id)
    setCurrentSessionId(newSessionId)
    setMessages([]) // Clear current messages
    console.log('New doctor session started:', newSessionId)
    return newSessionId
  }

  // Load all sessions for the doctor
  // const loadSessions = async () => {
  //   if (!doctor) return

  //   setSessionsLoading(true)
  //   try {
  //     const { data, error } = await supabase
  //       .from('chat_messages')
  //       .select(`
  //         session_id, 
  //         timestamp, 
  //         message, 
  //         role,
  //         patient_id,
  //         patients!inner(name)
  //       `)
  //       .eq('patient_id', vitalData?.patient_id)
  //       .order('timestamp', { ascending: false })

  //     if (error) {
  //       console.error('Error loading doctor sessions:', error)
  //       return
  //     }

  //     // Group messages by session_id and create session info
  //     const sessionMap = new Map<string, SessionInfo>()

  //     data?.forEach((message: any) => {
  //       if (!message.session_id) return

  //       if (!sessionMap.has(message.session_id)) {
  //         sessionMap.set(message.session_id, {
  //           session_id: message.session_id,
  //           created_at: message.timestamp,
  //           message_count: 0,
  //           last_message: message.message,
  //           last_message_time: message.timestamp,
  //           patient_name: message.patients?.name || 'Unknown Patient',
  //         })
  //       }

  //       const session = sessionMap.get(message.session_id)!
  //       session.message_count++

  //       // Update last message if this message is more recent
  //       if (new Date(message.timestamp) > new Date(session.last_message_time)) {
  //         session.last_message = message.message
  //         session.last_message_time = message.timestamp
  //       }

  //       // Update created_at if this message is older (to get the actual session start)
  //       if (new Date(message.timestamp) < new Date(session.created_at)) {
  //         session.created_at = message.timestamp
  //       }
  //     })

  //     const sessionsArray = Array.from(sessionMap.values())
  //       .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime())

  //     setSessions(sessionsArray)
  //   } catch (error) {
  //     console.error('Error loading doctor sessions:', error)
  //   } finally {
  //     setSessionsLoading(false)
  //   }
  // }

  useEffect(() => {
    initializeChat()
    
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  useEffect(() => {
    // Load chat history when session changes
    if (currentSessionId) {
      loadChatHistory()
    }
  }, [currentSessionId])

  const initializeChat = async () => {
    try {
      // Parse vital data from params if provided
      let vitals: VitalData | null = null
      if (params.vitals) {
        vitals = JSON.parse(decodeURIComponent(params.vitals))
        setVitalData(vitals)
      }

      // Generate session ID when component mounts
      const sessionId = generateSessionId(vitals?.patient_id)
      setCurrentSessionId(sessionId)
      console.log('Initial doctor session ID:', sessionId)

      // If we have vital data, send context to AI automatically
      if (vitals) {
        await sendContextToAI(vitals, sessionId)
      } else {
        // No vitals, show basic welcome message
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          patient_id: '',
          session_id: sessionId,
          role: 'ai',
          message: `Hello Dr. ${doctor?.name}! I'm your AI diagnostic assistant. Please provide patient information and vital signs for diagnostic assistance.`,
          timestamp: new Date().toISOString(),
        }
        setMessages([welcomeMessage])
      }
    } catch (error) {
      console.error('Error initializing doctor chat:', error)
      Alert.alert('Error', 'Failed to initialize AI chat room')
    } finally {
      setInitialLoading(false)
    }
  }

  const sendContextToAI = async (vitals: VitalData, sessionId: string) => {
    try {
      // Create context message
      const contextMessage = createContextMessage(vitals)
      const initialMessage = `Hello! I'm providing you with patient information for diagnostic consultation:

${contextMessage}

Please analyze this data and provide initial diagnostic insights, potential concerns, and recommendations for next steps.`

      // Add context message to local state
      const contextChatMessage: ChatMessage = {
        id: `context-${Date.now()}`,
        patient_id: vitals?.patient_id || '',
        session_id: sessionId,
        role: 'user',
        message: initialMessage,
        timestamp: new Date().toISOString(),
      }
      setMessages([contextChatMessage])

      // Send to AI
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctorId: doctor?.id,
          patientId: vitals?.patient_id || null,
          message: initialMessage,
          conversationHistory: [],
          sessionId: sessionId,
          vitalData: vitals,
          doctorProfile: {
            name: doctor?.name,
            specialization: doctor?.specialization,
            yearsOfExperience: doctor?.years_of_experience,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      console.log('AI context response:', data)
      
      if (data.success) {
        // Reload chat history to get AI response
        await loadChatHistory()
      } else {
        throw new Error(data.error || 'Failed to get AI response')
      }
    } catch (error) {
      console.error('Error sending context to AI:', error)
      // Fallback to welcome message if API fails
      const welcomeMessage: ChatMessage = {
        id: 'welcome-fallback',
        patient_id: vitals?.patient_id || '',
        session_id: sessionId,
        role: 'ai',
        message: `Hello Dr. ${doctor?.name}! I've received the patient data. How can I assist with the diagnosis?`,
        timestamp: new Date().toISOString(),
      }
      setMessages([welcomeMessage])
    }
  }

  const loadChatHistory = async () => {
    if (!doctor || !currentSessionId) return

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', currentSessionId)
        .order('timestamp', { ascending: true })

      if (error) {
        console.error('Error loading doctor chat history:', error)
      } else {
        setMessages(data || [])
      }
    } catch (error) {
      console.error('Error loading doctor chat history:', error)
    }
  }

  const createContextMessage = (vitals: VitalData | null): string => {
    if (!vitals) {
      return "No vital data provided. Please share the patient's symptoms and vital signs for accurate diagnosis."
    }

    let context = "**Patient Information:**\n"
    
    if (vitals.patient_name) context += `• Name: ${vitals.patient_name}\n`
    if (vitals.patient_age) context += `• Age: ${vitals.patient_age} years\n`
    if (vitals.patient_gender) context += `• Gender: ${vitals.patient_gender}\n`
    
    context += "\n**Vital Signs:**\n"
    
    if (vitals.weight) context += `• Weight: ${vitals.weight} kg\n`
    if (vitals.height) context += `• Height: ${vitals.height} cm\n`
    if (vitals.systolic_bp && vitals.diastolic_bp) {
      const bpStatus = vitals.systolic_bp > 140 || vitals.diastolic_bp > 90 ? " ⚠️ HIGH" : ""
      context += `• Blood Pressure: ${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg${bpStatus}\n`
    }
    if (vitals.heart_rate) {
      const hrStatus = vitals.heart_rate > 100 ? " ⚠️ HIGH" : vitals.heart_rate < 60 ? " ⚠️ LOW" : ""
      context += `• Heart Rate: ${vitals.heart_rate} bpm${hrStatus}\n`
    }
    if (vitals.temperature) {
      const tempStatus = vitals.temperature > 37.5 ? " ⚠️ FEVER" : ""
      context += `• Temperature: ${vitals.temperature}°C${tempStatus}\n`
    }
    if (vitals.blood_sugar) {
      const bsStatus = vitals.blood_sugar > 180 ? " ⚠️ HIGH" : vitals.blood_sugar < 70 ? " ⚠️ LOW" : ""
      context += `• Blood Sugar: ${vitals.blood_sugar} mg/dL${bsStatus}\n`
    }
    if (vitals.oxygen_saturation) {
      const o2Status = vitals.oxygen_saturation < 95 ? " ⚠️ LOW" : ""
      context += `• Oxygen Saturation: ${vitals.oxygen_saturation}%${o2Status}\n`
    }
    if (vitals.respiratory_rate) {
      context += `• Respiratory Rate: ${vitals.respiratory_rate} breaths/min\n`
    }
    
    if (vitals.symptoms) {
      context += `\n**Reported Symptoms:**\n${vitals.symptoms}\n`
    }

    return context
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }

  const sendMessage = async () => {
    if (!inputText.trim() || !doctor || loading) return

    const userMessage = inputText.trim()
    setInputText('')
    setLoading(true)

    try {
      // Add user message to local state immediately
      const tempUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        patient_id: vitalData?.patient_id || '',
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

      // Call AI chat function with doctor and patient context
      console.log('Sending doctor message with session ID:', currentSessionId)
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctorId: doctor.id,
          patientId: vitalData?.patient_id || null,
          message: userMessage,
          conversationHistory,
          sessionId: currentSessionId,
          vitalData: vitalData,
          doctorProfile: {
            name: doctor.name,
            specialization: doctor.specialization,
            yearsOfExperience: doctor.years_of_experience,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      console.log('Doctor AI response:', data)
      
      if (data.success) {
        // Reload chat history and sessions
        await loadChatHistory()
       
      } else {
        throw new Error(data.error || 'Failed to get AI response')
      }
    } catch (error) {
      console.error('Error sending doctor message:', error)
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
                .eq('session_id', currentSessionId)

              if (error) {
                console.error('Error clearing doctor chat:', error)
                Alert.alert('Error', 'Failed to clear chat history')
              } else {
                setMessages([])
                setSessions([])
                startNewSession()
              }
            } catch (error) {
              console.error('Error clearing doctor chat:', error)
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
    Alert.alert('New Session', 'Started a new diagnostic consultation session!')
  }

  const switchToSession = (sessionId: string) => {
    setCurrentSessionId(sessionId)
    setDrawerVisible(false)
    console.log('Switched to doctor session:', sessionId)
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

  const renderVitalChips = () => {
    if (!vitalData) return null

    const chips = []
    
    if (vitalData.systolic_bp && vitalData.diastolic_bp) {
      const isHigh = vitalData.systolic_bp > 140 || vitalData.diastolic_bp > 90
      chips.push(
        <Chip
          key="bp"
          mode="outlined"
          style={[styles.vitalChip, isHigh && styles.alertChip]}
          compact
        >
          BP: {vitalData.systolic_bp}/{vitalData.diastolic_bp}
        </Chip>
      )
    }
    
    if (vitalData.temperature) {
      const isHigh = vitalData.temperature > 37.5
      chips.push(
        <Chip
          key="temp"
          mode="outlined"
          style={[styles.vitalChip, isHigh && styles.alertChip]}
          compact
        >
          Temp: {vitalData.temperature}°C
        </Chip>
      )
    }
    
    if (vitalData.heart_rate) {
      const isAbnormal = vitalData.heart_rate > 100 || vitalData.heart_rate < 60
      chips.push(
        <Chip
          key="hr"
          mode="outlined"
          style={[styles.vitalChip, isAbnormal && styles.alertChip]}
          compact
        >
          HR: {vitalData.heart_rate}
        </Chip>
      )
    }

    return chips.length > 0 ? (
      <View style={styles.vitalChipsContainer}>
        <Text style={styles.vitalChipsTitle}>
          Patient: {vitalData.patient_name || 'Unknown'} | Vitals:
        </Text>
        <View style={styles.vitalChips}>
          {chips}
        </View>
      </View>
    ) : null
  }

  const suggestedQuestions = [
    "What's the most likely diagnosis based on these vitals?",
    "What additional tests should I consider?",
    "Are there any red flags I should be concerned about?",
    "What treatment options would you recommend?",
    "What should I monitor in follow-up visits?",
  ]

  const handleSuggestedQuestion = (question: string) => {
    setInputText(question)
  }

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Initializing diagnostic session...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <GestureHandlerRootView>
        <PanGestureHandler onGestureEvent={handlePanGesture}>
          <Animated.View style={{ flex: 1 }}>
            <KeyboardAvoidingView 
              style={styles.keyboardAvoidingView} 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerInfo}>
                  <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
                    <MaterialIcons name="menu" size={24} color="#4CAF50" />
                  </TouchableOpacity>
                  <MaterialIcons name="psychology" size={24} color="#4CAF50" />
                  <Text style={styles.headerText}>AI Diagnostic Assistant</Text>
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

              {/* Vital Signs Chips */}
              {renderVitalChips()}
              
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
                    <MaterialIcons name="psychology" size={64} color="#ccc" />
                    <Text style={styles.welcomeText}>AI Diagnostic Assistant Ready</Text>
                    <Text style={styles.welcomeSubText}>
                      I can help you analyze patient data, suggest diagnoses, recommend tests, and provide treatment insights.
                    </Text>

                    <View style={styles.suggestedContainer}>
                      <Text style={styles.suggestedText}>Quick questions:</Text>
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
                  <View style={styles.loadingMessage}>
                    <Card style={styles.typingBubble}>
                      <Card.Content style={styles.typingContent}>
                        <ActivityIndicator size="small" color="#4CAF50" />
                        <Text style={styles.typingText}>AI is analyzing patient data...</Text>
                      </Card.Content>
                    </Card>
                  </View>
                )}
              </ScrollView>

              {/* Input Area */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask about diagnosis, treatment, or tests..."
                  multiline
                  maxLength={500}
                  mode="outlined"
                  disabled={loading}
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
                <Text style={styles.drawerText}>Consultation Sessions</Text>
                <TouchableOpacity onPress={toggleDrawer}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <Divider />

              <TouchableOpacity style={styles.newSessionButton} onPress={handleNewSession}>
                <MaterialIcons name="add" size={20} color="#4CAF50" />
                <Text style={styles.newSessionText}>Start New Consultation</Text>
              </TouchableOpacity>

              <Divider />

              <ScrollView style={styles.sessionsList}>
                {sessionsLoading ? (
                  <View style={styles.sessionsLoading}>
                    <ActivityIndicator size="small" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading sessions...</Text>
                  </View>
                ) : sessions.length === 0 ? (
                  <View style={styles.noSessions}>
                    <Text style={styles.noSessionsText}>No previous consultations</Text>
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
                      <View style={styles.sessionItemContent}>
                        <Text style={styles.sessionDate}>
                          {formatSessionDate(session.created_at)}
                        </Text>
                        <Text style={styles.sessionPatient}>
                          Patient: {session.patient_name}
                        </Text>
                        <Text style={styles.sessionPreview} numberOfLines={2}>
                          {session.last_message}
                        </Text>
                        <Text style={styles.sessionMeta}>
                          {session.message_count} messages
                        </Text>
                      </View>
                      {currentSessionId === session.session_id && (
                        <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
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
      </GestureHandlerRootView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  vitalChipsContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  vitalChipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  vitalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vitalChip: {
    backgroundColor: '#E8F5E8',
  },
  alertChip: {
    backgroundColor: '#FFEBEE',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  welcomeSubText: {
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
    maxWidth: '85%',
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#4CAF50',
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
    backgroundColor: 'white',
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
    backgroundColor: '#E8F5E8',
  },
  newSessionText: {
    marginLeft: 8,
    color: '#4CAF50',
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
    backgroundColor: '#E8F5E8',
  },
  sessionItemContent: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  sessionPatient: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 2,
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
})

export default DoctorAIChatRoomScreen