import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { Card, Text, TextInput, Button, Divider } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Patient, FieldDoctor } from '../../lib/supabase'

const VisitFormScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams<{ patient?: string }>()
  const [loading, setLoading] = useState(false)

  // Parse patient data if provided
  const patient: Patient | null = params.patient ? JSON.parse(decodeURIComponent(params.patient)) : null
  const doctor = userProfile as FieldDoctor

  // Vital signs
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [systolicBp, setSystolicBp] = useState('')
  const [diastolicBp, setDiastolicBp] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [temperature, setTemperature] = useState('')
  const [bloodSugar, setBloodSugar] = useState('')
  const [oxygenSaturation, setOxygenSaturation] = useState('')
  const [respiratoryRate, setRespiratoryRate] = useState('')

  // Visit information
  const [symptoms, setSymptoms] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [treatmentNotes, setTreatmentNotes] = useState('')
  const [prescribedMedications, setPrescribedMedications] = useState('')
  const [followUpInstructions, setFollowUpInstructions] = useState('')

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

  const handleStartDiagnosis = () => {
    if (!validateForm()) return

    // Prepare vital data for AI chat
    const vitalData = {
      patient_name: patient?.name,
      patient_age: patient?.age,
      patient_gender: patient?.gender,
      weight: weight ? parseFloat(weight) : undefined,
      height: height ? parseFloat(height) : undefined,
      systolic_bp: systolicBp ? parseInt(systolicBp) : undefined,
      diastolic_bp: diastolicBp ? parseInt(diastolicBp) : undefined,
      heart_rate: heartRate ? parseInt(heartRate) : undefined,
      temperature: temperature ? parseFloat(temperature) : undefined,
      blood_sugar: bloodSugar ? parseFloat(bloodSugar) : undefined,
      oxygen_saturation: oxygenSaturation ? parseInt(oxygenSaturation) : undefined,
      symptoms: symptoms.trim(),
    }

    // Navigate to AI chat room with vital data
    const vitalsParam = encodeURIComponent(JSON.stringify(vitalData))
    router.push(`/doctor/ai-chat-room?vitals=${vitalsParam}`)
  }

  const handleSaveVisit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      // Prepare visit data
      const visitData = {
        patient_id: patient?.id,
        doctor_id: doctor?.id,
        visit_date: new Date().toISOString(),
        visit_type: 'in_person',
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
      }

      const { error } = await supabase
        .from('visits')
        .insert(visitData)

      if (error) {
        Alert.alert('Error', 'Failed to save visit record')
        console.error('Error saving visit:', error)
      } else {
        Alert.alert('Success', 'Visit record saved successfully', [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ])
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
      console.error('Error saving visit:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
              placeholder="Enter diagnosis if determined..."
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
            onPress={handleStartDiagnosis}
            style={[styles.actionButton, styles.diagnosisButton]}
            contentStyle={styles.buttonContent}
            icon="psychology"
          >
            Start AI Diagnosis
          </Button>

          <Button
            mode="contained"
            onPress={handleSaveVisit}
            loading={loading}
            disabled={loading}
            style={styles.actionButton}
            contentStyle={styles.buttonContent}
            icon="content-save"
          >
            Save Visit Record
          </Button>

          <Button
            mode="outlined"
            onPress={() => router.back()}
            disabled={loading}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </View>
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
  sectionCard: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
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
  },
  patientDetails: {
    color: '#666',
    marginBottom: 8,
  },
  medicalHistory: {
    color: '#666',
    marginBottom: 4,
    fontSize: 12,
  },
  allergies: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  actionButtons: {
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  diagnosisButton: {
    backgroundColor: '#FF9800',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  cancelButton: {
    marginTop: 8,
  },
})

export default VisitFormScreen

