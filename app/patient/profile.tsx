import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native'
import { Text, Button, ActivityIndicator } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Patient } from '../../lib/supabase'
import { router } from 'expo-router'
import CleanTextInput from '~/components/input/cleanTextInput'

const PatientProfileScreen: React.FC = () => {
  const { userProfile, signOut, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const patient = userProfile as Patient

  // Editable fields
  const [phone, setPhone] = useState(patient?.phone || '')
  const [address, setAddress] = useState(patient?.address || '')
  const [emergencyContactName, setEmergencyContactName] = useState(patient?.emergency_contact_name || '')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(patient?.emergency_contact_phone || '')
  const [medicalHistory, setMedicalHistory] = useState(patient?.medical_history || '')
  const [allergies, setAllergies] = useState(patient?.allergies || '')
  const [currentMedications, setCurrentMedications] = useState(patient?.current_medications || '')

  const handleSave = async () => {
    if (!patient) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('patients')
        .update({
          phone,
          address,
          emergency_contact_name: emergencyContactName,
          emergency_contact_phone: emergencyContactPhone,
          medical_history: medicalHistory,
          allergies,
          current_medications: currentMedications,
        })
        .eq('id', patient.id)

      if (error) {
        Alert.alert('Error', 'Failed to update profile')
        console.error('Error updating profile:', error)
      } else {
        Alert.alert('Success', 'Profile updated successfully')
        setEditing(false)
        await refreshProfile()
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
      console.error('Error updating profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset to original values
    setPhone(patient?.phone || '')
    setAddress(patient?.address || '')
    setEmergencyContactName(patient?.emergency_contact_name || '')
    setEmergencyContactPhone(patient?.emergency_contact_phone || '')
    setMedicalHistory(patient?.medical_history || '')
    setAllergies(patient?.allergies || '')
    setCurrentMedications(patient?.current_medications || '')
    setEditing(false)
  }

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut()
            router.push('/auth/login')
          }
        }
      ]
    )
  }

  if (!patient) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading profile...</Text>
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
        <Text style={styles.title}>My Profile</Text>
        {!editing && (
          <TouchableOpacity 
            style={styles.editIconButton}
            onPress={() => setEditing(true)}
          >
            <MaterialIcons name="edit" size={24} color="#4285F4" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="account-circle" size={80} color="#4285F4" />
          </View>
          <Text style={styles.name}>{patient.name}</Text>
          <Text style={styles.email}>{patient.email}</Text>
          <View style={styles.basicInfo}>
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>Age {patient.age}</Text>
            </View>
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>{patient.gender}</Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          {editing ? (
            <>
              <CleanTextInput
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Enter phone number"
              />
              <CleanTextInput
                label="Address"
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your address"
                multiline
                numberOfLines={3}
              />
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <MaterialIcons name="phone" size={20} color="#4285F4" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{phone || 'Not provided'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <MaterialIcons name="home" size={20} color="#4285F4" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{address || 'Not provided'}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          
          {editing ? (
            <>
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
                keyboardType="phone-pad"
                placeholder="Enter emergency contact phone"
              />
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <MaterialIcons name="person" size={20} color="#4285F4" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>
                    {emergencyContactName || 'Not provided'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <MaterialIcons name="phone-in-talk" size={20} color="#4285F4" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>
                    {emergencyContactPhone || 'Not provided'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Medical Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
          
          {editing ? (
            <>
              <CleanTextInput
                label="Medical History"
                value={medicalHistory}
                onChangeText={setMedicalHistory}
                placeholder="Enter medical history, past conditions, surgeries, etc."
                multiline
                numberOfLines={4}
              />
              <CleanTextInput
                label="Known Allergies"
                value={allergies}
                onChangeText={setAllergies}
                placeholder="Enter known allergies (food, medication, environmental)"
                multiline
                numberOfLines={3}
              />
              <CleanTextInput
                label="Current Medications"
                value={currentMedications}
                onChangeText={setCurrentMedications}
                placeholder="List current medications with dosages"
                multiline
                numberOfLines={3}
              />
            </>
          ) : (
            <>
              <View style={styles.medicalSection}>
                <View style={styles.medicalHeader}>
                  <MaterialIcons name="history" size={20} color="#4285F4" />
                  <Text style={styles.medicalLabel}>Medical History</Text>
                </View>
                <Text style={styles.medicalValue}>
                  {medicalHistory || 'No medical history recorded'}
                </Text>
              </View>
              
              <View style={styles.medicalSection}>
                <View style={styles.medicalHeader}>
                  <MaterialIcons name="warning" size={20} color="#FF9800" />
                  <Text style={styles.medicalLabel}>Known Allergies</Text>
                </View>
                <Text style={[styles.medicalValue, allergies && styles.allergyText]}>
                  {allergies || 'No known allergies'}
                </Text>
              </View>
              
              <View style={styles.medicalSection}>
                <View style={styles.medicalHeader}>
                  <MaterialIcons name="medication" size={20} color="#4CAF50" />
                  <Text style={styles.medicalLabel}>Current Medications</Text>
                </View>
                <Text style={styles.medicalValue}>
                  {currentMedications || 'No current medications'}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {editing ? (
            <>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={loading}
                disabled={loading}
                style={styles.saveButton}
                contentStyle={styles.buttonContent}
                buttonColor="#4285F4"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                mode="outlined"
                onPress={handleCancel}
                disabled={loading}
                style={styles.cancelButton}
                textColor="#666666"
              >
                Cancel
              </Button>
            </>
          ) : (
            <></>
          )}

          <Button
            mode="outlined"
            onPress={handleSignOut}
            style={styles.signOutButton}
            textColor="#D32F2F"
            icon={() => <MaterialIcons name="logout" size={20} color="#D32F2F" />}
          >
            Sign Out
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
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  editIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  basicInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  infoChip: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  infoChipText: {
    fontSize: 14,
    color: '#4285F4',
    fontWeight: '500',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 22,
  },
  medicalSection: {
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  medicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  medicalValue: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  allergyText: {
    color: '#FF9800',
    fontWeight: '500',
  },
  actionButtons: {
    marginTop: 24,
    gap: 12,
  },
  saveButton: {
    borderRadius: 12,
  },
  editButton: {
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  cancelButton: {
    borderRadius: 12,
    borderColor: '#E8E8E8',
    marginBottom: 16,
  },
  signOutButton: {
    borderRadius: 12,
    borderColor: '#FFB3B3',
  },
})

export default PatientProfileScreen