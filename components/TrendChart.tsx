import React from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import { Text } from 'react-native-paper'
import { LineChart } from 'react-native-chart-kit'

interface TrendChartProps {
  data: {
    labels: string[]
    datasets: Array<{
      data: number[]
      color?: (opacity: number) => string
      strokeWidth?: number
    }>
    legend?: string[]
  }
  title: string
  unit?: string
  height?: number
  showGrid?: boolean
  bezier?: boolean
  fromZero?: boolean
  decimalPlaces?: number
}

const TrendChart: React.FC<TrendChartProps> = ({
  data,
  title,
  unit,
  height = 220,
  showGrid = true,
  bezier = true,
  fromZero = false,
  decimalPlaces = 0,
}) => {
  const screenWidth = Dimensions.get('window').width

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces,
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {unit && <Text style={styles.unit}>({unit})</Text>}
      </View>
      
      <View style={styles.chartContainer}>
        <LineChart
          data={data}
          width={screenWidth - 80}
          height={height}
          chartConfig={chartConfig}
          bezier={bezier}
          style={styles.chart}
          withInnerLines={showGrid}
          withOuterLines={true}
          withVerticalLines={showGrid}
          withHorizontalLines={showGrid}
          fromZero={fromZero}
        />
      </View>

      {data.legend && (
        <View style={styles.legend}>
          {data.legend.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View 
                style={[
                  styles.legendColor, 
                  { backgroundColor: data.datasets[index]?.color?.(1) || '#2196F3' }
                ]} 
              />
              <Text style={styles.legendText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  unit: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
})

export default TrendChart

