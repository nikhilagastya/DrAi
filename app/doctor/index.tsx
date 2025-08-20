import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, Dimensions } from 'react-native'
import { Text, ActivityIndicator } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useRouter } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Visit, FieldDoctor } from '../../lib/supabase'
import Loader from '~/components/Loader'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

interface VisitDetailsModalProps {
  visible: boolean
  visit: Visit | null
  onClose: () => void
}

const VisitDetailsModal: React.FC<VisitDetailsModalProps> = ({ visible, visit, onClose }) => {
  if (!visit) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getVitalStatus = (value: number | null, normalRange: { min?: number; max?: number }, unit: string) => {
    if (!value) return { status: 'Not recorded', color: '#999999', bgColor: '#F5F5F5' }
    
    const isHigh = normalRange.max && value > normalRange.max
    const isLow = normalRange.min && value < normalRange.min
    
    if (isHigh) return { status: 'High', color: '#F44336', bgColor: '#FFEBEE' }
    if (isLow) return { status: 'Low', color: '#FF9800', bgColor: '#FFF3E0' }
    return { status: 'Normal', color: '#4CAF50', bgColor: '#E8F5E8' }
  }

  const renderVitalCard = (
    title: string, 
    value: number | null, 
    unit: string, 
    icon: string, 
    normalRange: { min?: number; max?: number }
  ) => {
    const vitalStatus = getVitalStatus(value, normalRange, unit)
    
    return (
      <View style={styles.vitalCard}>
        <View style={styles.vitalHeader}>
          <MaterialIcons name={icon as any} size={20} color="#4285F4" />
          <Text style={styles.vitalTitle}>{title}</Text>
        </View>
        <Text style={styles.vitalValue}>
          {value ? `${value} ${unit}` : 'Not recorded'}
        </Text>
        <View style={[styles.vitalStatus, { backgroundColor: vitalStatus.bgColor }]}>
          <Text style={[styles.vitalStatusText, { color: vitalStatus.color }]}>
            {vitalStatus.status}
          </Text>
        </View>
      </View>
    )
  }

  const renderInfoSection = (title: string, content: string | null, icon: string) => {
    if (!content) return null
    
    return (
      <View style={styles.infoSection}>
        <View style={styles.infoHeader}>
          <MaterialIcons name={icon as any} size={20} color="#4285F4" />
          <Text style={styles.infoTitle}>{title}</Text>
        </View>
        <Text style={styles.infoContent}>{content}</Text>
      </View>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <MaterialIcons name="medical-information" size={24} color="#4285F4" />
            <Text style={styles.modalTitle}>Visit Details</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#333333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Patient Information */}
          <View style={styles.section}>
            <View style={styles.patientHeader}>
              <View style={styles.patientAvatar}>
                <MaterialIcons name="person" size={32} color="#4285F4" />
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>
                  {(visit as any).patients?.name || 'Unknown Patient'}
                </Text>
                <Text style={styles.visitDate}>{formatDate(visit.visit_date)}</Text>
                <View style={styles.patientMeta}>
                  <Text style={styles.patientAge}>
                    Age: {(visit as any).patients?.age || 'N/A'}
                  </Text>
                  <Text style={styles.patientGender}>
                    Gender: {(visit as any).patients?.gender || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Vital Signs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vital Signs</Text>
            <View style={styles.vitalsGrid}>
              {renderVitalCard(
                'Blood Pressure',
                visit.systolic_bp && visit.diastolic_bp 
                  ? `${visit.systolic_bp}/${visit.diastolic_bp}` as any
                  : null,
                'mmHg',
                'monitor-heart',
                { max: 140 }
              )}
              {renderVitalCard(
                'Heart Rate',
                visit.heart_rate,
                'bpm',
                'favorite',
                { min: 60, max: 100 }
              )}
              {renderVitalCard(
                'Temperature',
                visit.temperature,
                '°C',
                'thermostat',
                { max: 37.5 }
              )}
              {renderVitalCard(
                'Blood Sugar',
                visit.blood_sugar,
                'mg/dL',
                'bloodtype',
                { min: 70, max: 180 }
              )}
              {renderVitalCard(
                'Oxygen Saturation',
                visit.oxygen_saturation,
                '%',
                'air',
                { min: 95 }
              )}
              {renderVitalCard(
                'Weight',
                visit.weight,
                'kg',
                'monitor-weight',
                {}
              )}
            </View>
          </View>

          {/* Clinical Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clinical Information</Text>
            
            {renderInfoSection('Symptoms', visit.symptoms, 'sick')}
            {renderInfoSection('Diagnosis', visit.diagnosis, 'medical-information')}
            {renderInfoSection('Treatment Notes', visit.treatment_notes, 'healing')}
            {renderInfoSection('Prescribed Medications', visit.prescribed_medications, 'medication')}
            {renderInfoSection('Follow-up Instructions', visit.follow_up_instructions, 'assignment')}
            
            {/* Visit Type and Status */}
            <View style={styles.visitMetadata}>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Visit Type</Text>
                <View style={styles.metadataBadge}>
                  <Text style={styles.metadataValue}>
                    {visit.visit_type || 'Standard Consultation'}
                  </Text>
                </View>
              </View>
              
              {visit.urgency_level && (
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Urgency Level</Text>
                  <View style={[
                    styles.metadataBadge, 
                    visit.urgency_level === 'urgent' ? styles.urgentBadge :
                    visit.urgency_level === 'high' ? styles.highBadge :
                    visit.urgency_level === 'medium' ? styles.mediumBadge :
                    styles.lowBadge
                  ]}>
                    <Text style={[
                      styles.metadataValue,
                      visit.urgency_level === 'urgent' || visit.urgency_level === 'high' 
                        ? styles.whiteText : styles.darkText
                    ]}>
                      {visit.urgency_level.charAt(0).toUpperCase() + visit.urgency_level.slice(1)}
                    </Text>
                  </View>
                </View>
              )}
              
              {visit.confidence_level && (
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Confidence Level</Text>
                  <View style={styles.metadataBadge}>
                    <Text style={styles.metadataValue}>
                      {visit.confidence_level.charAt(0).toUpperCase() + visit.confidence_level.slice(1)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={()=>{ onClose() ; router.push(`/doctor/edit-visit?visitId=${visit.id}`)}}>
              <MaterialIcons name="edit" size={20} color="#4285F4" />
              <Text style={styles.actionButtonText}>Edit Visit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="print" size={20} color="#4285F4" />
              <Text style={styles.actionButtonText}>Generate Report</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const index: React.FC = () => {
  console.log("🏠 DoctorHomeScreen rendered")
  
  const { userProfile, user, loading } = useAuth()
  const router = useRouter()
  const [recentVisits, setRecentVisits] = useState<Visit[]>([])
  const [todayVisits, setTodayVisits] = useState<Visit[]>([])
  const [stats, setStats] = useState({
    totalPatients: 0,
    visitsThisWeek: 0,
    visitsToday: 0,
  })
  const [loading1, setLoading1] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Modal state
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  if(loading){
    return <Loader isOpen={loading}></Loader>
  }

  const doctor = userProfile as FieldDoctor
  
  console.log("👨‍⚕️ Doctor data:", { 
    hasDoctor: !!doctor, 
    doctorName: doctor?.name,
    hasUser: !!user 
  })

  useEffect(() => {
    console.log("🔄 useEffect triggered, loading dashboard data")
    loadDashboardData()
  }, [doctor?.id])

  const loadDashboardData = async () => {
    if (!doctor?.id) {
      console.log("⚠️ No doctor ID, skipping data load")
      setLoading1(false)
      return
    }

    console.log("📊 Loading dashboard data for doctor:", doctor.id)

    try {
      // Get recent visits
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select(`
          *,
          patients (name, age, gender)
        `)
        .eq('doctor_id', doctor.id)
        .order('visit_date', { ascending: false })
        .limit(5)

      if (visitsError) {
        console.error('❌ Error loading visits:', visitsError)
      } else {
        console.log("✅ Recent visits loaded:", visits?.length || 0)
        setRecentVisits(visits || [])
      }

      // Get today's visits
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      const { data: todayData, error: todayError } = await supabase
        .from('visits')
        .select(`
          *,
          patients (name, age, gender)
        `)
        .eq('doctor_id', doctor.id)
        .gte('visit_date', startOfDay.toISOString())
        .lt('visit_date', endOfDay.toISOString())
        .order('visit_date', { ascending: false })

      if (todayError) {
        console.error('❌ Error loading today visits:', todayError)
      } else {
        console.log("✅ Today's visits loaded:", todayData?.length || 0)
        setTodayVisits(todayData || [])
      }

      // Get stats
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const { data: weekVisits, error: weekError } = await supabase
        .from('visits')
        .select('id')
        .eq('doctor_id', doctor.id)
        .gte('visit_date', startOfWeek.toISOString())

      const { data: uniquePatients, error: patientsError } = await supabase
        .from('visits')
        .select('patient_id')
        .eq('doctor_id', doctor.id)

      if (!weekError && !patientsError) {
        const uniquePatientIds = new Set(uniquePatients?.map(v => v.patient_id) || [])
        const newStats = {
          totalPatients: uniquePatientIds.size,
          visitsThisWeek: weekVisits?.length || 0,
          visitsToday: todayData?.length || 0,
        }
        console.log("📈 Stats loaded:", newStats)
        setStats(newStats)
      }

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error)
    } finally {
      setLoading1(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    console.log("🔄 Refreshing dashboard data")
    setRefreshing(true)
    loadDashboardData()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getVitalStatus = (visit: Visit) => {
    const issues = []
    if (visit.systolic_bp && visit.systolic_bp > 140) issues.push('High BP')
    if (visit.blood_sugar && visit.blood_sugar > 180) issues.push('High Blood Sugar')
    if (visit.temperature && visit.temperature > 37.5) issues.push('Fever')
    return issues.length > 0 ? issues : ['Normal']
  }

  const handleVisitPress = (visit: Visit) => {
    setSelectedVisit(visit)
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setSelectedVisit(null)
  }

  // Show loading or error state if no doctor data
  if (!doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color="#E8E8E8" />
          <Text style={styles.errorText}>Unable to load doctor profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadDashboardData()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <MaterialIcons name="person" size={24} color="#4285F4" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.welcomeText}>Welcome back!</Text>
              <Text style={styles.doctorName}>Dr. {doctor?.name}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <MaterialIcons name="notifications-none" size={24} color="#333333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
                <MaterialIcons name="people" size={24} color="#4285F4" />
              </View>
              <Text style={styles.statNumber}>{stats.totalPatients}</Text>
              <Text style={styles.statLabel}>Total Patients</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
                <MaterialIcons name="today" size={24} color="#FF9800" />
              </View>
              <Text style={styles.statNumber}>{stats.visitsToday}</Text>
              <Text style={styles.statLabel}>Today's Visits</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#E8F5E8' }]}>
                <MaterialIcons name="trending-up" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.statNumber}>{stats.visitsThisWeek}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/doctor/patient-search')}>
              <View style={[styles.actionIcon, { backgroundColor: '#F0F7FF' }]}>
                <MaterialIcons name="person-search" size={28} color="#4285F4" />
              </View>
              <Text style={styles.actionLabel}>Find Patient</Text>
            </TouchableOpacity>

            {/* ⭐ changed: add navigation to signup with patient preset */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                router.push('/auth/signup?role=patient&as=doctor&return=/doctor')
              }
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FFF5F5' }]}>
                <MaterialIcons name="add-circle-outline" size={28} color="#FF5722" />
              </View>
              <Text style={styles.actionLabel}>New Patient</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Visits */}
        <View style={styles.visitsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Visits</Text>
            <TouchableOpacity>
              {/* <Text style={styles.viewAllButton}>View All</Text> */}
            </TouchableOpacity>
          </View>

          {loading1 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4285F4" />
              <Text style={styles.loadingText}>Loading visits...</Text>
            </View>
          ) : todayVisits.length > 0 ? (
            <View style={styles.visitsContainer}>
              {todayVisits.map((visit, index) => (
                <TouchableOpacity 
                  key={visit.id} 
                  style={styles.visitCard}
                  onPress={() => handleVisitPress(visit)}
                >
                  <View style={styles.visitHeader}>
                    <View style={styles.patientAvatar}>
                      <MaterialIcons name="person" size={20} color="#4285F4" />
                    </View>
                    <View style={styles.visitInfo}>
                      <Text style={styles.patientName}>
                        {(visit as any).patients?.name || 'Unknown Patient'}
                      </Text>
                      <Text style={styles.visitTime}>
                        {formatDate(visit.visit_date)}
                      </Text>
                      {visit.symptoms && (
                        <Text style={styles.symptoms} numberOfLines={1}>
                          {visit.symptoms}
                        </Text>
                      )}
                    </View>
                    <View style={styles.visitStatus}>
                      {getVitalStatus(visit).map((status, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.statusBadge,
                            status === 'Normal' ? styles.normalBadge : styles.alertBadge
                          ]}
                        >
                          <Text style={[
                            styles.statusText,
                            status === 'Normal' ? styles.normalText : styles.alertText
                          ]}>
                            {status}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="event-available" size={48} color="#E8E8E8" />
              </View>
              <Text style={styles.emptyTitle}>No visits today</Text>
              <Text style={styles.emptySubtitle}>Your schedule is clear for today</Text>
            </View>
          )}
        </View>

        {/* Recent Visits */}
        <View style={styles.visitsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              {/* <Text style={styles.viewAllButton}>View All</Text> */}
            </TouchableOpacity>
          </View>

        {recentVisits.length > 0 ? (
            <View style={styles.visitsContainer}>
              {recentVisits.map((visit, index) => (
                <TouchableOpacity 
                  key={visit.id} 
                  style={styles.visitCard}
                  onPress={() => handleVisitPress(visit)}
                >
                  <View style={styles.visitHeader}>
                    <View style={styles.patientAvatar}>
                      <MaterialIcons name="person" size={20} color="#4285F4" />
                    </View>
                    <View style={styles.visitInfo}>
                      <Text style={styles.patientName}>
                        {(visit as any).patients?.name || 'Unknown Patient'}
                      </Text>
                      <Text style={styles.visitTime}>
                        {formatDate(visit.visit_date)}
                      </Text>
                      {visit.diagnosis && (
                        <Text style={styles.diagnosis} numberOfLines={1}>
                          {visit.diagnosis}
                        </Text>
                      )}
                    </View>
                    <View style={styles.visitStatus}>
                      {getVitalStatus(visit).map((status, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.statusBadge,
                            status === 'Normal' ? styles.normalBadge : styles.alertBadge
                          ]}
                        >
                          <Text style={[
                            styles.statusText,
                            status === 'Normal' ? styles.normalText : styles.alertText
                          ]}>
                            {status}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="medical-information" size={48} color="#E8E8E8" />
              </View>
              <Text style={styles.emptyTitle}>No recent visits</Text>
              <Text style={styles.emptySubtitle}>Recent patient consultations will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Visit Details Modal */}
      <VisitDetailsModal
        visible={modalVisible}
        visit={selectedVisit}
        onClose={closeModal}
      />
    </SafeAreaView>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#666666',
    marginVertical: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  statsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    fontSize: 14,
    color: '#4285F4',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
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
  actionsSection: {
    marginBottom: 32,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  visitsSection: {
    marginBottom: 24,
  },
  visitsContainer: {
    gap: 8,
  },
  visitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  visitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  visitInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  visitTime: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  symptoms: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
  },
  diagnosis: {
    fontSize: 12,
    color: '#4285F4',
    fontWeight: '500',
  },
  visitStatus: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  normalBadge: {
    backgroundColor: '#E8F5E8',
  },
  alertBadge: {
    backgroundColor: '#FFF5F5',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  normalText: {
    color: '#4CAF50',
  },
  alertText: {
    color: '#F44336',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  patientInfo: {
    flex: 1,
    marginLeft: 16,
  },
  visitDate: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  patientMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  patientAge: {
    fontSize: 12,
    color: '#999999',
  },
  patientGender: {
    fontSize: 12,
    color: '#999999',
  },
  vitalsGrid: {
    gap: 12,
  },
  vitalCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  vitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vitalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  vitalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  vitalStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  vitalStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  infoContent: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginLeft: 28,
  },
  visitMetadata: {
    marginTop: 16,
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  metadataBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metadataValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  urgentBadge: {
    backgroundColor: '#F44336',
  },
  highBadge: {
    backgroundColor: '#FF9800',
  },
  mediumBadge: {
    backgroundColor: '#FFF3E0',
  },
  lowBadge: {
    backgroundColor: '#E8F5E8',
  },
  whiteText: {
    color: '#FFFFFF',
  },
  darkText: {
    color: '#333333',
  },
  actionButtons: {
    gap: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4285F4',
    marginLeft: 8,
  },
})

export default index