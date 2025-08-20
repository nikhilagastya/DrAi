import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native'
import { Text, ActivityIndicator, SegmentedButtons } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { LineChart } from 'react-native-chart-kit'
import { supabase, Visit } from '../lib/supabase'

interface HealthTrendsProps {
  patientId: string
  showHeader?: boolean
  containerStyle?: any
}

interface VitalOption {
  value: string
  label: string
  unit: string
  icon: string
}

const HealthTrendsComponent: React.FC<HealthTrendsProps> = ({ 
  patientId, 
  showHeader = true,
  containerStyle 
}) => {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('3months')
  const [selectedVital, setSelectedVital] = useState('weight')

  const screenWidth = Dimensions.get('window').width

  const periodOptions = [
    { value: '1month', label: '1M' },
    { value: '3months', label: '3M' },
    { value: '6months', label: '6M' },
    { value: '1year', label: '1Y' },
  ]

  const vitalOptions: VitalOption[] = [
    { value: 'weight', label: 'Weight', unit: 'kg', icon: 'scale' },
    { value: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg', icon: 'favorite' },
    { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: 'favorite' },
    { value: 'temperature', label: 'Temperature', unit: '°C', icon: 'thermostat' },
    { value: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', icon: 'water-drop' },
    { value: 'oxygen_saturation', label: 'Oxygen Sat.', unit: '%', icon: 'air' },
  ]

  useEffect(() => {
    if (patientId) {
      loadVisits()
    }
  }, [patientId, selectedPeriod])

  const loadVisits = async () => {
    if (!patientId) return

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
        .eq('patient_id', patientId)
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
          color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
          strokeWidth: 3,
        }]
        break
      case 'blood_pressure':
        datasets = [
          {
            data: filteredVisits.map(visit => visit.systolic_bp || 0),
            color: (opacity = 1) => `rgba(211, 47, 47, ${opacity})`,
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
        if (value > 140) return { status: 'High', color: '#D32F2F' }
        if (value < 90) return { status: 'Low', color: '#FF9800' }
        return { status: 'Normal', color: '#4CAF50' }
      case 'heart_rate':
        if (value > 100) return { status: 'High', color: '#D32F2F' }
        if (value < 60) return { status: 'Low', color: '#FF9800' }
        return { status: 'Normal', color: '#4CAF50' }
      case 'temperature':
        if (value > 37.5) return { status: 'Fever', color: '#D32F2F' }
        if (value < 36.0) return { status: 'Low', color: '#4285F4' }
        return { status: 'Normal', color: '#4CAF50' }
      case 'blood_sugar':
        if (value > 180) return { status: 'High', color: '#D32F2F' }
        if (value < 70) return { status: 'Low', color: '#FF9800' }
        return { status: 'Normal', color: '#4CAF50' }
      case 'oxygen_saturation':
        if (value < 95) return { status: 'Low', color: '#D32F2F' }
        return { status: 'Normal', color: '#4CAF50' }
      default:
        return { status: 'Normal', color: '#4CAF50' }
    }
  }

  const renderVitalSelector = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.vitalSelectorContent}
    >
      {vitalOptions.map((vital) => (
        <View
          key={vital.value}
          style={[
            styles.vitalOption,
            selectedVital === vital.value && styles.selectedVitalOption
          ]}
          onTouchEnd={() => setSelectedVital(vital.value)}
        >
          <MaterialIcons 
            name={vital.icon as any} 
            size={20} 
            color={selectedVital === vital.value ? '#4285F4' : '#666666'} 
          />
          <Text style={[
            styles.vitalOptionText,
            selectedVital === vital.value && styles.selectedVitalOptionText
          ]}>
            {vital.label}
          </Text>
        </View>
      ))}
    </ScrollView>
  )

  const renderChart = () => {
    const data = processVitalData(selectedVital)
    if (!data) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <MaterialIcons name="trending-up" size={48} color="#CCCCCC" />
          </View>
          <Text style={styles.emptyTitle}>No data available</Text>
          <Text style={styles.emptyText}>
            No {vitalOptions.find(v => v.value === selectedVital)?.label.toLowerCase()} data found for this period.
          </Text>
        </View>
      )
    }

    const chartConfig = {
      backgroundGradientFrom: '#FFFFFF',
      backgroundGradientTo: '#FFFFFF',
      color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
      strokeWidth: 2,
      barPercentage: 0.7,
      useShadowColorFromDataset: false,
      decimalPlaces: selectedVital === 'temperature' ? 1 : 0,
      propsForLabels: {
        fontSize: 12,
        fontWeight: '500',
        color: '#333333',
      },
      propsForVerticalLabels: {
        fontSize: 10,
        color: '#666666',
      },
      propsForHorizontalLabels: {
        fontSize: 10,
        color: '#666666',
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
          width={screenWidth - 80}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={false}
          withOuterLines={true}
          withVerticalLines={false}
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
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.latest}</Text>
            <Text style={styles.statLabel}>Latest</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${latestStatus.color}20` }]}>
              <Text style={[styles.statusText, { color: latestStatus.color }]}>
                {latestStatus.status}
              </Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.avg}</Text>
            <Text style={styles.statLabel}>Average</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.min}</Text>
            <Text style={styles.statLabel}>Minimum</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.max}</Text>
            <Text style={styles.statLabel}>Maximum</Text>
          </View>
        </View>
        <Text style={styles.statsFooter}>
          Based on {stats.count} reading{stats.count !== 1 ? 's' : ''} • Unit: {vitalInfo?.unit}
        </Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading health trends...</Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.container, containerStyle]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      {showHeader && (
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Health Trends</Text>
          <Text style={styles.headerSubtitle}>
            Track vital signs over time
          </Text>
        </View>
      )}

      {/* Period Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time Period</Text>
        <SegmentedButtons
          value={selectedPeriod}
          onValueChange={setSelectedPeriod}
          buttons={periodOptions}
          
          style={styles.segmentedButtons}
          theme={{
            colors: {
              secondaryContainer: '#4285F4',
              onSecondaryContainer: '#FFFFFF',
            }
          }}
        />
      </View>

      {/* Vital Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vital Sign</Text>
        {renderVitalSelector()}
      </View>

      {/* Chart Section */}
      <View style={styles.section}>
        <View style={styles.chartHeader}>
          <MaterialIcons 
            name={vitalOptions.find(v => v.value === selectedVital)?.icon as any || 'trending-up'} 
            size={24} 
            color="#4285F4" 
          />
          <Text style={styles.chartTitle}>
            {vitalOptions.find(v => v.value === selectedVital)?.label} Trend
          </Text>
        </View>
        <View style={styles.chartCard}>
          {renderChart()}
        </View>
      </View>

      {/* Statistics */}
      {renderStats()}

      {/* Health Tips */}
      <View style={styles.section}>
        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <MaterialIcons name="lightbulb" size={20} color="#FF9800" />
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Health Insights</Text>
            <Text style={styles.tipText}>
              Regular monitoring helps track your health progress over time. Consult your doctor if you notice concerning trends.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    marginTop: 16,
    color: '#666666',
    fontSize: 16,
  },
  headerSection: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  segmentedButtons: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  vitalSelectorContent: {
    paddingRight: 20,
  },
  vitalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    minWidth: 120,
  },
  selectedVitalOption: {
    backgroundColor: '#F0F7FF',
    borderColor: '#4285F4',
  },
  vitalOptionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  selectedVitalOptionText: {
    color: '#4285F4',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    color: '#333333',
  },
  chartCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 8,
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
  },
  statsSection: {
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsFooter: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
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

export default HealthTrendsComponent