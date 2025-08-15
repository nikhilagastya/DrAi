import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native'
import { Card, Text, ActivityIndicator, SegmentedButtons, Chip } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { LineChart, BarChart } from 'react-native-chart-kit'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Visit, Patient } from '../../lib/supabase'
import EmptyState from '~/components/EmptyState'


interface VitalTrend {
  date: string
  weight?: number
  systolic_bp?: number
  diastolic_bp?: number
  heart_rate?: number
  temperature?: number
  blood_sugar?: number
  oxygen_saturation?: number
}

const TrendsScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('3months')
  const [selectedVital, setSelectedVital] = useState('weight')

  const patient = userProfile as Patient
  const screenWidth = Dimensions.get('window').width

  const periodOptions = [
    { value: '1month', label: '1M' },
    { value: '3months', label: '3M' },
    { value: '6months', label: '6M' },
    { value: '1year', label: '1Y' },
  ]

  const vitalOptions = [
    { value: 'weight', label: 'Weight', unit: 'kg', icon: 'scale' },
    { value: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg', icon: 'favorite' },
    { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: 'favorite' },
    { value: 'temperature', label: 'Temperature', unit: '°C', icon: 'thermostat' },
    { value: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', icon: 'water-drop' },
    { value: 'oxygen_saturation', label: 'Oxygen Sat.', unit: '%', icon: 'air' },
  ]

  useEffect(() => {
    loadVisits()
  }, [selectedPeriod])

  const loadVisits = async () => {
    if (!patient) return

    try {
      // Calculate date range based on selected period
      const endDate = new Date()
      const startDate = new Date()
      
      switch (selectedPeriod) {
        case '1month':
          startDate.setMonth(endDate.getMonth() - 1)
          break
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6)
          break
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('patient_id', patient.id)
        .gte('visit_date', startDate.toISOString())
        .lte('visit_date', endDate.toISOString())
        .order('visit_date', { ascending: true })

      if (error) {
        console.error('Error loading visits:', error)
      } else {
        setVisits(data || [])
      }
    } catch (error) {
      console.error('Error loading visits:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadVisits()
  }

  const processVitalData = (vital: string) => {
    const filteredVisits = visits.filter(visit => {
      switch (vital) {
        case 'weight':
          return visit.weight !== null
        case 'blood_pressure':
          return visit.systolic_bp !== null && visit.diastolic_bp !== null
        case 'heart_rate':
          return visit.heart_rate !== null
        case 'temperature':
          return visit.temperature !== null
        case 'blood_sugar':
          return visit.blood_sugar !== null
        case 'oxygen_saturation':
          return visit.oxygen_saturation !== null
        default:
          return false
      }
    })

    if (filteredVisits.length === 0) return null

    const labels = filteredVisits.map(visit => {
      const date = new Date(visit.visit_date)
      return `${date.getMonth() + 1}/${date.getDate()}`
    })

    let datasets = []

    switch (vital) {
      case 'weight':
        datasets = [{
          data: filteredVisits.map(visit => visit.weight || 0),
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          strokeWidth: 3,
        }]
        break
      case 'blood_pressure':
        datasets = [
          {
            data: filteredVisits.map(visit => visit.systolic_bp || 0),
            color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
            strokeWidth: 3,
          },
          {
            data: filteredVisits.map(visit => visit.diastolic_bp || 0),
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            strokeWidth: 3,
          }
        ]
        break
      case 'heart_rate':
        datasets = [{
          data: filteredVisits.map(visit => visit.heart_rate || 0),
          color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
          strokeWidth: 3,
        }]
        break
      case 'temperature':
        datasets = [{
          data: filteredVisits.map(visit => visit.temperature || 0),
          color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
          strokeWidth: 3,
        }]
        break
      case 'blood_sugar':
        datasets = [{
          data: filteredVisits.map(visit => visit.blood_sugar || 0),
          color: (opacity = 1) => `rgba(96, 125, 139, ${opacity})`,
          strokeWidth: 3,
        }]
        break
      case 'oxygen_saturation':
        datasets = [{
          data: filteredVisits.map(visit => visit.oxygen_saturation || 0),
          color: (opacity = 1) => `rgba(0, 188, 212, ${opacity})`,
          strokeWidth: 3,
        }]
        break
    }

    return { labels, datasets, visits: filteredVisits }
  }

  const getVitalStats = (vital: string) => {
    const data = processVitalData(vital)
    if (!data || data.datasets.length === 0) return null

    const values = data.datasets[0].data
    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length
    const latest = values[values.length - 1]

    return { min, max, avg: Math.round(avg * 10) / 10, latest, count: values.length }
  }

  const getVitalStatus = (vital: string, value: number) => {
    switch (vital) {
      case 'blood_pressure':
        if (value > 140) return { status: 'high', color: '#f44336' }
        if (value < 90) return { status: 'low', color: '#ff9800' }
        return { status: 'normal', color: '#4caf50' }
      case 'heart_rate':
        if (value > 100) return { status: 'high', color: '#f44336' }
        if (value < 60) return { status: 'low', color: '#ff9800' }
        return { status: 'normal', color: '#4caf50' }
      case 'temperature':
        if (value > 37.5) return { status: 'high', color: '#f44336' }
        if (value < 36.0) return { status: 'low', color: '#2196f3' }
        return { status: 'normal', color: '#4caf50' }
      case 'blood_sugar':
        if (value > 180) return { status: 'high', color: '#f44336' }
        if (value < 70) return { status: 'low', color: '#ff9800' }
        return { status: 'normal', color: '#4caf50' }
      case 'oxygen_saturation':
        if (value < 95) return { status: 'low', color: '#f44336' }
        return { status: 'normal', color: '#4caf50' }
      default:
        return { status: 'normal', color: '#4caf50' }
    }
  }

  const renderChart = () => {
    const data = processVitalData(selectedVital)
    if (!data) {
      return (
        <EmptyState
          icon="trending-up"
          title="No data available"
          description={`No ${vitalOptions.find(v => v.value === selectedVital)?.label.toLowerCase()} data found for the selected period.`}
        />
      )
    }

    const chartConfig = {
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
      strokeWidth: 3,
      barPercentage: 0.7,
      useShadowColorFromDataset: false,
      decimalPlaces: selectedVital === 'temperature' ? 1 : 0,
      propsForLabels: {
        fontSize: 12,
        fontWeight: '500',
      },
      propsForVerticalLabels: {
        fontSize: 10,
      },
      propsForHorizontalLabels: {
        fontSize: 10,
      },
    }

    return (
      <View style={styles.chartContainer}>
        <LineChart
          data={{
            labels: data.labels,
            datasets: data.datasets,
            legend: selectedVital === 'blood_pressure' ? ['Systolic', 'Diastolic'] : undefined
          }}
          width={screenWidth - 48}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={false}
          withOuterLines={true}
          withVerticalLines={true}
          withHorizontalLines={true}
          fromZero={false}
        />
      </View>
    )
  }

  const renderStats = () => {
    const stats = getVitalStats(selectedVital)
    if (!stats) return null

    const vitalInfo = vitalOptions.find(v => v.value === selectedVital)
    const latestStatus = getVitalStatus(selectedVital, stats.latest)

    return (
      <Card style={styles.statsCard}>
        <Card.Content>
          <Text style={styles.statsTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.latest}</Text>
              <Text style={styles.statLabel}>Latest</Text>
              <Chip
                mode="outlined"
                compact
                style={[styles.statusChip, { backgroundColor: `${latestStatus.color}20` }]}
                textStyle={{ color: latestStatus.color, fontSize: 10 }}
              >
                {latestStatus.status.toUpperCase()}
              </Chip>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.avg}</Text>
              <Text style={styles.statLabel}>Average</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.min}</Text>
              <Text style={styles.statLabel}>Minimum</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.max}</Text>
              <Text style={styles.statLabel}>Maximum</Text>
            </View>
          </View>
          <Text style={styles.statsFooter}>
            Based on {stats.count} reading{stats.count !== 1 ? 's' : ''} • Unit: {vitalInfo?.unit}
          </Text>
        </Card.Content>
      </Card>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading health trends...</Text>
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
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Health Trends</Text>
          <Text style={styles.headerSubtitle}>
            Track your vital signs over time
          </Text>
        </View>

        {/* Period Selection */}
        <Card style={styles.controlCard}>
          <Card.Content>
            <Text style={styles.controlTitle}>Time Period</Text>
            <SegmentedButtons
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
              buttons={periodOptions}
              style={styles.segmentedButtons}
            />
          </Card.Content>
        </Card>

        {/* Vital Selection */}
        <Card style={styles.controlCard}>
          <Card.Content>
            <Text style={styles.controlTitle}>Vital Sign</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.vitalButtons}>
                {vitalOptions.map((vital) => (
                  <Chip
                    key={vital.value}
                    mode={selectedVital === vital.value ? 'flat' : 'outlined'}
                    selected={selectedVital === vital.value}
                    onPress={() => setSelectedVital(vital.value)}
                    style={[
                      styles.vitalChip,
                      selectedVital === vital.value && styles.selectedVitalChip
                    ]}
                    icon={vital.icon}
                  >
                    {vital.label}
                  </Chip>
                ))}
              </View>
            </ScrollView>
          </Card.Content>
        </Card>

        {/* Chart */}
        <Card style={styles.chartCard}>
          <Card.Content>
            <View style={styles.chartHeader}>
              <MaterialIcons 
                name={vitalOptions.find(v => v.value === selectedVital)?.icon || 'trending-up'} 
                size={24} 
                color="#2196F3" 
              />
              <Text style={styles.chartTitle}>
                {vitalOptions.find(v => v.value === selectedVital)?.label} Trend
              </Text>
            </View>
            {renderChart()}
          </Card.Content>
        </Card>

        {/* Statistics */}
        {renderStats()}

        {/* Health Insights */}
        <Card style={styles.insightsCard}>
          <Card.Content>
            <View style={styles.insightsHeader}>
              <MaterialIcons name="lightbulb" size={24} color="#FF9800" />
              <Text style={styles.insightsTitle}>Health Insights</Text>
            </View>
            <View style={styles.insightsList}>
              <View style={styles.insightItem}>
                <MaterialIcons name="info" size={16} color="#2196F3" />
                <Text style={styles.insightText}>
                  Regular monitoring helps track your health progress over time.
                </Text>
              </View>
              <View style={styles.insightItem}>
                <MaterialIcons name="trending-up" size={16} color="#4CAF50" />
                <Text style={styles.insightText}>
                  Consistent readings provide better insights into your health patterns.
                </Text>
              </View>
              <View style={styles.insightItem}>
                <MaterialIcons name="warning" size={16} color="#FF9800" />
                <Text style={styles.insightText}>
                  Consult your doctor if you notice concerning trends or abnormal values.
                </Text>
              </View>
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
  controlCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  segmentedButtons: {
    backgroundColor: '#f5f5f5',
  },
  vitalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  vitalChip: {
    marginRight: 8,
  },
  selectedVitalChip: {
    backgroundColor: '#E3F2FD',
  },
  chartCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#333',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  statsCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusChip: {
    height: 20,
  },
  statsFooter: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  insightsCard: {
    backgroundColor: '#FFF8E1',
    elevation: 2,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#333',
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightText: {
    marginLeft: 12,
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
})

export default TrendsScreen

