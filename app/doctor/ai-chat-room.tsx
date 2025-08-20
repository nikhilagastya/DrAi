import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native'
import { Text, Button, ActivityIndicator } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, FieldDoctor, ChatMessage } from '../../lib/supabase'
import CleanTextInput from '~/components/input/cleanTextInput'

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
  observations?: string
  patient_name?: string
  patient_age?: number
  patient_gender?: string
  patient_id?: string;
  visit_id?: string;
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
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
          {message.message}
        </Text>
        <Text style={[styles.messageTime, isUser ? styles.userTime : styles.aiTime]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  )
}

const DoctorAIChatRoomScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams<{ vitals?: string }>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [vitalData, setVitalData] = useState<VitalData | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const scrollViewRef = useRef<ScrollView>(null)

  const doctor = userProfile as FieldDoctor

  // Generate a unique session ID for doctor-patient consultation
  const generateSessionId = (patientId?: string): string => {
    const timestamp = Date.now()
    const randomPart = Math.random().toString(36).substring(2, 15)
    const pid = patientId || 'unknown'
    return `doctor_session_${doctor?.id}_${pid}_${timestamp}_${randomPart}`
  }

  useEffect(() => {
    initializeChat()
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

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
    setLoading(true)
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
        // Poll for the AI response with multiple attempts
        let attempts = 0
        const maxAttempts = 5
        const pollInterval = 1500 // 1.5 seconds between attempts

        const pollForResponse = async () => {
          attempts++
          console.log(`Polling for AI response, attempt ${attempts}`)
          
          try {
            const { data: chatData, error } = await supabase
              .from('chat_messages')
              .select('*')
              .eq('session_id', sessionId)
              .order('timestamp', { ascending: true })

            if (error) {
              console.error('Error polling chat history:', error)
              return
            }

            // Check if we have AI response (more than just the context message)
            const aiMessages = chatData?.filter(msg => msg.role === 'ai') || []
            
            if (aiMessages.length > 0) {
              console.log('AI response found, updating messages')
              setMessages(chatData || [])
              setLoading(false)
              return
            }

            // Continue polling if no AI response yet and we haven't exceeded max attempts
            if (attempts < maxAttempts) {
              setTimeout(pollForResponse, pollInterval)
            } else {
              console.log('Max polling attempts reached, stopping')
              setLoading(false)
            }
          } catch (pollError) {
            console.error('Error during polling:', pollError)
            setLoading(false)
          }
        }

        // Start polling after initial delay
        setTimeout(pollForResponse, pollInterval)
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
      setMessages(prev => [...prev, welcomeMessage])
      setLoading(false)
    }
  }

  const loadChatHistory = async (sessionId?: string) => {
    if (!doctor) return

    const targetSessionId = sessionId || currentSessionId
    if (!targetSessionId) return

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', targetSessionId)
        .order('timestamp', { ascending: true })

      if (error) {
        console.error('Error loading doctor chat history:', error)
      } else {
        setMessages(data || [])
        console.log('Loaded chat history:', data?.length, 'messages')
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

    if (vitals.observations) {
      context += `\n**Clinical Observations:**\n${vitals.observations}\n`
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
          visitId: vitalData?.visit_id || null,
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
        // Poll for the AI response with multiple attempts
        let attempts = 0
        const maxAttempts = 5
        const pollInterval = 1500

        const pollForResponse = async () => {
          attempts++
          console.log(`Polling for AI response, attempt ${attempts}`)
          
          try {
            const { data: chatData, error } = await supabase
              .from('chat_messages')
              .select('*')
              .eq('session_id', currentSessionId)
              .order('timestamp', { ascending: true })

            if (error) {
              console.error('Error polling chat history:', error)
              return
            }

            // Find the latest AI message that's newer than our user message
            const latestMessages = chatData || []
            const userMessageIndex = latestMessages.findIndex(msg => msg.message === userMessage && msg.role === 'user')
            const hasNewAiResponse = latestMessages.some((msg, index) => 
              msg.role === 'ai' && index > userMessageIndex
            )
            
            if (hasNewAiResponse) {
              console.log('New AI response found, updating messages')
              setMessages(latestMessages)
              setLoading(false)
              return
            }

            // Continue polling if no new AI response yet
            if (attempts < maxAttempts) {
              setTimeout(pollForResponse, pollInterval)
            } else {
              console.log('Max polling attempts reached, stopping')
              setLoading(false)
            }
          } catch (pollError) {
            console.error('Error during polling:', pollError)
            setLoading(false)
          }
        }

        // Start polling after initial delay
        setTimeout(pollForResponse, pollInterval)
      } else {
        throw new Error(data.error || 'Failed to get AI response')
      }
    } catch (error) {
      console.error('Error sending doctor message:', error)
      Alert.alert('Error', 'Failed to send message. Please try again.')

      // Remove the temporary user message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')))
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (!loading && inputText.trim()) {
      sendMessage()
    }
  }

  const startNewSession = () => {
    const newSessionId = generateSessionId(vitalData?.patient_id)
    setCurrentSessionId(newSessionId)
    setMessages([])
    Alert.alert('New Session', 'Started a new diagnostic consultation session!')
    console.log('New doctor session started:', newSessionId)
  }

  const renderVitalChips = () => {
    if (!vitalData) return null

    const vitals = []
    
    if (vitalData.systolic_bp && vitalData.diastolic_bp) {
      const isHigh = vitalData.systolic_bp > 140 || vitalData.diastolic_bp > 90
      vitals.push({
        label: `BP: ${vitalData.systolic_bp}/${vitalData.diastolic_bp}`,
        alert: isHigh
      })
    }
    
    if (vitalData.temperature) {
      const isHigh = vitalData.temperature > 37.5
      vitals.push({
        label: `Temp: ${vitalData.temperature}°C`,
        alert: isHigh
      })
    }
    
    if (vitalData.heart_rate) {
      const isAbnormal = vitalData.heart_rate > 100 || vitalData.heart_rate < 60
      vitals.push({
        label: `HR: ${vitalData.heart_rate}`,
        alert: isAbnormal
      })
    }

    if (vitalData.oxygen_saturation) {
      const isLow = vitalData.oxygen_saturation < 95
      vitals.push({
        label: `O₂: ${vitalData.oxygen_saturation}%`,
        alert: isLow
      })
    }

    return vitals.length > 0 ? (
      <View style={styles.vitalChipsContainer}>
        <View style={styles.patientInfo}>
          <MaterialIcons name="person" size={16} color="#4285F4" />
          <Text style={styles.patientName}>
            {vitalData.patient_name || 'Unknown Patient'}
          </Text>
        </View>
        <View style={styles.vitalChips}>
          {vitals.map((vital, idx) => (
            <View
              key={idx}
              style={[
                styles.vitalChip,
                vital.alert && styles.alertChip
              ]}
            >
              <Text style={[styles.vitalText, vital.alert && styles.alertText]}>
                {vital.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    ) : null
  }

  const suggestedQuestions = [
    "What's the most likely diagnosis?",
    "What tests should I order?",
    "Any red flags to watch for?",
    "Treatment recommendations?",
    "Follow-up care needed?",
  ]

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Initializing diagnostic session...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333333" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <MaterialIcons name="psychology" size={24} color="#4285F4" />
            <Text style={styles.headerText}>AI Diagnostic Assistant</Text>
          </View>
          <TouchableOpacity 
            style={styles.newSessionButton}
            onPress={startNewSession}
          >
            <MaterialIcons name="add" size={24} color="#4285F4" />
          </TouchableOpacity>
        </View>

        {/* Vital Signs Chips */}
        {renderVitalChips()}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && !loading ? (
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeIcon}>
                <MaterialIcons name="psychology" size={48} color="#4285F4" />
              </View>
              <Text style={styles.welcomeText}>AI Diagnostic Assistant Ready</Text>
              <Text style={styles.welcomeSubText}>
                I can help you analyze patient data, suggest diagnoses, recommend tests, and provide treatment insights.
              </Text>

              <View style={styles.suggestedContainer}>
                <Text style={styles.suggestedTitle}>Quick questions:</Text>
                <View style={styles.suggestedGrid}>
                  {suggestedQuestions.map((question, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestedChip}
                      onPress={() => setInputText(question)}
                    >
                      <Text style={styles.suggestedText}>{question}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : messages.length === 0 && loading ? (
            <View style={styles.initialLoadingContainer}>
              <ActivityIndicator size="large" color="#4285F4" />
              <Text style={styles.initialLoadingText}>Sending patient data to AI...</Text>
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
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#4285F4" />
                <Text style={styles.typingText}>AI is analyzing patient data...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <CleanTextInput
              label=""
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about diagnosis, treatment, or tests..."
              multiline
              numberOfLines={3}
              style={styles.textInput}
              onSubmitEditing={handleSubmit}
              blurOnSubmit={false}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
              style={[
                styles.sendButton,
                (!inputText.trim() || loading) && styles.sendButtonDisabled
              ]}
            >
              <MaterialIcons 
                name="send" 
                size={24} 
                color={(!inputText.trim() || loading) ? "#CCCCCC" : "#FFFFFF"} 
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.inputHint}>Press Enter to send • Shift+Enter for new line</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 8,
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  newSessionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalChipsContainer: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 6,
  },
  vitalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vitalChip: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  alertChip: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFB3B3',
  },
  vitalText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4285F4',
  },
  alertText: {
    color: '#D32F2F',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  initialLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  initialLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  welcomeSubText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  suggestedContainer: {
    width: '100%',
    alignItems: 'center',
  },
  suggestedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestedChip: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  suggestedText: {
    fontSize: 12,
    color: '#4285F4',
    fontWeight: '500',
  },
  messageContainer: {
    marginVertical: 6,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: '#4285F4',
  },
  aiBubble: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#333333',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 6,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  aiTime: {
    color: '#666666',
  },
  loadingMessage: {
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  typingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666666',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    marginBottom: -25,
    minHeight:60,
    maxHeight: 120,
    marginTop:10,
   
  },
  inputHint: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#E8E8E8',
    elevation: 0,
    shadowOpacity: 0,
  },
})

export default DoctorAIChatRoomScreen