import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { Card, Text, Button, Chip, Divider } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Visit, Patient } from '../../lib/supabase'

const PatientHomeScreen: React.FC = () => {
  const { user, userProfile ,signOut} = useAuth()
  const [recentVisits, setRecentVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const patient = userProfile as Patient

  useEffect(() => {
    loadDashboardData()
  }, [])

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
        .limit(3)

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

  const getVitalStatus = (visit: Visit) => {
    const issues = []

    if (visit.systolic_bp && visit.systolic_bp > 140) issues.push('High BP')
    if (visit.blood_sugar && visit.blood_sugar > 180) issues.push('High Blood Sugar')
    if (visit.temperature && visit.temperature > 37.5) issues.push('Fever')

    return issues.length > 0 ? issues : ['Normal']
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
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
              <MaterialIcons name="waving-hand" size={32} color="#2196F3" />
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeText}>Welcome back, {patient?.name}!</Text>
                <Text style={styles.welcomeSubText}>
                  Here's your health overview
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialIcons name="history" size={24} color="#4CAF50" />
              <Text style={styles.statNumber}>{recentVisits.length}</Text>
              <Text style={styles.statLabel}>Recent Visits</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialIcons name="chat" size={24} color="#FF9800" />
              <Text style={styles.statNumber}>AI</Text>
              <Text style={styles.statLabel}>Assistant</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialIcons name="person" size={24} color="#9C27B0" />
              <Text style={styles.statNumber}>{patient?.age}</Text>
              <Text style={styles.statLabel}>Years Old</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Recent Visits */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Visits</Text>
              <Button onPress={() => {signOut() }} mode="text" compact>View All</Button>
            </View>

            {recentVisits.length > 0 ? (
              recentVisits.map((visit, index) => (
                <View key={visit.id}>
                  <View style={styles.visitItem}>
                    <View style={styles.visitHeader}>
                      <View style={styles.visitInfo}>
                        <Text style={styles.visitDate}>
                          {formatDate(visit.visit_date)}
                        </Text>
                        <Text style={styles.doctorName}>
                          Dr. {(visit as any).field_doctors?.name}
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
                <Text style={styles.emptySubtext}>
                  Your visit history will appear here
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Health Reminders */}
        {patient?.current_medications && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Current Medications</Text>
              <Text style={styles.medicationsText}>
                {patient.current_medications}
              </Text>
            </Card.Content>
          </Card>
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
  visitDate: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  doctorName: {
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
  emptySubtext: {
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  medicationsText: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
})

export default PatientHomeScreen

