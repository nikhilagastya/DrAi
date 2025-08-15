import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { TextInput, Button, Card, Text, ActivityIndicator, Chip } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, FieldDoctor } from '../../lib/supabase'

interface ChatMessage {
  id: string
  message: string
  role: 'user' | 'assistant'
  timestamp: string
}

interface VitalData {
  weight?: number
  height?: number
  systolic_bp?: number
  diastolic_bp?: number
  heart_rate?: number
  temperature?: number
  blood_sugar?: number
  oxygen_saturation?: number
  symptoms?: string
  patient_name?: string
  patient_age?: number
  patient_gender?: string
}

const AIChatRoomScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const params = useLocalSearchParams<{ vitals?: string }>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [vitalData, setVitalData] = useState<VitalData | null>(null)
  const scrollViewRef = useRef<ScrollView>(null)

  const doctor = userProfile as FieldDoctor

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

      // Create initial context message with vital data
      const contextMessage = createContextMessage(vitals)
      
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        message: `Hello Dr. ${doctor?.name}! I'm your AI diagnostic assistant. I've received the patient's vital signs and symptoms. Let me analyze this data and provide diagnostic insights.

${contextMessage}

What specific aspects would you like me to focus on for this diagnosis?`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      }

      setMessages([welcomeMessage])
    } catch (error) {
      console.error('Error initializing chat:', error)
      Alert.alert('Error', 'Failed to initialize AI chat room')
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
    if (!inputText.trim() || loading) return

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      message: inputText.trim(),
      role: 'user',
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setLoading(true)

    try {
      // Generate AI response based on context and user input
      const aiResponse = await generateDiagnosticResponse(userMessage.message, vitalData)

      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        message: aiResponse,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev, aiMessage])

    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert('Error', 'Failed to get AI response. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateDiagnosticResponse = async (userMessage: string, vitals: VitalData | null): Promise<string> => {
    // This is a mock AI response. In a real implementation, you would integrate with an AI service like OpenAI
    const lowerMessage = userMessage.toLowerCase()
    
    if (lowerMessage.includes('diagnosis') || lowerMessage.includes('what') || lowerMessage.includes('condition')) {
      let response = "Based on the vital signs and symptoms provided:\n\n"
      
      if (vitals) {
        const findings = []
        
        if (vitals.systolic_bp && vitals.systolic_bp > 140) {
          findings.push("• Elevated blood pressure suggests hypertension")
        }
        
        if (vitals.temperature && vitals.temperature > 37.5) {
          findings.push("• Fever indicates possible infection or inflammatory process")
        }
        
        if (vitals.heart_rate && vitals.heart_rate > 100) {
          findings.push("• Tachycardia may be related to fever, pain, or cardiovascular issues")
        }
        
        if (vitals.blood_sugar && vitals.blood_sugar > 180) {
          findings.push("• Hyperglycemia suggests diabetes management issues")
        }
        
        if (findings.length > 0) {
          response += "**Key Findings:**\n" + findings.join("\n") + "\n\n"
        }
        
        response += "**Differential Diagnosis:**\n"
        
        if (vitals.temperature && vitals.temperature > 37.5) {
          response += "• Viral or bacterial infection\n• Inflammatory condition\n"
        }
        
        if (vitals.systolic_bp && vitals.systolic_bp > 140) {
          response += "• Primary hypertension\n• Secondary hypertension\n"
        }
        
        response += "\n**Recommendations:**\n"
        response += "• Complete physical examination\n"
        response += "• Consider additional diagnostic tests based on symptoms\n"
        response += "• Monitor vital signs closely\n"
        response += "• Patient education on condition management\n"
      } else {
        response += "Please provide patient vital signs and symptoms for accurate diagnostic assessment."
      }
      
      return response
    }
    
    if (lowerMessage.includes('treatment') || lowerMessage.includes('medication') || lowerMessage.includes('therapy')) {
      return "**Treatment Considerations:**\n\n• Always follow evidence-based treatment guidelines\n• Consider patient's medical history and allergies\n• Start with conservative management when appropriate\n• Monitor for treatment response and side effects\n• Provide clear patient education\n• Schedule appropriate follow-up\n\n**Note:** Treatment decisions should always be based on complete clinical assessment and your professional judgment."
    }
    
    if (lowerMessage.includes('test') || lowerMessage.includes('lab') || lowerMessage.includes('investigation')) {
      let response = "**Suggested Diagnostic Tests:**\n\n"
      
      if (vitals?.temperature && vitals.temperature > 37.5) {
        response += "• Complete Blood Count (CBC)\n• Blood cultures\n• Inflammatory markers (ESR, CRP)\n"
      }
      
      if (vitals?.systolic_bp && vitals.systolic_bp > 140) {
        response += "• Basic metabolic panel\n• Lipid profile\n• Urinalysis\n• ECG\n"
      }
      
      if (vitals?.blood_sugar && vitals.blood_sugar > 180) {
        response += "• HbA1c\n• Fasting glucose\n• Kidney function tests\n"
      }
      
      response += "\n**Additional considerations based on symptoms and clinical presentation.**"
      
      return response
    }
    
    return "I'm here to assist with diagnostic insights based on the patient's vital signs and symptoms. You can ask me about:\n\n• Possible diagnoses\n• Treatment recommendations\n• Diagnostic tests to consider\n• Risk factors and complications\n• Patient education points\n\nWhat specific aspect would you like to explore?"
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
        <Text style={styles.vitalChipsTitle}>Patient Vitals:</Text>
        <View style={styles.vitalChips}>
          {chips}
        </View>
      </View>
    ) : null
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderVitalChips()}
        
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.role === 'user' ? styles.userMessage : styles.aiMessage
              ]}
            >
              <Card style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.aiBubble
              ]}>
                <Card.Content style={styles.messageContent}>
                  <Text style={[
                    styles.messageText,
                    message.role === 'user' ? styles.userText : styles.aiText
                  ]}>
                    {message.message}
                  </Text>
                  <Text style={[
                    styles.messageTime,
                    message.role === 'user' ? styles.userTime : styles.aiTime
                  ]}>
                    {new Date(message.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </Card.Content>
              </Card>
            </View>
          ))}
          
          {loading && (
            <View style={styles.loadingMessage}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.typingText}>AI is analyzing...</Text>
            </View>
          )}
        </ScrollView>

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
    backgroundColor: '#E3F2FD',
  },
  alertChip: {
    backgroundColor: '#FFEBEE',
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
    backgroundColor: '#4CAF50',
  },
  sendButtonContent: {
    width: 50,
    height: 50,
  },
})

export default AIChatRoomScreen

