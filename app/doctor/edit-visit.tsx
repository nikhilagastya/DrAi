import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { Card, Text, TextInput, Button, Divider, ActivityIndicator } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Visit, FieldDoctor } from '../../lib/supabase'


const DoctorEditVisitScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams<{ visitId?: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [visit, setVisit] = useState<Visit | null>(null)

  const doctor = userProfile as FieldDoctor

  // Editable fields
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [systolicBp, setSystolicBp] = useState('')
  const [diastolicBp, setDiastolicBp] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [temperature, setTemperature] = useState('')
  const [bloodSugar, setBloodSugar] = useState('')
  const [oxygenSaturation, setOxygenSaturation] = useState('')
  const [respiratoryRate, setRespiratoryRate] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [treatmentNotes, setTreatmentNotes] = useState('')
  const [prescribedMedications, setPrescribedMedications] = useState('')
  const [followUpInstructions, setFollowUpInstructions] = useState('')

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
          patients (name, age, gender, medical_history, allergies, current_medications)
        `)
        .eq('id', params.visitId)
        .eq('doctor_id', doctor?.id) // Ensure doctor can only edit their own visits
        .single()

      if (error) {
        Alert.alert('Error', 'Failed to load visit details')
        console.error('Error loading visit:', error)
        router.back()
      } else {
        setVisit(data)
        // Populate form fields
        setWeight(data.weight?.toString() || '')
        setHeight(data.height?.toString() || '')
        setSystolicBp(data.systolic_bp?.toString() || '')
        setDiastolicBp(data.diastolic_bp?.toString() || '')
        setHeartRate(data.heart_rate?.toString() || '')
        setTemperature(data.temperature?.toString() || '')
        setBloodSugar(data.blood_sugar?.toString() || '')
        setOxygenSaturation(data.oxygen_saturation?.toString() || '')
        setRespiratoryRate(data.respiratory_rate?.toString() || '')
        setSymptoms(data.symptoms || '')
        setDiagnosis(data.diagnosis || '')
        setTreatmentNotes(data.treatment_notes || '')
        setPrescribedMedications(data.prescribed_medications || '')
        setFollowUpInstructions(data.follow_up_instructions || '')
      }
    } catch (error) {
      console.error('Error loading visit:', error)
      Alert.alert('Error', 'An unexpected error occurred')
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    if (!symptoms.trim()) {
      Alert.alert('Validation Error', 'Please enter patient symptoms')
      return false
    }

    // Validate vital signs ranges
    if (weight && (parseFloat(weight) < 1 || parseFloat(weight) > 500)) {
      Alert.alert('Validation Error', 'Please enter a valid weight (1-500 kg)')
      return false
    }

    if (height && (parseFloat(height) < 30 || parseFloat(height) > 300)) {
      Alert.alert('Validation Error', 'Please enter a valid height (30-300 cm)')
      return false
    }

    if (systolicBp && (parseInt(systolicBp) < 50 || parseInt(systolicBp) > 300)) {
      Alert.alert('Validation Error', 'Please enter a valid systolic blood pressure (50-300 mmHg)')
      return false
    }

    if (diastolicBp && (parseInt(diastolicBp) < 30 || parseInt(diastolicBp) > 200)) {
      Alert.alert('Validation Error', 'Please enter a valid diastolic blood pressure (30-200 mmHg)')
      return false
    }

    if (heartRate && (parseInt(heartRate) < 30 || parseInt(heartRate) > 250)) {
      Alert.alert('Validation Error', 'Please enter a valid heart rate (30-250 bpm)')
      return false
    }

    if (temperature && (parseFloat(temperature) < 30 || parseFloat(temperature) > 45)) {
      Alert.alert('Validation Error', 'Please enter a valid temperature (30-45°C)')
      return false
    }

    if (bloodSugar && (parseFloat(bloodSugar) < 20 || parseFloat(bloodSugar) > 800)) {
      Alert.alert('Validation Error', 'Please enter a valid blood sugar (20-800 mg/dL)')
      return false
    }

    if (oxygenSaturation && (parseInt(oxygenSaturation) < 50 || parseInt(oxygenSaturation) > 100)) {
      Alert.alert('Validation Error', 'Please enter a valid oxygen saturation (50-100%)')
      return false
    }

    if (respiratoryRate && (parseInt(respiratoryRate) < 5 || parseInt(respiratoryRate) > 60)) {
      Alert.alert('Validation Error', 'Please enter a valid respiratory rate (5-60 breaths/min)')
      return false
    }

    return true
  }

  const handleSave = async () => {
    if (!visit || !validateForm()) return

    setSaving(true)
    try {
      const updateData = {
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        systolic_bp: systolicBp ? parseInt(systolicBp) : null,
        diastolic_bp: diastolicBp ? parseInt(diastolicBp) : null,
        heart_rate: heartRate ? parseInt(heartRate) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        blood_sugar: bloodSugar ? parseFloat(bloodSugar) : null,
        oxygen_saturation: oxygenSaturation ? parseInt(oxygenSaturation) : null,
        respiratory_rate: respiratoryRate ? parseInt(respiratoryRate) : null,
        symptoms: symptoms.trim(),
        diagnosis: diagnosis.trim() || null,
        treatment_notes: treatmentNotes.trim() || null,
        prescribed_medications: prescribedMedications.trim() || null,
        follow_up_instructions: followUpInstructions.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('visits')
        .update(updateData)
        .eq('id', visit.id)
        .eq('doctor_id', doctor?.id) // Security check

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
          <ActivityIndicator size="large" color="#4CAF50" />
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

  const patient = (visit as any).patients

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Visit Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerContent}>
              <MaterialIcons name="edit" size={28} color="#4CAF50" />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Edit Visit Record</Text>
                <Text style={styles.headerSubtitle}>
                  {formatDate(visit.visit_date)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Patient Information */}
        {patient && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Patient Information</Text>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientDetails}>
                  Age: {patient.age} • Gender: {patient.gender}
                </Text>
                {patient.medical_history && (
                  <Text style={styles.medicalHistory}>
                    Medical History: {patient.medical_history}
                  </Text>
                )}
                {patient.allergies && (
                  <Text style={styles.allergies}>
                    Allergies: {patient.allergies}
                  </Text>
                )}
                {patient.current_medications && (
                  <Text style={styles.medications}>
                    Current Medications: {patient.current_medications}
                  </Text>
                )}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Vital Signs */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Vital Signs</Text>
            
            <View style={styles.inputRow}>
              <TextInput
                label="Weight (kg)"
                value={weight}
                onChangeText={setWeight}
                mode="outlined"
                style={styles.halfInput}
                keyboardType="decimal-pad"
              />
              <TextInput
                label="Height (cm)"
                value={height}
                onChangeText={setHeight}
                mode="outlined"
                style={styles.halfInput}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputRow}>
              <TextInput
                label="Systolic BP (mmHg)"
                value={systolicBp}
                onChangeText={setSystolicBp}
                mode="outlined"
                style={styles.halfInput}
                keyboardType="numeric"
              />
              <TextInput
                label="Diastolic BP (mmHg)"
                value={diastolicBp}
                onChangeText={setDiastolicBp}
                mode="outlined"
                style={styles.halfInput}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputRow}>
              <TextInput
                label="Heart Rate (bpm)"
                value={heartRate}
                onChangeText={setHeartRate}
                mode="outlined"
                style={styles.halfInput}
                keyboardType="numeric"
              />
              <TextInput
                label="Temperature (°C)"
                value={temperature}
                onChangeText={setTemperature}
                mode="outlined"
                style={styles.halfInput}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputRow}>
              <TextInput
                label="Blood Sugar (mg/dL)"
                value={bloodSugar}
                onChangeText={setBloodSugar}
                mode="outlined"
                style={styles.halfInput}
                keyboardType="decimal-pad"
              />
              <TextInput
                label="Oxygen Saturation (%)"
                value={oxygenSaturation}
                onChangeText={setOxygenSaturation}
                mode="outlined"
                style={styles.halfInput}
                keyboardType="numeric"
              />
            </View>

            <TextInput
              label="Respiratory Rate (breaths/min)"
              value={respiratoryRate}
              onChangeText={setRespiratoryRate}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />
          </Card.Content>
        </Card>

        {/* Visit Information */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Visit Information</Text>
            
            <TextInput
              label="Symptoms *"
              value={symptoms}
              onChangeText={setSymptoms}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
              placeholder="Describe the patient's symptoms..."
            />

            <TextInput
              label="Diagnosis"
              value={diagnosis}
              onChangeText={setDiagnosis}
              mode="outlined"
              style={styles.input}
              multiline
              placeholder="Enter diagnosis..."
            />

            <TextInput
              label="Treatment Notes"
              value={treatmentNotes}
              onChangeText={setTreatmentNotes}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
              placeholder="Treatment provided, observations, etc..."
            />

            <TextInput
              label="Prescribed Medications"
              value={prescribedMedications}
              onChangeText={setPrescribedMedications}
              mode="outlined"
              style={styles.input}
              multiline
              placeholder="List medications with dosage and instructions..."
            />

            <TextInput
              label="Follow-up Instructions"
              value={followUpInstructions}
              onChangeText={setFollowUpInstructions}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={2}
              placeholder="Instructions for patient follow-up care..."
            />
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
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
              <MaterialIcons name="info-outline" size={20} color="#4CAF50" />
              <Text style={styles.infoText}>
                You can edit all visit details including vital signs, diagnosis, and treatment notes. 
                Changes will be saved with a timestamp for audit purposes.
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
  sectionCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  patientInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  patientDetails: {
    color: '#666',
    marginBottom: 8,
  },
  medicalHistory: {
    color: '#666',
    marginBottom: 4,
    fontSize: 14,
  },
  allergies: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  medications: {
    color: '#666',
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  halfInput: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  actionButtons: {
    marginBottom: 16,
  },
  saveButton: {
    marginBottom: 12,
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    borderColor: '#666',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  infoCard: {
    backgroundColor: '#E8F5E8',
    elevation: 1,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    marginLeft: 12,
    color: '#2E7D32',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
})

export default DoctorEditVisitScreen

