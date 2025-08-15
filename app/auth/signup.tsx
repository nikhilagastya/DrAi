import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { TextInput, Button, Text, Card, SegmentedButtons } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'

const SignUpScreen: React.FC = () => {
  const { role } = useLocalSearchParams<{ role: string }>()
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
        userData.age = age.trim()  // Keep as string, will be converted in function
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
        userData.permissions = [] // Default empty permissions
      }

      console.log('Signup attempt:', { email: email.trim(), role, userData })

      const { error } = await signUp(email.trim().toLowerCase(), password, userData)

      if (error) {
        console.error('Signup error:', error)
        
        // Provide more specific error messages
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
        Alert.alert(
          'Success', 
          'Account created successfully! Please check your email for verification, then sign in.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/auth/login')
            }
          ]
        )
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
      case 'patient': return 'Patient Registration'
      case 'field_doctor': return 'Doctor Registration'
      case 'admin': return 'Administrator Registration'
      default: return 'Registration'
    }
  }

  const getRoleIcon = () => {
    switch (role) {
      case 'patient': return 'person'
      case 'field_doctor': return 'medical-services'
      case 'admin': return 'admin-panel-settings'
      default: return 'person-add'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <MaterialIcons name={getRoleIcon()} size={64} color="#2196F3" />
          <Text style={styles.titleText}>{getRoleText()}</Text>
          <Text style={styles.subText}>
            Create your account to get started
          </Text>
        </View>

        <Card style={styles.formCard}>
          <Card.Content style={styles.formContent}>
            {/* Common Fields */}
            <TextInput
              label="Full Name *"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
              autoCapitalize="words"
            />

            <TextInput
              label="Email *"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
              left={<TextInput.Icon icon="email" />}
            />

            <TextInput
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
              left={<TextInput.Icon icon="phone" />}
            />

            <TextInput
              label="Password *"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? "eye-off" : "eye"}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <TextInput
              label="Confirm Password *"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              left={<TextInput.Icon icon="lock-check" />}
            />

            {/* Patient-specific fields */}
            {role === 'patient' && (
              <>
                <TextInput
                  label="Age *"
                  value={age}
                  onChangeText={setAge}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                  left={<TextInput.Icon icon="calendar" />}
                  placeholder="Enter your age"
                />

                <View style={styles.genderContainer}>
                  <Text style={styles.genderLabel}>Gender</Text>
                  <SegmentedButtons
                    value={gender}
                    onValueChange={setGender}
                    buttons={genderOptions}
                    style={styles.genderButtons}
                  />
                </View>

                <TextInput
                  label="Address"
                  value={address}
                  onChangeText={setAddress}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={styles.input}
                  left={<TextInput.Icon icon="home" />}
                />

                <TextInput
                  label="Emergency Contact Name"
                  value={emergencyContactName}
                  onChangeText={setEmergencyContactName}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="account-heart" />}
                  autoCapitalize="words"
                />

                <TextInput
                  label="Emergency Contact Phone"
                  value={emergencyContactPhone}
                  onChangeText={setEmergencyContactPhone}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={styles.input}
                  left={<TextInput.Icon icon="phone-alert" />}
                />

                <TextInput
                  label="Medical History"
                  value={medicalHistory}
                  onChangeText={setMedicalHistory}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                  left={<TextInput.Icon icon="file-document" />}
                  placeholder="Any past medical conditions, surgeries, etc."
                />

                <TextInput
                  label="Known Allergies"
                  value={allergies}
                  onChangeText={setAllergies}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={styles.input}
                  left={<TextInput.Icon icon="alert-circle" />}
                  placeholder="Food, drug, or environmental allergies"
                />

                <TextInput
                  label="Current Medications"
                  value={currentMedications}
                  onChangeText={setCurrentMedications}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={styles.input}
                  left={<TextInput.Icon icon="pill" />}
                  placeholder="List any medications you're currently taking"
                />
              </>
            )}

            {/* Doctor-specific fields */}
            {role === 'field_doctor' && (
              <>
                <TextInput
                  label="Specialization *"
                  value={specialization}
                  onChangeText={setSpecialization}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="medical-bag" />}
                  placeholder="e.g., General Practice, Cardiology, etc."
                  autoCapitalize="words"
                />

                <TextInput
                  label="License Number *"
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="card-account-details" />}
                  placeholder="Your medical license number"
                />

                <TextInput
                  label="Years of Experience"
                  value={yearsOfExperience}
                  onChangeText={setYearsOfExperience}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                  left={<TextInput.Icon icon="school" />}
                  placeholder="Years of practice"
                />
              </>
            )}

            <Button
              mode="contained"
              onPress={handleSignUp}
              loading={loading}
              disabled={loading}
              style={styles.signUpButton}
              contentStyle={styles.buttonContent}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <Button
              mode="text"
              onPress={() => router.push('/auth/login')}
              style={styles.loginButton}
              disabled={loading}
            >
              Already have an account? Sign In
            </Button>

            <Button
              mode="text"
              onPress={() => router.push('/auth/role-selection')}
              style={styles.backButton}
              disabled={loading}
            >
              Back to Role Selection
            </Button>
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
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  formCard: {
    elevation: 4,
    backgroundColor: '#fff',
    marginBottom: 24,
  },
  formContent: {
    padding: 24,
  },
  input: {
    marginBottom: 16,
  },
  genderContainer: {
    marginBottom: 16,
  },
  genderLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  genderButtons: {
    marginBottom: 8,
  },
  signUpButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  loginButton: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 4,
  },
})

export default SignUpScreen