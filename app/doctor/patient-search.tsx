import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { Text, Button, ActivityIndicator, FAB } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Patient, FieldDoctor } from '../../lib/supabase'
import CleanTextInput from '~/components/input/cleanTextInput'

const PatientSearchScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const doctor = userProfile as FieldDoctor

  useEffect(() => {
    loadPatients()
  }, [])

  useEffect(() => {
    filterPatients()
  }, [searchQuery, patients])

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading patients:', error)
      } else {
        setPatients(data || [])
      }
    } catch (error) {
      console.error('Error loading patients:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filterPatients = () => {
    if (!searchQuery.trim()) {
      setFilteredPatients(patients)
      return
    }

    setSearching(true)
    const query = searchQuery.toLowerCase()
    const filtered = patients.filter(patient =>
      patient.name.toLowerCase().includes(query) ||
      patient.email?.toLowerCase().includes(query) ||
      (patient.phone && patient.phone.includes(query)) ||
      patient.age.toString().includes(query) ||
      patient.gender.toLowerCase().includes(query)
    )
    setFilteredPatients(filtered)
    setSearching(false)
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadPatients()
  }

  const handleStartDiagnosis = (patient: Patient) => {
    const patientParam = encodeURIComponent(JSON.stringify(patient))
    router.push(`/doctor/visit-form?patient=${patientParam}`)
  }

  const handleViewTrends = (patient: Patient) => {
    const patientParam = encodeURIComponent(JSON.stringify(patient))
    router.push(`/doctor/patient-trends?patient=${patientParam}`)
  }

  // ✅ Reuse the same signup flow we added on the dashboard
  const handleCreatePatient = () => {
    router.push('/auth/signup?role=patient&as=doctor&return=/doctor')
  }

  const getGenderIcon = (gender: string) => {
    switch (gender.toLowerCase()) {
      case 'male': return 'male'
      case 'female': return 'female'
      default: return 'person'
    }
  }

  const getGenderColor = (gender: string) => {
    switch (gender.toLowerCase()) {
      case 'male': return '#4285F4'
      case 'female': return '#E91E63'
      default: return '#666666'
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading patients...</Text>
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
          <MaterialIcons name="arrow-back" size={20} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.title}>Search Patients</Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchContainer}>
        <CleanTextInput
          label="Search patients"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Name, email, phone, age, or gender"
          left={
            <MaterialIcons name="search" size={20} color="#666666" style={{ marginLeft: 12 }} />
          }
          right={
            searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <MaterialIcons name="close" size={20} color="#666666" />
              </TouchableOpacity>
            ) : undefined
          }
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {searching && (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="small" color="#4285F4" />
            <Text style={styles.searchingText}>Searching...</Text>
          </View>
        )}

        {filteredPatients.length > 0 ? (
          <>
            <Text style={styles.resultsCount}>
              {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} found
            </Text>
            
            {filteredPatients.map((patient) => (
              <View key={patient.id} style={styles.patientCard}>
                {/* Patient Header */}
                <View style={styles.patientHeader}>
                  <View style={styles.patientIconContainer}>
                    <MaterialIcons 
                      name={getGenderIcon(patient.gender)} 
                      size={24} 
                      color={getGenderColor(patient.gender)}
                    />
                  </View>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    <Text style={styles.patientDetails}>
                      Age {patient.age} • {patient.gender}
                    </Text>
                    <Text style={styles.contactInfo}>{patient.email}</Text>
                    {patient.phone && (
                      <Text style={styles.contactInfo}>{patient.phone}</Text>
                    )}
                  </View>
                </View>

                {/* Medical Information */}
                {(patient.medical_history || patient.allergies || patient.current_medications) && (
                  <View style={styles.medicalSection}>
                    {patient.allergies && (
                      <View style={styles.allergyBadge}>
                        <MaterialIcons name="warning" size={16} color="#FF9800" />
                        <Text style={styles.allergyText}>
                          Allergies: {patient.allergies}
                        </Text>
                      </View>
                    )}
                    
                    {patient.current_medications && (
                      <View style={styles.medicationInfo}>
                        <MaterialIcons name="medication" size={16} color="#4CAF50" />
                        <Text style={styles.medicationText} numberOfLines={2}>
                          Medications: {patient.current_medications}
                        </Text>
                      </View>
                    )}
                    
                    {patient.medical_history && (
                      <View style={styles.historyInfo}>
                        <MaterialIcons name="history" size={16} color="#666666" />
                        <Text style={styles.historyText} numberOfLines={2}>
                          History: {patient.medical_history}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Emergency Contact */}
                {patient.emergency_contact_name && (
                  <View style={styles.emergencyContact}>
                    <MaterialIcons name="contact-emergency" size={16} color="#FF9800" />
                    <Text style={styles.emergencyText} numberOfLines={1}>
                      Emergency: {patient.emergency_contact_name}
                      {patient.emergency_contact_phone && ` (${patient.emergency_contact_phone})`}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <Button
                    mode="contained"
                    onPress={() => handleStartDiagnosis(patient)}
                    style={styles.diagnosisButton}
                    contentStyle={styles.buttonContent}
                    buttonColor="#4285F4"
                    icon={() => <MaterialIcons name="medical-services" size={18} color="#FFFFFF" />}
                  >
                    Start Diagnosis
                  </Button>
                  
                  <Button
                    mode="outlined"
                    onPress={() => handleViewTrends(patient)}
                    style={styles.trendsButton}
                    contentStyle={styles.buttonContent}
                    textColor="#4285F4"
                    icon={() => <MaterialIcons name="trending-up" size={18} color="#4285F4" />}
                  >
                    View Trends
                  </Button>
                </View>
              </View>
            ))}
          </>
        ) : searchQuery ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="person-search" size={48} color="#CCCCCC" />
            </View>
            <Text style={styles.emptyTitle}>No patients found</Text>
            <Text style={styles.emptyText}>
              No patients match "{searchQuery}". Try adjusting your search terms.
            </Text>
            <Button
              mode="outlined"
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchButton}
              textColor="#4285F4"
            >
              Clear Search
            </Button>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="people" size={48} color="#CCCCCC" />
            </View>
            <Text style={styles.emptyTitle}>No patients available</Text>
            <Text style={styles.emptyText}>
              No patients are registered in the system yet. Create a new patient to get started.
            </Text>
            <Button
              mode="contained"
              onPress={handleCreatePatient}
              style={styles.createPatientButton}
              contentStyle={styles.buttonContent}
              buttonColor="#4285F4"
              icon={() => <MaterialIcons name="person-add" size={18} color="#FFFFFF" />}
            >
              Create Patient
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Sticky Create Patient Button (FAB) */}
      <FAB
        style={styles.fab}
        onPress={handleCreatePatient}           
        customSize={56}
        color="#FFFFFF"
        icon={() => (
          <Text style={{ fontSize: 28, marginLeft: 5, marginTop: -5, fontWeight: 'bold', color: '#FFFFFF' }}>
            +
          </Text>
        )}
        accessibilityLabel="Create new patient"
      />
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  clearButton: {
    padding: 8,
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 100,
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
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  searchingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666666',
  },
  resultsCount: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  patientCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  patientIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  medicalSection: {
    marginBottom: 16,
    gap: 8,
  },
  allergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE8CC',
  },
  allergyText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
    flex: 1,
  },
  medicationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  medicationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    flex: 1,
  },
  historyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  historyText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  emergencyContact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE8CC',
    marginBottom: 16,
  },
  emergencyText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  diagnosisButton: {
    flex: 1,
    borderRadius: 8,
  },
  trendsButton: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#4285F4',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  clearSearchButton: {
    borderRadius: 8,
    borderColor: '#4285F4',
  },
  createPatientButton: {
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    backgroundColor: '#4285F4',
  },
})

export default PatientSearchScreen
