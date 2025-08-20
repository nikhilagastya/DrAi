import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { Text, Button, ActivityIndicator } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Visit, Patient } from '../../lib/supabase'
import { router } from 'expo-router'

const PatientHomeScreen: React.FC = () => {
  const { user, userProfile } = useAuth()
  const [recentVisits, setRecentVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const patient = userProfile as Patient

  useEffect(() => {
    loadDashboardData()
  }, [patient])

  const loadDashboardData = async () => {
    if (!patient) return

    try {
      // Get recent visits
      const { data: visits, error } = await supabase
        .from('visits')
        .select(`
          *,
          field_doctors (name, specialization)
        `)
        .eq('patient_id', patient.id)
        .order('visit_date', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error loading visits:', error)
      } else {
        setRecentVisits(visits || [])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadDashboardData()
  }

  const getVitalChips = (visit: Visit) => {
    const vitals = []

    if (visit.weight) vitals.push({ label: `${visit.weight}kg`, normal: true })
    if (visit.systolic_bp && visit.diastolic_bp) {
      const isHigh = visit.systolic_bp > 140 || visit.diastolic_bp > 90
      vitals.push({
        label: `${visit.systolic_bp}/${visit.diastolic_bp}`,
        unit: 'mmHg',
        normal: !isHigh
      })
    }
    if (visit.heart_rate) {
      const isNormal = visit.heart_rate >= 60 && visit.heart_rate <= 100
      vitals.push({ 
        label: `${visit.heart_rate}`, 
        unit: 'bpm',
        normal: isNormal 
      })
    }
    if (visit.temperature) {
      const isNormal = visit.temperature <= 37.5
      vitals.push({
        label: `${visit.temperature}°C`,
        normal: isNormal
      })
    }

    return vitals
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const renderVisitCard = (visit: Visit) => (
    <TouchableOpacity 
      key={visit.id} 
      style={styles.visitCard}
      onPress={()=>{}}
    >
      {/* Visit Header */}
      <View style={styles.visitHeader}>
        <View style={styles.visitDateContainer}>
          <Text style={styles.visitDate}>{formatDate(visit.visit_date)}</Text>
          <Text style={styles.visitTime}>{formatTime(visit.visit_date)}</Text>
        </View>
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
            {getVitalChips(visit).slice(0, 4).map((vital, idx) => (
              <View
                key={idx}
                style={[
                  styles.vitalChip,
                  !vital.normal && styles.alertChip
                ]}
              >
                <Text style={[styles.vitalValue, !vital.normal && styles.alertText]}>
                  {vital.label}
                </Text>
                {vital.unit && (
                  <Text style={[styles.vitalUnit, !vital.normal && styles.alertText]}>
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
        <View style={styles.symptomsSection}>
          <Text style={styles.sectionTitle}>Symptoms</Text>
          <Text style={styles.symptomsText} numberOfLines={2}>
            {visit.symptoms}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeHeader}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.nameText}>{patient?.name}</Text>
            </View>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => router.push('/patient/profile')}
            >
              <MaterialIcons name="account-circle" size={32} color="#4285F4" />
            </TouchableOpacity>
          </View>
          <Text style={styles.welcomeSubText}>Here's your health overview</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/patient/history')}>
            <View style={styles.statIcon}>
              <MaterialIcons name="history" size={24} color="#4285F4" />
            </View>
            <Text style={styles.statNumber}>{recentVisits.length}</Text>
            <Text style={styles.statLabel}>Recent Visits</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/patient/AddVitals')}>
            <View style={styles.statIcon}>
              <MaterialIcons name="notes" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.statNumber}>Add</Text>
            <Text style={styles.statLabel}>Vitals Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/patient/profile')}>
            <View style={styles.statIcon}>
              <MaterialIcons name="person" size={24} color="#FF9800" />
            </View>
            <Text style={styles.statNumber}>{patient?.age}</Text>
            <Text style={styles.statLabel}>Years Old</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Visits */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTitle}>Recent Visits</Text>
            <Button 
              onPress={() => router.push('/patient/history')} 
              mode="text" 
              compact
              textColor="#4285F4"
            >
              View All
            </Button>
          </View>

          {recentVisits.length > 0 ? (
            <View style={styles.visitsContainer}>
              {recentVisits.map((visit) => renderVisitCard(visit))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="medical-information" size={48} color="#CCCCCC" />
              </View>
              <Text style={styles.emptyTitle}>No recent visits</Text>
              <Text style={styles.emptyText}>
                Your visit history will appear here after your first appointment
              </Text>
              <Button
                mode="contained"
                onPress={() => router.push('/patient/AddVitals')}
                style={styles.addVitalsButton}
                contentStyle={styles.buttonContent}
                buttonColor="#4285F4"
              >
                Add Vitals Entry
              </Button>
            </View>
          )}
        </View>

        {/* Current Medications */}
        {patient?.current_medications && (
          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Current Medications</Text>
            <View style={styles.medicationCard}>
              <View style={styles.medicationHeader}>
                <MaterialIcons name="medication" size={20} color="#4CAF50" />
                <Text style={styles.medicationTitle}>Active Medications</Text>
              </View>
              <Text style={styles.medicationText}>
                {patient.current_medications}
              </Text>
            </View>
          </View>
        )}

        {/* Health Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>Health Tips</Text>
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <MaterialIcons name="lightbulb" size={20} color="#FF9800" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Stay Hydrated</Text>
              <Text style={styles.tipText}>
                Drink at least 8 glasses of water daily to maintain good health
              </Text>
            </View>
          </View>
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
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333333',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeSubText: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  visitsContainer: {
    gap: 12,
  },
  visitCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  visitDateContainer: {
    flex: 1,
  },
  visitDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  visitTime: {
    fontSize: 14,
    color: '#666666',
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  doctorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  doctorSpecialization: {
    fontSize: 12,
    color: '#666666',
  },
  vitalsSection: {
    marginBottom: 12,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vitalChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    minWidth: 60,
    alignItems: 'center',
  },
  alertChip: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFB3B3',
  },
  vitalValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  vitalUnit: {
    fontSize: 10,
    color: '#666666',
  },
  alertText: {
    color: '#D32F2F',
  },
  symptomsSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  symptomsText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
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
  addVitalsButton: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  medicationCard: {
    backgroundColor: '#F0F8F0',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  medicationText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  tipCard: {
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE8CC',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
})

export default PatientHomeScreen