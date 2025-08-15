import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Card, Text, Chip } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'

interface VitalSigns {
  weight?: number
  height?: number
  systolic_bp?: number
  diastolic_bp?: number
  heart_rate?: number
  temperature?: number
  blood_sugar?: number
  oxygen_saturation?: number
  respiratory_rate?: number
}

interface VitalSignsCardProps {
  vitals: VitalSigns
  title?: string
  showAlerts?: boolean
}

interface VitalChip {
  label: string
  icon: keyof typeof MaterialIcons.glyphMap
  alert?: boolean
  value: string | number
}

const VitalSignsCard: React.FC<VitalSignsCardProps> = ({ 
  vitals, 
  title = "Vital Signs",
  showAlerts = true 
}) => {
  const getVitalChips = (): VitalChip[] => {
    const chips: VitalChip[] = []
    
    if (vitals.weight) {
      chips.push({ 
        label: `${vitals.weight} kg`, 
        icon: 'scale',
        value: vitals.weight
      })
    }
    
    if (vitals.height) {
      chips.push({ 
        label: `${vitals.height} cm`, 
        icon: 'height',
        value: vitals.height
      })
    }
    
    if (vitals.systolic_bp && vitals.diastolic_bp) {
      const isHigh = vitals.systolic_bp > 140 || vitals.diastolic_bp > 90
      const isLow = vitals.systolic_bp < 90 || vitals.diastolic_bp < 60
      chips.push({ 
        label: `${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg`, 
        icon: 'favorite',
        alert: showAlerts && (isHigh || isLow),
        value: `${vitals.systolic_bp}/${vitals.diastolic_bp}`
      })
    }
    
    if (vitals.heart_rate) {
      const isAbnormal = vitals.heart_rate > 100 || vitals.heart_rate < 60
      chips.push({ 
        label: `${vitals.heart_rate} bpm`, 
        icon: 'favorite',
        alert: showAlerts && isAbnormal,
        value: vitals.heart_rate
      })
    }
    
    if (vitals.temperature) {
      const isHigh = vitals.temperature > 37.5
      const isLow = vitals.temperature < 36.0
      chips.push({ 
        label: `${vitals.temperature}°C`, 
        icon: 'thermostat',
        alert: showAlerts && (isHigh || isLow),
        value: vitals.temperature
      })
    }
    
    if (vitals.blood_sugar) {
      const isHigh = vitals.blood_sugar > 180
      const isLow = vitals.blood_sugar < 70
      chips.push({ 
        label: `${vitals.blood_sugar} mg/dL`, 
        icon: 'water-drop',
        alert: showAlerts && (isHigh || isLow),
        value: vitals.blood_sugar
      })
    }
    
    if (vitals.oxygen_saturation) {
      const isLow = vitals.oxygen_saturation < 95
      chips.push({ 
        label: `${vitals.oxygen_saturation}%`, 
        icon: 'air',
        alert: showAlerts && isLow,
        value: vitals.oxygen_saturation
      })
    }
    
    if (vitals.respiratory_rate) {
      const isAbnormal = vitals.respiratory_rate > 20 || vitals.respiratory_rate < 12
      chips.push({ 
        label: `${vitals.respiratory_rate} /min`, 
        icon: 'air',
        alert: showAlerts && isAbnormal,
        value: vitals.respiratory_rate
      })
    }
    
    return chips
  }

  const vitalChips = getVitalChips()

  if (vitalChips.length === 0) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.emptyState}>
            <MaterialIcons name="monitor-heart" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No vital signs recorded</Text>
          </View>
        </Card.Content>
      </Card>
    )
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.chipsContainer}>
          {vitalChips.map((chip, index) => (
            <Chip
              key={index}
              mode="outlined"
              compact
              style={[
                styles.chip,
                chip.alert ? styles.alertChip : styles.normalChip
              ]}
              icon={chip.icon}
            >
              {chip.label}
            </Chip>
          ))}
        </View>
      </Card.Content>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    elevation: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 8,
  },
  normalChip: {
    backgroundColor: '#E3F2FD',
  },
  alertChip: {
    backgroundColor: '#FFEBEE',
    borderColor: '#f44336',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
})

export default VitalSignsCard

