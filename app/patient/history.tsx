import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { Card, Title, Paragraph, Chip, Divider, ActivityIndicator, Button, Text } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Visit, Patient } from '../../lib/supabase'
import VisitCard from '~/components/VisitCard'
import EmptyState from '~/components/EmptyState'


const PatientHistoryScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const router = useRouter()
  const [visits, setVisits] = useState<Visit[]>([])
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
        setVisits(data || [])
      }
    } catch (error) {
      console.error('Error loading visits:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadVisits().finally(() => setRefreshing(false))
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Paragraph style={styles.loadingText}>Loading visit history...</Paragraph>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {visits.length > 0 ? (
          <>
            <View style={styles.headerSection}>
              <Text style={styles.headerTitle}>Visit History</Text>
              <Text style={styles.headerSubtitle}>
                {visits.length} visit{visits.length !== 1 ? 's' : ''} recorded
              </Text>
            </View>
            
            {visits.map((visit) => (
              <TouchableOpacity
                key={visit.id}
                onPress={() => router.push(`/patient/edit-visit?visitId=${visit.id}`)}
                style={styles.visitCardWrapper}
              >
                <VisitCard
                  visit={visit}
                  showDoctorInfo={true}
                  compact={false}
                />
                <View style={styles.editIndicator}>
                  <MaterialIcons name="edit" size={16} color="#2196F3" />
                  <Text style={styles.editText}>Tap to edit</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <EmptyState
            icon="medical-information"
            title="No visits yet"
            description="Your visit history will appear here after your first appointment"
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
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  headerSection: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  visitCardWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  editIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editText: {
    marginLeft: 4,
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '500',
  },
})

export default PatientHistoryScreen

