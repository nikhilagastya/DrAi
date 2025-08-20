import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native'
import { Text, Button } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Patient } from '../../lib/supabase'
import CleanTextInput from '~/components/input/cleanTextInput'

const AddVitalsScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const params = useLocalSearchParams();


const patient = params.patient
  ? (JSON.parse(params.patient as string) as Patient)
  : null;

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
//  const vitalsParam = encodeURIComponent(JSON.stringify(vitalData))
//     router.push(`/doctor/ai-chat-room?vitals=${vitalsParam}`)
//   }
  // Symptoms and observations
  const [symptoms, setSymptoms] = useState('')
  const [observations, setObservations] = useState('')

  const validateForm = () => {
    // Check if at least one vital sign or symptom is entered
    const hasVitals = weight || height || systolicBp || diastolicBp || heartRate || 
                     temperature || bloodSugar || oxygenSaturation || respiratoryRate
    const hasSymptoms = symptoms.trim()
    
    if (!hasVitals && !hasSymptoms) {
      Alert.alert('Validation Error', 'Please enter at least one vital sign or symptom')
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

  const handleStartAIDiagnosis = async() => {
    const data= await handleSaveEntry()
    console.log(data.id,'ss')
    if(data){
    const vitalData = {
      patient_id: patient?.id,
      doctor_id: userProfile?.id,
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
      observations: observations.trim() || null,
      visitId: data.id 
    }
  
    const vitalsParam = encodeURIComponent(JSON.stringify(vitalData))
    router.push(`/doctor/ai-chat-room?vitals=${vitalsParam}`)
  }
  }
  const handleSaveEntry = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      // Prepare visit data as self-recorded entry
      const visitData = {
        patient_id: patient?.id,
        doctor_id: userProfile?.id, // Self-recorded entry
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
        symptoms: symptoms.trim() || null,
        treatment_notes: observations.trim() || null,
      }

      const { data,error } = await supabase
        .from('visits')
        .insert(visitData)
        .select().single()

      if (error) {
        Alert.alert('Error', 'Failed to save vitals entry')
        console.error('Error saving vitals:', error)
      } else {
        return data
        
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
      console.error('Error saving vitals:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={20} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Vitals Entry</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Vital Signs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vital Signs</Text>
          <Text style={styles.sectionSubtitle}>Enter any measurements you have</Text>
          
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

        {/* Symptoms Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Symptoms</Text>
          <Text style={styles.sectionSubtitle}>Describe how you're feeling today</Text>
          
          <CleanTextInput
            label="Current Symptoms"
            value={symptoms}
            onChangeText={setSymptoms}
            placeholder="Describe any symptoms you're experiencing..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Observations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes & Observations</Text>
          <Text style={styles.sectionSubtitle}>Any additional notes about your health</Text>
          
          <CleanTextInput
            label="Additional Notes"
            value={observations}
            onChangeText={setObservations}
            placeholder="Any other observations, medications taken, activities, etc..."
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            onPress={handleSaveEntry}
            loading={loading}
            disabled={loading}
            style={styles.cancelButton}
           textColor='white'
            buttonColor="#4285F4"
          >
            {loading ? 'Saving...' : 'Save Entry'}
          </Button>

          <Button
            mode="outlined"
            onPress={() =>handleStartAIDiagnosis() }
            disabled={loading}
            style={styles.cancelButton}
            textColor="white"
            buttonColor='orange'
          >
            Start AI Diagnosis
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
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
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#666666',
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
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    width:'50%'
  },
})

export default AddVitalsScreen