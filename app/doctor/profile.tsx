import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native'
import { Text, ActivityIndicator } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, FieldDoctor } from '../../lib/supabase'
import { router } from 'expo-router'
import CleanTextInput from '~/components/input/cleanTextInput'

const DoctorProfileScreen: React.FC = () => {
  const { userProfile, signOut, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const doctor = userProfile as FieldDoctor

  // Editable fields
  const [phone, setPhone] = useState(doctor?.phone || '')
  const [specialization, setSpecialization] = useState(doctor?.specialization || '')
  const [yearsOfExperience, setYearsOfExperience] = useState(doctor?.years_of_experience?.toString() || '')

  const handleSave = async () => {
    if (!doctor) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('field_doctors')
        .update({
          phone,
          specialization,
          years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
        })
        .eq('id', doctor.id)

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
    setPhone(doctor?.phone || '')
    setSpecialization(doctor?.specialization || '')
    setYearsOfExperience(doctor?.years_of_experience?.toString() || '')
    setEditing(false)
  }

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            signOut()
            router.replace('/auth')
          },
        },
      ]
    )
  }

  if (!doctor) {
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.editHeaderButton}
          onPress={() => setEditing(!editing)}
        >
          <MaterialIcons 
            name={editing ? "close" : "edit"} 
            size={24} 
            color="#4285F4" 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="person" size={48} color="#4285F4" />
          </View>
          <Text style={styles.doctorName}>Dr. {doctor.name}</Text>
          <Text style={styles.doctorEmail}>{doctor.email}</Text>
          <View style={styles.licenseContainer}>
            <MaterialIcons name="verified" size={16} color="#4CAF50" />
            <Text style={styles.licenseText}>License: {doctor.license_number}</Text>
          </View>
        </View>

        {/* Professional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>
          
          <View style={styles.card}>
            <View style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <MaterialIcons name="medical-information" size={20} color="#4285F4" />
                <Text style={styles.fieldLabel}>Specialization</Text>
              </View>
              {editing ? (
                <CleanTextInput
                  label="Specialization"
                  value={specialization}
                  onChangeText={setSpecialization}
                  placeholder="Enter your specialization"
                  style={styles.input}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {specialization || 'Not specified'}
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <MaterialIcons name="school" size={20} color="#4285F4" />
                <Text style={styles.fieldLabel}>Years of Experience</Text>
              </View>
              {editing ? (
                <CleanTextInput
                  label="Years of Experience"
                  value={yearsOfExperience}
                  onChangeText={setYearsOfExperience}
                  placeholder="Enter years of experience"
                  keyboardType="numeric"
                  style={styles.input}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {yearsOfExperience ? `${yearsOfExperience} years` : 'Not specified'}
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <MaterialIcons name="badge" size={20} color="#4285F4" />
                <Text style={styles.fieldLabel}>Medical License</Text>
              </View>
              <Text style={styles.fieldValue}>{doctor.license_number}</Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.card}>
            <View style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <MaterialIcons name="phone" size={20} color="#4285F4" />
                <Text style={styles.fieldLabel}>Phone Number</Text>
              </View>
              {editing ? (
                <CleanTextInput
                  label="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {phone || 'Not provided'}
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <MaterialIcons name="email" size={20} color="#4285F4" />
                <Text style={styles.fieldLabel}>Email Address</Text>
              </View>
              <Text style={styles.fieldValue}>{doctor.email}</Text>
            </View>
          </View>
        </View>

        {/* Practice Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Practice Overview</Text>
          
          <View style={styles.card}>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
                  <MaterialIcons name="people" size={24} color="#4285F4" />
                </View>
                <Text style={styles.statValue}>-</Text>
                <Text style={styles.statLabel}>Total Patients</Text>
              </View>
              
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: '#E8F5E8' }]}>
                  <MaterialIcons name="event" size={24} color="#4CAF50" />
                </View>
                <Text style={styles.statValue}>-</Text>
                <Text style={styles.statLabel}>Visits This Month</Text>
              </View>
              
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
                  <MaterialIcons name="trending-up" size={24} color="#FF9800" />
                </View>
                <Text style={styles.statValue}>-</Text>
                <Text style={styles.statLabel}>Success Rate</Text>
              </View>
            </View>
            
            <Text style={styles.statsNote}>
              Statistics will be calculated based on your patient visits and outcomes.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {editing ? (
            <View style={styles.editingButtons}>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.secondaryButton, loading && styles.disabledButton]}
                onPress={handleCancel}
                disabled={loading}
              >
                <MaterialIcons name="close" size={20} color="#4285F4" />
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setEditing(true)}
            >
              <MaterialIcons name="edit" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleSignOut}
          >
            <MaterialIcons name="logout" size={20} color="#F44336" />
            <Text style={styles.dangerButtonText}>Sign Out</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  editHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#4285F4',
  },
  doctorName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  doctorEmail: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 12,
  },
  licenseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  licenseText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  fieldContainer: {
    paddingVertical: 4,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#666666',
    marginLeft: 28,
  },
  input: {
    marginLeft: 28,
    marginBottom: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '500',
  },
  statsNote: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  actionSection: {
    marginTop: 8,
    marginBottom: 32,
  },
  editingButtons: {
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#4285F4',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  secondaryButtonText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dangerButton: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  dangerButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
})

export default DoctorProfileScreen