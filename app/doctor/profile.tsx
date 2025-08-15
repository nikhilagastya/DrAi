import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { Card, Title, Paragraph, Button, TextInput, Divider } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, FieldDoctor } from '../../lib/supabase'

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
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    )
  }

  if (!doctor) {
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
              <MaterialIcons name="medical-services" size={80} color="#4CAF50" />
            </View>
            <Title style={styles.name}>Dr. {doctor.name}</Title>
            <Paragraph style={styles.email}>{doctor.email}</Paragraph>
            <View style={styles.basicInfo}>
              <Paragraph style={styles.infoText}>
                License: {doctor.license_number}
              </Paragraph>
            </View>
          </Card.Content>
        </Card>

        {/* Professional Information */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Professional Information</Title>
            
            {editing ? (
              <TextInput
                label="Specialization"
                value={specialization}
                onChangeText={setSpecialization}
                mode="outlined"
                style={styles.input}
              />
            ) : (
              <View style={styles.infoRow}>
                <MaterialIcons name="medical-bag" size={20} color="#666" />
                <Paragraph style={styles.infoValue}>
                  {specialization || 'Not specified'}
                </Paragraph>
              </View>
            )}

            {editing ? (
              <TextInput
                label="Years of Experience"
                value={yearsOfExperience}
                onChangeText={setYearsOfExperience}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
              />
            ) : (
              <View style={styles.infoRow}>
                <MaterialIcons name="school" size={20} color="#666" />
                <Paragraph style={styles.infoValue}>
                  {yearsOfExperience ? `${yearsOfExperience} years` : 'Not specified'}
                </Paragraph>
              </View>
            )}

            <View style={styles.infoRow}>
              <MaterialIcons name="card-account-details" size={20} color="#666" />
              <Paragraph style={styles.infoValue}>
                License: {doctor.license_number}
              </Paragraph>
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

            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={20} color="#666" />
              <Paragraph style={styles.infoValue}>{doctor.email}</Paragraph>
            </View>
          </Card.Content>
        </Card>

        {/* Practice Statistics */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Practice Overview</Title>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <MaterialIcons name="people" size={24} color="#2196F3" />
                <Paragraph style={styles.statValue}>-</Paragraph>
                <Paragraph style={styles.statLabel}>Total Patients</Paragraph>
              </View>
              
              <View style={styles.statItem}>
                <MaterialIcons name="event" size={24} color="#4CAF50" />
                <Paragraph style={styles.statValue}>-</Paragraph>
                <Paragraph style={styles.statLabel}>Visits This Month</Paragraph>
              </View>
              
              <View style={styles.statItem}>
                <MaterialIcons name="trending-up" size={24} color="#FF9800" />
                <Paragraph style={styles.statValue}>-</Paragraph>
                <Paragraph style={styles.statLabel}>Success Rate</Paragraph>
              </View>
            </View>
            
            <Paragraph style={styles.statsNote}>
              Statistics will be calculated based on your patient visits and outcomes.
            </Paragraph>
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
    alignItems: 'center',
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  statsNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
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
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    marginBottom: 8,
  },
  editButton: {
    marginBottom: 16,
    backgroundColor: '#4CAF50',
  },
  signOutButton: {
    borderColor: '#d32f2f',
  },
})

export default DoctorProfileScreen

