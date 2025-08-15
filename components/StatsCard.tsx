import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Card, Text } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'

interface StatsCardProps {
  title: string
  value: string | number
  icon: keyof typeof MaterialIcons.glyphMap
  color?: string
  onPress?: () => void
  subtitle?: string
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color = '#2196F3',
  onPress,
  subtitle
}) => {
  const CardWrapper = onPress ? TouchableOpacity : View

  return (
    <CardWrapper onPress={onPress} style={styles.cardWrapper}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <MaterialIcons name={icon} size={24} color={color} />
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </Card.Content>
      </Card>
    </CardWrapper>
  )
}

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
  },
  card: {
    elevation: 2,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  title: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
})

export default StatsCard

