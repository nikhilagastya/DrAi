import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Button } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'

interface EmptyStateProps {
  icon: keyof typeof MaterialIcons.glyphMap
  title: string
  description: string
  actionText?: string
  onAction?: () => void
  iconColor?: string
  iconSize?: number
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  iconColor = '#ccc',
  iconSize = 64
}) => {
  return (
    <View style={styles.container}>
      <MaterialIcons name={icon} size={iconSize} color={iconColor} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionText && onAction && (
        <Button
          mode="contained"
          onPress={onAction}
          style={styles.actionButton}
        >
          {actionText}
        </Button>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#666',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 24,
  },
})

export default EmptyState

