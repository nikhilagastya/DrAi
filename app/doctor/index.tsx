import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { Card, Text, Button, Chip, Divider } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Visit, FieldDoctor } from '../../lib/supabase'

const DoctorHomeScreen: React.FC = () => {
  console.log("hi from DoctorHomeScreen")
  const { userProfile } = useAuth()
  const [recentVisits, setRecentVisits] = useState<Visit[]>([])
  const [todayVisits, setTodayVisits] = useState<Visit[]>([])
  const [stats, setStats] = useState({
    totalPatients: 0,
    visitsThisWeek: 0,
    visitsToday: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const doctor = userProfile as FieldDoctor

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    if (!doctor) return

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
        console.error('Error loading visits:', visitsError)
      } else {
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
        console.error('Error loading today visits:', todayError)
      } else {
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
        setStats({
          totalPatients: uniquePatientIds.size,
          visitsThisWeek: weekVisits?.length || 0,
          visitsToday: todayData?.length || 0,
        })
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Section */}
        <Card style={styles.welcomeCard}>
          <Card.Content>
            <View style={styles.welcomeHeader}>
              <MaterialIcons name="medical-services" size={32} color="#4CAF50" />
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeText}>Welcome, Dr. {doctor?.name}!</Text>
                <Text style={styles.welcomeSubText}>
                  {doctor?.specialization}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialIcons name="people" size={24} color="#2196F3" />
              <Text style={styles.statNumber}>{stats.totalPatients}</Text>
              <Text style={styles.statLabel}>Total Patients</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialIcons name="calendar-today" size={24} color="#FF9800" />
              <Text style={styles.statNumber}>{stats.visitsToday}</Text>
              <Text style={styles.statLabel}>Today's Visits</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialIcons name="trending-up" size={24} color="#4CAF50" />
              <Text style={styles.statNumber}>{stats.visitsThisWeek}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Today's Visits */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Visits</Text>
              <Button mode="text" compact>View All</Button>
            </View>

            {todayVisits.length > 0 ? (
              todayVisits.map((visit, index) => (
                <View key={visit.id}>
                  <View style={styles.visitItem}>
                    <View style={styles.visitHeader}>
                      <View style={styles.visitInfo}>
                        <Text style={styles.patientName}>
                          {(visit as any).patients?.name}
                        </Text>
                        <Text style={styles.visitTime}>
                          {formatDate(visit.visit_date)}
                        </Text>
                      </View>
                      <View style={styles.visitStatus}>
                        {getVitalStatus(visit).map((status, idx) => (
                          <Chip
                            key={idx}
                            mode="outlined"
                            compact
                            style={[
                              styles.statusChip,
                              status === 'Normal' ? styles.normalChip : styles.alertChip
                            ]}
                          >
                            {status}
                          </Chip>
                        ))}
                      </View>
                    </View>

                    {visit.symptoms && (
                      <Text style={styles.visitSymptoms}>
                        Symptoms: {visit.symptoms}
                      </Text>
                    )}
                  </View>

                  {index < todayVisits.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-available" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No visits scheduled for today</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Recent Visits */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Visits</Text>
              <Button mode="text" compact>View All</Button>
            </View>

            {recentVisits.length > 0 ? (
              recentVisits.map((visit, index) => (
                <View key={visit.id}>
                  <View style={styles.visitItem}>
                    <View style={styles.visitHeader}>
                      <View style={styles.visitInfo}>
                        <Text style={styles.patientName}>
                          {(visit as any).patients?.name}
                        </Text>
                        <Text style={styles.visitTime}>
                          {formatDate(visit.visit_date)}
                        </Text>
                      </View>
                      <View style={styles.visitStatus}>
                        {getVitalStatus(visit).map((status, idx) => (
                          <Chip
                            key={idx}
                            mode="outlined"
                            compact
                            style={[
                              styles.statusChip,
                              status === 'Normal' ? styles.normalChip : styles.alertChip
                            ]}
                          >
                            {status}
                          </Chip>
                        ))}
                      </View>
                    </View>

                    {visit.diagnosis && (
                      <Text style={styles.visitDiagnosis}>
                        Diagnosis: {visit.diagnosis}
                      </Text>
                    )}
                  </View>

                  {index < recentVisits.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="medical-information" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No recent visits</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsContainer}>
              <Button
                mode="contained"
                icon="person-add"
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
              >
                Find Patient
              </Button>
              <Button
                mode="contained"
                icon="add-circle"
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
              >
                New Visit
              </Button>
            </View>
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
    padding: 16,
  },
  welcomeCard: {
    marginBottom: 16,
    elevation: 2,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  welcomeSubText: {
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  visitItem: {
    paddingVertical: 12,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  visitInfo: {
    flex: 1,
  },
  patientName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  visitTime: {
    color: '#666',
    marginTop: 2,
  },
  visitStatus: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  statusChip: {
    height: 24,
  },
  normalChip: {
    backgroundColor: '#E8F5E8',
  },
  alertChip: {
    backgroundColor: '#FFEBEE',
  },
  visitSymptoms: {
    color: '#666',
    marginBottom: 4,
  },
  visitDiagnosis: {
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    marginVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#666',
  },
  actionsContainer: {
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    marginVertical: 4,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
})

export default DoctorHomeScreen

