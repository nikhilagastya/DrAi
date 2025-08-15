import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Card, Text } from 'react-native-paper'

interface ChatMessage {
  id: string
  message: string
  role: 'user' | 'assistant'
  timestamp: string
}

interface ChatBubbleProps {
  message: ChatMessage
  isUser?: boolean
  userColor?: string
  assistantColor?: string
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  message, 
  isUser,
  userColor = '#2196F3',
  assistantColor = '#ffffff'
}) => {
  const isUserMessage = isUser !== undefined ? isUser : message.role === 'user'

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <View style={[
      styles.messageContainer, 
      isUserMessage ? styles.userMessage : styles.assistantMessage
    ]}>
      <Card style={[
        styles.messageBubble,
        isUserMessage 
          ? { ...styles.userBubble, backgroundColor: userColor }
          : { ...styles.assistantBubble, backgroundColor: assistantColor }
      ]}>
        <Card.Content style={styles.messageContent}>
          <Text style={[
            styles.messageText,
            isUserMessage ? styles.userText : styles.assistantText
          ]}>
            {message.message}
          </Text>
          <Text style={[
            styles.messageTime,
            isUserMessage ? styles.userTime : styles.assistantTime
          ]}>
            {formatTime(message.timestamp)}
          </Text>
        </Card.Content>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    elevation: 2,
  },
  userBubble: {
    // backgroundColor will be set dynamically
  },
  assistantBubble: {
    // backgroundColor will be set dynamically
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
  assistantText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  assistantTime: {
    color: '#666',
  },
})

export default ChatBubble

