import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Card, Text, Chip, Divider } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { Visit } from '../lib/supabase.js'
import VitalSignsCard from './VitalSignsCard'

interface VisitCardProps {
  visit: Visit & {
    patients?: { name: string; age: number; gender: string }
    field_doctors?: { name: string; specialization: string }
  }
  onPress?: () => void
  showPatientInfo?: boolean
  showDoctorInfo?: boolean
  compact?: boolean
}

const VisitCard: React.FC<VisitCardProps> = ({
  visit,
  onPress,
  showPatientInfo = false,
  showDoctorInfo = false,
  compact = false
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getVitalStatus = () => {
    const issues = []
    if (visit.systolic_bp && visit.systolic_bp > 140) issues.push('High BP')
    if (visit.blood_sugar && visit.blood_sugar > 180) issues.push('High Blood Sugar')
    if (visit.temperature && visit.temperature > 37.5) issues.push('Fever')
    if (visit.heart_rate && visit.heart_rate > 100) issues.push('High HR')
    return issues.length > 0 ? issues : ['Normal']
  }

  const vitals = {
    weight: visit.weight,
    height: visit.height,
    systolic_bp: visit.systolic_bp,
    diastolic_bp: visit.diastolic_bp,
    heart_rate: visit.heart_rate,
    temperature: visit.temperature,
    blood_sugar: visit.blood_sugar,
    oxygen_saturation: visit.oxygen_saturation,
    respiratory_rate: visit.respiratory_rate,
  }

  const CardWrapper = onPress ? TouchableOpacity : View

  return (
    <CardWrapper onPress={onPress} style={styles.cardWrapper}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          {/* Visit Header */}
          <View style={styles.header}>
            <View style={styles.dateContainer}>
              <Text style={styles.date}>{formatDate(visit.visit_date)}</Text>
              <Text style={styles.time}>{formatTime(visit.visit_date)}</Text>
            </View>
            
            <View style={styles.statusContainer}>
              {getVitalStatus().map((status, idx) => (
                <Chip
                  key={idx}
                  mode="outlined"
                  compact
                  style={[
                    styles.statusChip,
                    status === 'Normal' ? styles.normalChip : styles.alertChip
                  ]}
                >
                  {status}
                </Chip>
              ))}
            </View>
          </View>

          {/* Patient/Doctor Info */}
          {(showPatientInfo && visit.patients) && (
            <View style={styles.personInfo}>
              <MaterialIcons name="person" size={16} color="#666" />
              <Text style={styles.personName}>
                {visit.patients.name} ({visit.patients.age}y, {visit.patients.gender})
              </Text>
            </View>
          )}

          {(showDoctorInfo && visit.field_doctors) && (
            <View style={styles.personInfo}>
              <MaterialIcons name="medical-services" size={16} color="#666" />
              <Text style={styles.personName}>
                Dr. {visit.field_doctors.name} - {visit.field_doctors.specialization}
              </Text>
            </View>
          )}

          {!compact && (
            <>
              <Divider style={styles.divider} />

              {/* Vital Signs */}
              <VitalSignsCard 
                vitals={vitals} 
                title="Recorded Vitals"
                showAlerts={true}
              />

              {/* Symptoms */}
              {visit.symptoms && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Symptoms</Text>
                  <Text style={styles.sectionContent}>{visit.symptoms}</Text>
                </View>
              )}

              {/* Diagnosis */}
              {visit.diagnosis && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Diagnosis</Text>
                  <Text style={styles.sectionContent}>{visit.diagnosis}</Text>
                </View>
              )}

              {/* Treatment Notes */}
              {visit.treatment_notes && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Treatment Notes</Text>
                  <Text style={styles.sectionContent}>{visit.treatment_notes}</Text>
                </View>
              )}

              {/* Prescribed Medications */}
              {visit.prescribed_medications && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Prescribed Medications</Text>
                  <Text style={styles.medicationContent}>{visit.prescribed_medications}</Text>
                </View>
              )}

              {/* Follow-up Instructions */}
              {visit.follow_up_instructions && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Follow-up Instructions</Text>
                  <Text style={styles.followUpContent}>{visit.follow_up_instructions}</Text>
                </View>
              )}
            </>
          )}

          {compact && (visit.symptoms || visit.diagnosis) && (
            <View style={styles.compactInfo}>
              {visit.symptoms && (
                <Text style={styles.compactText} numberOfLines={1}>
                  Symptoms: {visit.symptoms}
                </Text>
              )}
              {visit.diagnosis && (
                <Text style={styles.compactText} numberOfLines={1}>
                  Diagnosis: {visit.diagnosis}
                </Text>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
    </CardWrapper>
  )
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    elevation: 2,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateContainer: {
    flex: 1,
  },
  date: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  time: {
    color: '#666',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  statusChip: {
    height: 24,
  },
  normalChip: {
    backgroundColor: '#E8F5E8',
  },
  alertChip: {
    backgroundColor: '#FFEBEE',
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  personName: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  divider: {
    marginVertical: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionContent: {
    color: '#666',
    lineHeight: 20,
  },
  medicationContent: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    color: '#333',
  },
  followUpContent: {
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    color: '#333',
  },
  compactInfo: {
    marginTop: 8,
  },
  compactText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
})

export default VisitCard

