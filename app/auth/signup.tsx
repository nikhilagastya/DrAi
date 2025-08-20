import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert, Dimensions, TouchableOpacity } from 'react-native'
import { TextInput, Button, Text, SegmentedButtons } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import CleanTextInput from '~/components/input/cleanTextInput'

const { width } = Dimensions.get('window')

const SignUpScreen: React.FC = () => {
  // ⭐ changed: read more params and compute helpers
  const { role, as, return: returnToParam } = useLocalSearchParams<{
    role: string;
    as?: string;
    return?: string;
  }>()
  const returnTo = typeof returnToParam === 'string' ? returnToParam : undefined
  const launchedByDoctor = as === 'doctor'

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Common fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // Patient-specific fields
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('prefer_not_to_say')
  const [address, setAddress] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [allergies, setAllergies] = useState('')
  const [currentMedications, setCurrentMedications] = useState('')

  // Doctor-specific fields
  const [specialization, setSpecialization] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [yearsOfExperience, setYearsOfExperience] = useState('')

  const { signUp } = useAuth()

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ]

  const validateForm = () => {
    // Basic validation
    if (!email || !password || !confirmPassword || !name) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Email, Password)')
      return false
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address')
      return false
    }

    // Password validation
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return false
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long')
      return false
    }

    // Role-specific validation
    if (role === 'patient') {
      if (!age || isNaN(parseInt(age)) || parseInt(age) < 1 || parseInt(age) > 150) {
        Alert.alert('Error', 'Please enter a valid age (1-150)')
        return false
      }
    }

    if (role === 'field_doctor') {
      if (!specialization.trim()) {
        Alert.alert('Error', 'Specialization is required for doctors')
        return false
      }
      if (!licenseNumber.trim()) {
        Alert.alert('Error', 'License number is required for doctors')
        return false
      }
      if (yearsOfExperience && (isNaN(parseInt(yearsOfExperience)) || parseInt(yearsOfExperience) < 0)) {
        Alert.alert('Error', 'Please enter a valid number for years of experience')
        return false
      }
    }

    return true
  }

  const handleSignUp = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      // Prepare user data object
      const userData: any = {
        role,
        name: name.trim(),
        phone: phone.trim() || null,
      }

      // Add role-specific fields
      if (role === 'patient') {
        userData.age = age.trim()
        userData.gender = gender
        userData.address = address.trim() || null
        userData.emergencyContactName = emergencyContactName.trim() || null
        userData.emergencyContactPhone = emergencyContactPhone.trim() || null
        userData.medicalHistory = medicalHistory.trim() || null
        userData.allergies = allergies.trim() || null
        userData.currentMedications = currentMedications.trim() || null
      } else if (role === 'field_doctor') {
        userData.specialization = specialization.trim()
        userData.licenseNumber = licenseNumber.trim()
        userData.yearsOfExperience = yearsOfExperience.trim() || null
      } else if (role === 'admin') {
        userData.permissions = []
      }

      console.log('Signup attempt:', { email: email.trim(), role, userData })

      const { error } = await signUp(email.trim().toLowerCase(), password, userData)

      if (error) {
        console.error('Signup error:', error)
        let errorMessage = 'Account creation failed'
        if (error.message?.includes('email')) {
          errorMessage = 'Email is already registered or invalid'
        } else if (error.message?.includes('password')) {
          errorMessage = 'Password requirements not met'
        } else if (error.message?.includes('duplicate')) {
          errorMessage = 'An account with this information already exists'
        } else if (error.message) {
          errorMessage = error.message
        }
        Alert.alert('Sign Up Failed', errorMessage)
      } else {
        // ⭐ changed: different success flow when launched by a doctor
        if (launchedByDoctor) {
          Alert.alert(
            'Success',
            'Patient account created. They can now sign in from the patient app.',
            [{ text: 'OK', onPress: () => router.replace(returnTo || '/doctor') }]
          )
        } else {
          Alert.alert(
            'Success',
            'Account created successfully! Please check your email for verification, then sign in.',
            [{ text: 'OK', onPress: () => router.push('/auth/login') }]
          )
        }
      }
    } catch (error) {
      console.error('Unexpected signup error:', error)
      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getRoleText = () => {
    switch (role) {
      case 'patient': return 'Patient Sign Up'
      case 'field_doctor': return 'Doctor Sign Up'
      case 'admin': return 'Admin Sign Up'
      default: return 'Sign Up'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* ⭐ changed: smarter back behavior when launched by doctor */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (launchedByDoctor && returnTo) {
              router.replace(returnTo)
            } else {
              router.push('/auth/role-selection')
            }
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.title}>{getRoleText()}</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <CleanTextInput
          label="Full Name"
          value={name}
          onChangeText={setName}
          placeholder="Enter full name"
          autoCapitalize="words"
        />

        <CleanTextInput
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter email address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <CleanTextInput
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />

        <CleanTextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry={!showPassword}
          right={
            <TextInput.Icon 
              icon={showPassword ? "eye-off" : "eye"} 
              onPress={() => setShowPassword(!showPassword)}
              iconColor="#999999"
            />
          }
        />

        <CleanTextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          secureTextEntry={!showPassword}
        />

        {/* Patient-specific fields */}
        {role === 'patient' && (
          <>
            <CleanTextInput
              label="Age"
              value={age}
              onChangeText={setAge}
              placeholder="Enter your age"
              keyboardType="numeric"
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Gender</Text>
              <SegmentedButtons
                value={gender}
                onValueChange={setGender}
                buttons={genderOptions.map(option => ({
                  ...option,
                  style: { 
                    backgroundColor: gender === option.value ? '#4285F4' : '#FFFFFF',
                    borderColor: '#E8E8E8'
                  }
                }))}
                style={styles.segmentedButtons}
                theme={{
                  colors: {
                    secondaryContainer: '#4285F4',
                    onSecondaryContainer: '#FFFFFF',
                  }
                }}
              />
            </View>

            <CleanTextInput
              label="Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your address"
              multiline
              numberOfLines={2}
            />

            <CleanTextInput
              label="Emergency Contact Name"
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              placeholder="Enter emergency contact name"
              autoCapitalize="words"
            />

            <CleanTextInput
              label="Emergency Contact Phone"
              value={emergencyContactPhone}
              onChangeText={setEmergencyContactPhone}
              placeholder="Enter emergency contact phone"
              keyboardType="phone-pad"
            />

            <CleanTextInput
              label="Medical History"
              value={medicalHistory}
              onChangeText={setMedicalHistory}
              placeholder="Any past medical conditions, surgeries, etc."
              multiline
              numberOfLines={3}
            />

            <CleanTextInput
              label="Known Allergies"
              value={allergies}
              onChangeText={setAllergies}
              placeholder="Food, drug, or environmental allergies"
              multiline
              numberOfLines={2}
            />

            <CleanTextInput
              label="Current Medications"
              value={currentMedications}
              onChangeText={setCurrentMedications}
              placeholder="List any medications you're currently taking"
              multiline
              numberOfLines={2}
            />
          </>
        )}

        {/* Doctor-specific fields */}
        {role === 'field_doctor' && (
          <>
            <CleanTextInput
              label="Specialization"
              value={specialization}
              onChangeText={setSpecialization}
              placeholder="e.g., General Practice, Cardiology, etc."
              autoCapitalize="words"
            />

            <CleanTextInput
              label="License Number"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="Your medical license number"
            />

            <CleanTextInput
              label="Years of Experience"
              value={yearsOfExperience}
              onChangeText={setYearsOfExperience}
              placeholder="Years of practice"
              keyboardType="numeric"
            />
          </>
        )}

        <Button
          mode="contained"
          onPress={handleSignUp}
          loading={loading}
          disabled={loading}
          style={styles.continueButton}
          contentStyle={styles.buttonContent}
          buttonColor="#4285F4"
          textColor="#FFFFFF"
        >
          {loading ? 'Creating Account...' : 'Continue'}
        </Button>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text 
              style={styles.linkText}
              onPress={() => router.push('/auth/login')}
            >
              Sign In
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8F9FA', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  title: { fontSize: 24, fontWeight: '600', color: '#333333', flex: 1 },
  content: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 16, fontWeight: '500', color: '#333333', marginBottom: 8 },
  input: { backgroundColor: '#FAFAFA', fontSize: 16 },
  multilineInput: { paddingTop: 12 },
  inputContent: { paddingHorizontal: 16, paddingVertical: 12 },
  inputOutline: { borderColor: '#E8E8E8', borderWidth: 1, borderRadius: 8 },
  segmentedButtons: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E8E8E8' },
  continueButton: { borderRadius: 12, marginTop: 20, marginBottom: 24, elevation: 0, shadowOpacity: 0 },
  buttonContent: { paddingVertical: 12 },
  footer: { alignItems: 'center', paddingVertical: 20 },
  footerText: { fontSize: 16, color: '#666666', textAlign: 'center' },
  linkText: { color: '#4285F4', fontWeight: '500' },
})

export default SignUpScreen
