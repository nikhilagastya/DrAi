import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { Card, Text, TextInput, Button, ActivityIndicator } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Patient, FieldDoctor } from '../../lib/supabase'
import EmptyState from '~/components/EmptyState'


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

  const handlePatientSelect = (patient: Patient) => {
    // Navigate to visit form with selected patient
    const patientParam = encodeURIComponent(JSON.stringify(patient))
    router.push(`/doctor/visit-form?patient=${patientParam}`)
  }

  const formatAge = (age: number) => {
    return `${age} years old`
  }

  const getGenderIcon = (gender: string) => {
    switch (gender.toLowerCase()) {
      case 'male': return 'male'
      case 'female': return 'female'
      default: return 'person'
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading patients...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          label="Search patients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          style={styles.searchInput}
          left={<TextInput.Icon icon="magnify" />}
          right={searchQuery ? <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} /> : undefined}
          placeholder="Name, email, phone, age, or gender"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {searching && (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.searchingText}>Searching...</Text>
          </View>
        )}

        {filteredPatients.length > 0 ? (
          <>
            <Text style={styles.resultsCount}>
              {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} found
            </Text>
            
            {filteredPatients.map((patient) => (
              <Card key={patient.id} style={styles.patientCard}>
                <Card.Content style={styles.patientContent}>
                  <View style={styles.patientHeader}>
                    <View style={styles.patientInfo}>
                      <View style={styles.nameRow}>
                        <MaterialIcons 
                          name={getGenderIcon(patient.gender)} 
                          size={20} 
                          color="#666" 
                        />
                        <Text style={styles.patientName}>{patient.name}</Text>
                      </View>
                      <Text style={styles.patientDetails}>
                        {formatAge(patient.age)} • {patient.gender}
                      </Text>
                      <Text style={styles.contactInfo}>{patient.email}</Text>
                      {patient.phone && (
                        <Text style={styles.contactInfo}>{patient.phone}</Text>
                      )}
                    </View>
                    
                    <Button
                      mode="contained"
                      onPress={() => handlePatientSelect(patient)}
                      style={styles.selectButton}
                      contentStyle={styles.selectButtonContent}
                      compact
                    >
                      Select
                    </Button>
                  </View>

                  {/* Medical Information */}
                  {(patient.medical_history || patient.allergies || patient.current_medications) && (
                    <View style={styles.medicalInfo}>
                      {patient.allergies && (
                        <View style={styles.medicalItem}>
                          <MaterialIcons name="warning" size={16} color="#f44336" />
                          <Text style={styles.allergiesText}>
                            Allergies: {patient.allergies}
                          </Text>
                        </View>
                      )}
                      
                      {patient.current_medications && (
                        <View style={styles.medicalItem}>
                          <MaterialIcons name="medication" size={16} color="#666" />
                          <Text style={styles.medicationsText}>
                            Current Medications: {patient.current_medications}
                          </Text>
                        </View>
                      )}
                      
                      {patient.medical_history && (
                        <View style={styles.medicalItem}>
                          <MaterialIcons name="history" size={16} color="#666" />
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
                      <Text style={styles.emergencyText}>
                        Emergency: {patient.emergency_contact_name}
                        {patient.emergency_contact_phone && ` (${patient.emergency_contact_phone})`}
                      </Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            ))}
          </>
        ) : searchQuery ? (
          <EmptyState
            icon="person-search"
            title="No patients found"
            description={`No patients match "${searchQuery}". Try adjusting your search terms.`}
            actionText="Clear Search"
            onAction={() => setSearchQuery('')}
          />
        ) : (
          <EmptyState
            icon="people"
            title="No patients available"
            description="No patients are registered in the system yet."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  searchInput: {
    marginBottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  searchingText: {
    marginLeft: 8,
    color: '#666',
  },
  scrollContent: {
    padding: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  patientCard: {
    marginBottom: 16,
    elevation: 2,
  },
  patientContent: {
    padding: 16,
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientInfo: {
    flex: 1,
    marginRight: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  patientDetails: {
    color: '#666',
    marginBottom: 4,
  },
  contactInfo: {
    color: '#666',
    fontSize: 14,
    marginBottom: 2,
  },
  selectButton: {
    backgroundColor: '#4CAF50',
  },
  selectButtonContent: {
    paddingHorizontal: 8,
  },
  medicalInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  medicalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  allergiesText: {
    marginLeft: 8,
    color: '#f44336',
    fontSize: 14,
    flex: 1,
  },
  medicationsText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
    flex: 1,
  },
  historyText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
    flex: 1,
  },
  emergencyContact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 6,
  },
  emergencyText: {
    marginLeft: 8,
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '500',
  },
})

export default PatientSearchScreen

