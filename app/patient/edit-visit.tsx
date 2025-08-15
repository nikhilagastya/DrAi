import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { Card, Text, TextInput, Button, Divider, ActivityIndicator } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Visit, Patient } from '../../lib/supabase'
import VitalSignsCard from '~/components/VitalSignsCard'


const EditVisitScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams<{ visitId?: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [visit, setVisit] = useState<Visit | null>(null)

  const patient = userProfile as Patient

  // Editable fields
  const [symptoms, setSymptoms] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  useEffect(() => {
    if (params.visitId) {
      loadVisit()
    }
  }, [params.visitId])

  const loadVisit = async () => {
    if (!params.visitId) return

    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          field_doctors (name, specialization)
        `)
        .eq('id', params.visitId)
        .eq('patient_id', patient?.id) // Ensure patient can only edit their own visits
        .single()

      if (error) {
        Alert.alert('Error', 'Failed to load visit details')
        console.error('Error loading visit:', error)
        router.back()
      } else {
        setVisit(data)
        setSymptoms(data.symptoms || '')
        setAdditionalNotes(data.patient_notes || '')
      }
    } catch (error) {
      console.error('Error loading visit:', error)
      Alert.alert('Error', 'An unexpected error occurred')
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!visit) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('visits')
        .update({
          symptoms: symptoms.trim(),
          patient_notes: additionalNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', visit.id)
        .eq('patient_id', patient?.id) // Security check

      if (error) {
        Alert.alert('Error', 'Failed to update visit')
        console.error('Error updating visit:', error)
      } else {
        Alert.alert('Success', 'Visit updated successfully', [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ])
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
      console.error('Error updating visit:', error)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading visit details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!visit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#f44336" />
          <Text style={styles.errorText}>Visit not found</Text>
          <Button mode="contained" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    )
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Visit Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerContent}>
              <MaterialIcons name="edit" size={28} color="#2196F3" />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Edit Visit</Text>
                <Text style={styles.headerSubtitle}>
                  {formatDate(visit.visit_date)}
                </Text>
              </View>
            </View>
            
            {(visit as any).field_doctors && (
              <View style={styles.doctorInfo}>
                <MaterialIcons name="medical-services" size={16} color="#666" />
                <Text style={styles.doctorText}>
                  Dr. {(visit as any).field_doctors.name} - {(visit as any).field_doctors.specialization}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Vital Signs (Read-only) */}
        <VitalSignsCard 
          vitals={vitals} 
          title="Recorded Vital Signs"
          showAlerts={true}
        />

        {/* Diagnosis & Treatment (Read-only) */}
        {(visit.diagnosis || visit.treatment_notes || visit.prescribed_medications) && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Medical Assessment</Text>
              
              {visit.diagnosis && (
                <View style={styles.readOnlySection}>
                  <Text style={styles.readOnlyLabel}>Diagnosis:</Text>
                  <Text style={styles.readOnlyValue}>{visit.diagnosis}</Text>
                </View>
              )}
              
              {visit.treatment_notes && (
                <View style={styles.readOnlySection}>
                  <Text style={styles.readOnlyLabel}>Treatment Notes:</Text>
                  <Text style={styles.readOnlyValue}>{visit.treatment_notes}</Text>
                </View>
              )}
              
              {visit.prescribed_medications && (
                <View style={styles.readOnlySection}>
                  <Text style={styles.readOnlyLabel}>Prescribed Medications:</Text>
                  <Text style={[styles.readOnlyValue, styles.medicationText]}>
                    {visit.prescribed_medications}
                  </Text>
                </View>
              )}
              
              {visit.follow_up_instructions && (
                <View style={styles.readOnlySection}>
                  <Text style={styles.readOnlyLabel}>Follow-up Instructions:</Text>
                  <Text style={[styles.readOnlyValue, styles.followUpText]}>
                    {visit.follow_up_instructions}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Editable Patient Information */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Patient Information</Text>
            <Text style={styles.sectionDescription}>
              You can update your symptoms and add additional notes about this visit.
            </Text>
            
            <TextInput
              label="Symptoms *"
              value={symptoms}
              onChangeText={setSymptoms}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={4}
              placeholder="Describe your symptoms during this visit..."
            />

            <TextInput
              label="Additional Notes"
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
              placeholder="Any additional information you'd like to add..."
            />
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving || !symptoms.trim()}
            style={styles.saveButton}
            contentStyle={styles.buttonContent}
            icon="content-save"
          >
            Save Changes
          </Button>

          <Button
            mode="outlined"
            onPress={() => router.back()}
            disabled={saving}
            style={styles.cancelButton}
            contentStyle={styles.buttonContent}
          >
            Cancel
          </Button>
        </View>

        {/* Info Note */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoContent}>
              <MaterialIcons name="info-outline" size={20} color="#2196F3" />
              <Text style={styles.infoText}>
                Note: You can only edit your symptoms and add personal notes. 
                Medical assessments can only be modified by healthcare providers.
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
    marginVertical: 16,
  },
  headerCard: {
    marginBottom: 16,
    elevation: 3,
    backgroundColor: '#ffffff',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  doctorText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  sectionCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  sectionDescription: {
    color: '#666',
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  readOnlySection: {
    marginBottom: 16,
  },
  readOnlyLabel: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  readOnlyValue: {
    color: '#666',
    lineHeight: 20,
  },
  medicationText: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    color: '#333',
  },
  followUpText: {
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    color: '#333',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  actionButtons: {
    marginBottom: 16,
  },
  saveButton: {
    marginBottom: 12,
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    borderColor: '#666',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    elevation: 1,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    marginLeft: 12,
    color: '#1976D2',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
})

export default EditVisitScreen

