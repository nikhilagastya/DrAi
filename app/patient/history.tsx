import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { Text, FAB, Button, ActivityIndicator } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Visit, Patient } from '../../lib/supabase'
import { useRouter } from 'expo-router'

const PatientHistoryScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'doctor' | 'ai'>('doctor')
  const [visits, setVisits] = useState<Visit[]>([])
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([])
  const [aiSessions, setAiSessions] = useState<Visit[]>([])
  const [filteredAiSessions, setFilteredAiSessions] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const patient = userProfile as Patient

  useEffect(() => {
    loadVisits()
  }, [])

  const loadVisits = async () => {
    if (!patient) return

    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          field_doctors (name, specialization)
        `)
        .eq('patient_id', patient.id)
        .order('visit_date', { ascending: false })

      if (error) {
        console.error('Error loading visits:', error)
      } else {
        const physicalVisits = data?.filter(visit => visit.visit_type !== 'virtual_consultation') || []
        setVisits(physicalVisits || [])
        setFilteredVisits(physicalVisits || [])

        const virtual_consultation = data?.filter(visit => visit.visit_type === 'virtual_consultation') || []
        setAiSessions(virtual_consultation)
        setFilteredAiSessions(virtual_consultation)
      }
    } catch (error) {
      console.error('Error loading visits:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadVisits()
    setRefreshing(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getVitalChips = (visit: Visit) => {
    const vitals = []

    if (visit.weight) vitals.push({ label: `${visit.weight} kg`, icon: 'scale' })
    if (visit.systolic_bp && visit.diastolic_bp) {
      const isHigh = visit.systolic_bp > 140 || visit.diastolic_bp > 90
      vitals.push({
        label: `${visit.systolic_bp}/${visit.diastolic_bp}`,
        unit: 'mmHg',
        alert: isHigh
      })
    }
    if (visit.heart_rate) vitals.push({ label: `${visit.heart_rate}`, unit: 'bpm' })
    if (visit.temperature) {
      const isHigh = visit.temperature > 37.5
      vitals.push({
        label: `${visit.temperature}°C`,
        alert: isHigh
      })
    }
    if (visit.blood_sugar) {
      const isHigh = visit.blood_sugar > 180
      vitals.push({
        label: `${visit.blood_sugar}`,
        unit: 'mg/dL',
        alert: isHigh
      })
    }
    if (visit.oxygen_saturation) vitals.push({ label: `${visit.oxygen_saturation}%`, unit: 'O₂' })

    return vitals
  }

  const handleEditVisit = (visit: Visit) => {
    const visitParam = encodeURIComponent(JSON.stringify(visit))
    router.push(`/patient/edit-visit?visit=${visitParam}`)
  }

  const renderVisitCard = (visit: Visit, index: number) => (
    <View key={visit.id} style={styles.visitCard}>
      {/* Visit Header */}
      <View style={styles.visitHeader}>
        <View style={styles.visitDateContainer}>
          <Text style={styles.visitDate}>{formatDate(visit.visit_date)}</Text>
          <Text style={styles.visitTime}>{formatTime(visit.visit_date)}</Text>
        </View>
        {
          visit.doctor_id &&
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditVisit(visit)}
          >
            <MaterialIcons name="edit" size={20} color="#4285F4" />
          </TouchableOpacity>
        }
      </View>

      {/* Doctor Info */}
      {(visit as any).field_doctors ? (
        <View style={styles.doctorInfo}>
          <View style={styles.doctorIcon}>
            <MaterialIcons name="local-hospital" size={16} color="#4285F4" />
          </View>
          <View style={styles.doctorDetails}>
            <Text style={styles.doctorName}>
              Dr. {(visit as any).field_doctors?.name}
            </Text>
            <Text style={styles.doctorSpecialization}>
              {(visit as any).field_doctors?.specialization}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.doctorInfo}>
          <View style={styles.doctorIcon}>
            <MaterialIcons name="self-improvement" size={16} color="#4CAF50" />
          </View>
          <View style={styles.doctorDetails}>
            <Text style={styles.doctorName}>Self-recorded</Text>
            <Text style={styles.doctorSpecialization}>Personal entry</Text>
          </View>
        </View>
      )}

      {/* Vital Signs */}
      {getVitalChips(visit).length > 0 && (
        <View style={styles.vitalsSection}>
          <Text style={styles.sectionTitle}>Vitals</Text>
          <View style={styles.vitalsGrid}>
            {getVitalChips(visit).map((vital, idx) => (
              <View
                key={idx}
                style={[
                  styles.vitalChip,
                  vital.alert && styles.alertChip
                ]}
              >
                <Text style={[styles.vitalValue, vital.alert && styles.alertText]}>
                  {vital.label}
                </Text>
                {vital.unit && (
                  <Text style={[styles.vitalUnit, vital.alert && styles.alertText]}>
                    {vital.unit}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Symptoms */}
      {visit.symptoms && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Symptoms</Text>
          <Text style={styles.sectionContent}>{visit.symptoms}</Text>
        </View>
      )}

      {/* Diagnosis */}
      {visit.diagnosis && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnosis</Text>
          <Text style={styles.sectionContent}>{visit.diagnosis}</Text>
        </View>
      )}

      {/* Treatment Notes */}
      {visit.treatment_notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Treatment</Text>
          <Text style={styles.sectionContent}>{visit.treatment_notes}</Text>
        </View>
      )}

      {/* Medications */}
      {visit.prescribed_medications && (
        <View style={styles.medicationSection}>
          <Text style={styles.sectionTitle}>Medications</Text>
          <Text style={styles.medicationContent}>{visit.prescribed_medications}</Text>
        </View>
      )}
    </View>
  )

  const renderDoctorTab = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {filteredVisits.length > 0 ? (
        filteredVisits.map((visit, index) => renderVisitCard(visit, index))
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <MaterialIcons name="medical-information" size={48} color="#CCCCCC" />
          </View>
          <Text style={styles.emptyTitle}>No doctor visits yet</Text>
          <Text style={styles.emptyText}>
            Your doctor visit history will appear here after your first appointment
          </Text>
        </View>
      )}
    </ScrollView>
  )

  const renderAiTab = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {filteredAiSessions.length > 0 ? (
        filteredAiSessions.map((visit, index) => renderVisitCard(visit, index))
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <MaterialIcons name="psychology" size={48} color="#CCCCCC" />
          </View>
          <Text style={styles.emptyTitle}>No AI sessions yet</Text>
          <Text style={styles.emptyText}>
            Start a conversation with the AI assistant to see your interaction history here
          </Text>
        </View>
      )}
    </ScrollView>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Header */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'doctor' && styles.activeTab]}
          onPress={() => setActiveTab('doctor')}
        >
          <MaterialIcons
            name="local-hospital"
            size={20}
            color={activeTab === 'doctor' ? '#4285F4' : '#999999'}
          />
          <Text style={[styles.tabText, activeTab === 'doctor' && styles.activeTabText]}>
            Visits
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai' && styles.activeTab]}
          onPress={() => setActiveTab('ai')}
        >
          <MaterialIcons
            name="psychology"
            size={20}
            color={activeTab === 'ai' ? '#4285F4' : '#999999'}
          />
          <Text style={[styles.tabText, activeTab === 'ai' && styles.activeTabText]}>
            AI Sessions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : (
        /* Tab Content */
        activeTab === 'doctor' ? renderDoctorTab() : renderAiTab()
      )}

      {/* Sticky Add Button */}
      <FAB
        style={styles.fab}
        onPress={() => router.push('/patient/AddVitals')}
        customSize={56}
        color="#FFFFFF"
        icon={() => (
          <Text style={{ fontSize: 28,marginLeft:5,marginTop:-5, fontWeight: "bold", color: "#FFFFFF" }}>+</Text>
        )}
      />

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: -55
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#F0F7FF',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#999999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4285F4',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for FAB
  },
  visitCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  visitDateContainer: {
    flex: 1,
  },
  visitDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  visitTime: {
    fontSize: 14,
    color: '#666666',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  doctorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  doctorSpecialization: {
    fontSize: 14,
    color: '#666666',
  },
  vitalsSection: {
    marginBottom: 16,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vitalChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    minWidth: 80,
    alignItems: 'center',
  },
  alertChip: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFB3B3',
  },
  vitalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  vitalUnit: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  alertText: {
    color: '#D32F2F',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  medicationSection: {
    marginBottom: 16,
  },
  medicationContent: {
    fontSize: 14,
    color: '#2E7D32',
    backgroundColor: '#F0F8F0',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    lineHeight: 20,
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
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    backgroundColor: '#4285F4',

  },
})

export default PatientHistoryScreen