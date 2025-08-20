import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native'
import { Text, Button } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Visit } from '../../lib/supabase'
import CleanTextInput from '~/components/input/cleanTextInput'

const EditVisitScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams<{ visit?: string }>()
  const [loading, setLoading] = useState(false)
  const [visit, setVisit] = useState<Visit | null>(null)

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

  useEffect(() => {
    if (params.visit) {
      try {
        const visitData = JSON.parse(decodeURIComponent(params.visit))
        setVisit(visitData)
        
        // Populate form fields
        setWeight(visitData.weight?.toString() || '')
        setHeight(visitData.height?.toString() || '')
        setSystolicBp(visitData.systolic_bp?.toString() || '')
        setDiastolicBp(visitData.diastolic_bp?.toString() || '')
        setHeartRate(visitData.heart_rate?.toString() || '')
        setTemperature(visitData.temperature?.toString() || '')
        setBloodSugar(visitData.blood_sugar?.toString() || '')
        setOxygenSaturation(visitData.oxygen_saturation?.toString() || '')
        setRespiratoryRate(visitData.respiratory_rate?.toString() || '')
        
        setSymptoms(visitData.symptoms || '')
        setDiagnosis(visitData.diagnosis || '')
        setTreatmentNotes(visitData.treatment_notes || '')
        setPrescribedMedications(visitData.prescribed_medications || '')
        setFollowUpInstructions(visitData.follow_up_instructions || '')
      } catch (error) {
        console.error('Error parsing visit data:', error)
        Alert.alert('Error', 'Invalid visit data')
        router.back()
      }
    }
  }, [params.visit])

  const validateForm = () => {
    // Check if at least one field has content
    const hasContent = weight || height || systolicBp || diastolicBp || heartRate || 
                      temperature || bloodSugar || oxygenSaturation || respiratoryRate ||
                      symptoms.trim() || diagnosis.trim() || treatmentNotes.trim()
    
    if (!hasContent) {
      Alert.alert('Validation Error', 'Please enter at least some information')
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

  const handleSaveChanges = async () => {
    if (!validateForm() || !visit) return

    setLoading(true)
    try {
      // Prepare updated visit data
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
        symptoms: symptoms.trim() || null,
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

      if (error) {
        Alert.alert('Error', 'Failed to update visit record')
        console.error('Error updating visit:', error)
      } else {
        Alert.alert('Success', 'Visit record updated successfully', [
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
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (!visit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Visit data not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Edit Visit</Text>
          <Text style={styles.subtitle}>{formatDate(visit.visit_date)}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Vital Signs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vital Signs</Text>
          
          <View style={styles.inputRow}>
            <CleanTextInput
              label="Weight (kg)"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="75.5"
              style={styles.halfInput}
            />
            <CleanTextInput
              label="Height (cm)"
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
              placeholder="170"
              style={styles.halfInput}
            />
          </View>

          <View style={styles.inputRow}>
            <CleanTextInput
              label="Systolic BP"
              value={systolicBp}
              onChangeText={setSystolicBp}
              keyboardType="numeric"
              placeholder="120"
              style={styles.halfInput}
            />
            <CleanTextInput
              label="Diastolic BP"
              value={diastolicBp}
              onChangeText={setDiastolicBp}
              keyboardType="numeric"
              placeholder="80"
              style={styles.halfInput}
            />
          </View>

          <View style={styles.inputRow}>
            <CleanTextInput
              label="Heart Rate (bpm)"
              value={heartRate}
              onChangeText={setHeartRate}
              keyboardType="numeric"
              placeholder="72"
              style={styles.halfInput}
            />
            <CleanTextInput
              label="Temperature (°C)"
              value={temperature}
              onChangeText={setTemperature}
              keyboardType="decimal-pad"
              placeholder="36.5"
              style={styles.halfInput}
            />
          </View>

          <View style={styles.inputRow}>
            <CleanTextInput
              label="Blood Sugar (mg/dL)"
              value={bloodSugar}
              onChangeText={setBloodSugar}
              keyboardType="decimal-pad"
              placeholder="90"
              style={styles.halfInput}
            />
            <CleanTextInput
              label="Oxygen Saturation (%)"
              value={oxygenSaturation}
              onChangeText={setOxygenSaturation}
              keyboardType="numeric"
              placeholder="98"
              style={styles.halfInput}
            />
          </View>

          <CleanTextInput
            label="Respiratory Rate (breaths/min)"
            value={respiratoryRate}
            onChangeText={setRespiratoryRate}
            keyboardType="numeric"
            placeholder="16"
          />
        </View>

        {/* Visit Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visit Information</Text>
          
          <CleanTextInput
            label="Symptoms"
            value={symptoms}
            onChangeText={setSymptoms}
            placeholder="Describe symptoms..."
            multiline
            numberOfLines={3}
          />

          <CleanTextInput
            label="Diagnosis"
            value={diagnosis}
            onChangeText={setDiagnosis}
            placeholder="Medical diagnosis..."
            multiline
            numberOfLines={2}
          />

          <CleanTextInput
            label="Treatment Notes"
            value={treatmentNotes}
            onChangeText={setTreatmentNotes}
            placeholder="Treatment provided, observations, etc..."
            multiline
            numberOfLines={3}
          />

          <CleanTextInput
            label="Prescribed Medications"
            value={prescribedMedications}
            onChangeText={setPrescribedMedications}
            placeholder="List medications with dosage..."
            multiline
            numberOfLines={3}
          />

          <CleanTextInput
            label="Follow-up Instructions"
            value={followUpInstructions}
            onChangeText={setFollowUpInstructions}
            placeholder="Instructions for follow-up care..."
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            onPress={handleSaveChanges}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
            contentStyle={styles.buttonContent}
            buttonColor="#4285F4"
          >
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </Button>

          <Button
            mode="outlined"
            onPress={() => router.back()}
            disabled={loading}
            style={styles.cancelButton}
            textColor="#666666"
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
    backgroundColor: '#FFFFFF',
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
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  actionButtons: {
    marginTop: 24,
    gap: 12,
  },
  saveButton: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  cancelButton: {
    borderRadius: 12,
    borderColor: '#E8E8E8',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
  },
})

export default EditVisitScreen