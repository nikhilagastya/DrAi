import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { Card, Text, Button } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Admin } from '../../lib/supabase'

import EmptyState from '~/components/EmptyState'
import StatsCard from '~/components/StatsCard'

interface SystemStats {
  totalPatients: number
  totalDoctors: number
  totalVisits: number
  visitsToday: number
  visitsThisWeek: number
  visitsThisMonth: number
}

const AdminHomeScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState<SystemStats>({
    totalPatients: 0,
    totalDoctors: 0,
    totalVisits: 0,
    visitsToday: 0,
    visitsThisWeek: 0,
    visitsThisMonth: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const admin = userProfile as Admin

  useEffect(() => {
    loadSystemStats()
  }, [])

  const loadSystemStats = async () => {
    try {
      // Get total patients
      const { count: patientsCount, error: patientsError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })

      // Get total doctors
      const { count: doctorsCount, error: doctorsError } = await supabase
        .from('field_doctors')
        .select('*', { count: 'exact', head: true })

      // Get total visits
      const { count: visitsCount, error: visitsError } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })

      // Get today's visits
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      const { count: todayVisitsCount, error: todayError } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .gte('visit_date', startOfDay.toISOString())
        .lt('visit_date', endOfDay.toISOString())

      // Get this week's visits
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const { count: weekVisitsCount, error: weekError } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .gte('visit_date', startOfWeek.toISOString())

      // Get this month's visits
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      const { count: monthVisitsCount, error: monthError } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .gte('visit_date', startOfMonth.toISOString())

      if (!patientsError && !doctorsError && !visitsError && !todayError && !weekError && !monthError) {
        setStats({
          totalPatients: patientsCount || 0,
          totalDoctors: doctorsCount || 0,
          totalVisits: visitsCount || 0,
          visitsToday: todayVisitsCount || 0,
          visitsThisWeek: weekVisitsCount || 0,
          visitsThisMonth: monthVisitsCount || 0,
        })
      }
    } catch (error) {
      console.error('Error loading system stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadSystemStats()
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
              <MaterialIcons name="admin-panel-settings" size={32} color="#FF9800" />
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeText}>Welcome, {admin?.name}!</Text>
                <Text style={styles.welcomeSubText}>
                  System Administrator Dashboard
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* System Overview Stats */}
        <Text style={styles.sectionTitle}>System Overview</Text>
        <View style={styles.statsGrid}>
          <StatsCard
            title="Total Patients"
            value={stats.totalPatients}
            icon="people"
            color="#2196F3"
          />
          <StatsCard
            title="Total Doctors"
            value={stats.totalDoctors}
            icon="local-hospital"
            color="#4CAF50"
          />
        </View>

        <View style={styles.statsGrid}>
          <StatsCard
            title="Total Visits"
            value={stats.totalVisits}
            icon="event"
            color="#9C27B0"
          />
          <StatsCard
            title="Today's Visits"
            value={stats.visitsToday}
            icon="today"
            color="#FF5722"
          />
        </View>

        {/* Activity Stats */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.statsGrid}>
          <StatsCard
            title="This Week"
            value={stats.visitsThisWeek}
            icon="date-range"
            color="#607D8B"
            subtitle="visits"
          />
          <StatsCard
            title="This Month"
            value={stats.visitsThisMonth}
            icon="calendar-month"
            color="#795548"
            subtitle="visits"
          />
        </View>

        {/* Quick Actions */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsContainer}>
              <Button
                mode="contained"
                icon="people"
                style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                contentStyle={styles.actionButtonContent}
              >
                Manage Patients
              </Button>
              <Button
                mode="contained"
                icon="local-hospital"
                style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                contentStyle={styles.actionButtonContent}
              >
                Manage Doctors
              </Button>
              <Button
                mode="outlined"
                icon="analytics"
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
              >
                View Analytics
              </Button>
              <Button
                mode="outlined"
                icon="settings"
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
              >
                System Settings
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* System Health */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>System Health</Text>
            <View style={styles.healthContainer}>
              <View style={styles.healthItem}>
                <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                <Text style={styles.healthText}>Database Connection: Online</Text>
              </View>
              <View style={styles.healthItem}>
                <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                <Text style={styles.healthText}>API Services: Operational</Text>
              </View>
              <View style={styles.healthItem}>
                <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                <Text style={styles.healthText}>Authentication: Active</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Recent System Activity */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Recent System Activity</Text>
            <EmptyState
              icon="timeline"
              title="Activity Log"
              description="System activity and audit logs will appear here when available."
              iconSize={48}
            />
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
    marginBottom: 24,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  sectionCard: {
    marginBottom: 16,
    elevation: 2,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    marginVertical: 4,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
  healthContainer: {
    gap: 12,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
})

export default AdminHomeScreen

