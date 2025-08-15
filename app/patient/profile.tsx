import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { Card, Title, Paragraph, Button, TextInput, Divider } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Patient } from '../../lib/supabase'
import { router } from 'expo-router'

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
    await signOut()
    router.push('/auth/login')
  }

  if (!patient) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Paragraph>Loading profile...</Paragraph>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <Card style={styles.headerCard}>
          <Card.Content style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <MaterialIcons name="account-circle" size={80} color="#2196F3" />
            </View>
            <Title style={styles.name}>{patient.name}</Title>
            <Paragraph style={styles.email}>{patient.email}</Paragraph>
            <View style={styles.basicInfo}>
              <Paragraph style={styles.infoText}>Age: {patient.age}</Paragraph>
              <Paragraph style={styles.infoText}>Gender: {patient.gender}</Paragraph>
            </View>
          </Card.Content>
        </Card>

        {/* Contact Information */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Contact Information</Title>
            
            {editing ? (
              <TextInput
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                mode="outlined"
                style={styles.input}
                keyboardType="phone-pad"
              />
            ) : (
              <View style={styles.infoRow}>
                <MaterialIcons name="phone" size={20} color="#666" />
                <Paragraph style={styles.infoValue}>{phone || 'Not provided'}</Paragraph>
              </View>
            )}

            {editing ? (
              <TextInput
                label="Address"
                value={address}
                onChangeText={setAddress}
                mode="outlined"
                style={styles.input}
                multiline
              />
            ) : (
              <View style={styles.infoRow}>
                <MaterialIcons name="home" size={20} color="#666" />
                <Paragraph style={styles.infoValue}>{address || 'Not provided'}</Paragraph>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Emergency Contact */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Emergency Contact</Title>
            
            {editing ? (
              <>
                <TextInput
                  label="Emergency Contact Name"
                  value={emergencyContactName}
                  onChangeText={setEmergencyContactName}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="Emergency Contact Phone"
                  value={emergencyContactPhone}
                  onChangeText={setEmergencyContactPhone}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="phone-pad"
                />
              </>
            ) : (
              <>
                <View style={styles.infoRow}>
                  <MaterialIcons name="person" size={20} color="#666" />
                  <Paragraph style={styles.infoValue}>
                    {emergencyContactName || 'Not provided'}
                  </Paragraph>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="phone" size={20} color="#666" />
                  <Paragraph style={styles.infoValue}>
                    {emergencyContactPhone || 'Not provided'}
                  </Paragraph>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Medical Information */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Medical Information</Title>
            
            {editing ? (
              <>
                <TextInput
                  label="Medical History"
                  value={medicalHistory}
                  onChangeText={setMedicalHistory}
                  mode="outlined"
                  style={styles.input}
                  multiline
                  numberOfLines={3}
                />
                <TextInput
                  label="Known Allergies"
                  value={allergies}
                  onChangeText={setAllergies}
                  mode="outlined"
                  style={styles.input}
                  multiline
                />
                <TextInput
                  label="Current Medications"
                  value={currentMedications}
                  onChangeText={setCurrentMedications}
                  mode="outlined"
                  style={styles.input}
                  multiline
                />
              </>
            ) : (
              <>
                <View style={styles.medicalSection}>
                  <Paragraph style={styles.medicalLabel}>Medical History:</Paragraph>
                  <Paragraph style={styles.medicalValue}>
                    {medicalHistory || 'No medical history recorded'}
                  </Paragraph>
                </View>
                
                <Divider style={styles.divider} />
                
                <View style={styles.medicalSection}>
                  <Paragraph style={styles.medicalLabel}>Known Allergies:</Paragraph>
                  <Paragraph style={styles.medicalValue}>
                    {allergies || 'No known allergies'}
                  </Paragraph>
                </View>
                
                <Divider style={styles.divider} />
                
                <View style={styles.medicalSection}>
                  <Paragraph style={styles.medicalLabel}>Current Medications:</Paragraph>
                  <Paragraph style={styles.medicalValue}>
                    {currentMedications || 'No current medications'}
                  </Paragraph>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {editing ? (
            <View style={styles.editingButtons}>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={loading}
                disabled={loading}
                style={styles.saveButton}
              >
                Save Changes
              </Button>
              <Button
                mode="outlined"
                onPress={handleCancel}
                disabled={loading}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
            </View>
          ) : (
            <Button
              mode="contained"
              onPress={() => setEditing(true)}
              style={styles.editButton}
              icon="pencil"
            >
              Edit Profile
            </Button>
          )}

          <Button
            mode="outlined"
            onPress={handleSignOut}
            style={styles.signOutButton}
            textColor="#d32f2f"
            icon="logout"
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
  headerCard: {
    marginBottom: 16,
    elevation: 2,
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    color: '#666',
    marginBottom: 16,
  },
  basicInfo: {
    flexDirection: 'row',
    gap: 24,
  },
  infoText: {
    color: '#666',
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
  input: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoValue: {
    marginLeft: 12,
    flex: 1,
  },
  medicalSection: {
    marginBottom: 8,
  },
  medicalLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  medicalValue: {
    color: '#666',
    lineHeight: 20,
  },
  divider: {
    marginVertical: 12,
  },
  actionButtons: {
    marginTop: 16,
  },
  editingButtons: {
    gap: 12,
    marginBottom: 16,
  },
  saveButton: {
    marginBottom: 8,
  },
  cancelButton: {
    marginBottom: 8,
  },
  editButton: {
    marginBottom: 16,
  },
  signOutButton: {
    borderColor: '#d32f2f',
  },
})

export default PatientProfileScreen

