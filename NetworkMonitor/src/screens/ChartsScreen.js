// src/screens/ChartsScreen.js - Wykresy bez bibliotek
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../constants/colors';

const API_URL = 'http://10.0.2.2:8000';
const screenWidth = Dimensions.get('window').width - 64;

const SimpleBarChart = ({ data, color, label, max = 100 }) => {
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartLabel}>{label}</Text>
      <View style={styles.barsContainer}>
        {data.map((value, index) => {
          const height = Math.max((value / max) * 150, 2);
          return (
            <View key={index} style={styles.barWrapper}>
              <View 
                style={[
                  styles.bar, 
                  { 
                    height, 
                    backgroundColor: color,
                  }
                ]} 
              />
              <Text style={styles.barValue}>{value.toFixed(0)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const ChartsScreen = ({ route, navigation }) => {
  const { deviceId, deviceName } = route.params;
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [hours, setHours] = useState(24);

  useEffect(() => {
    loadChartData();
  }, [hours]);

  const loadChartData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token') || 
                    await AsyncStorage.getItem('access_token');

      const response = await fetch(
        `${API_URL}/api/devices/${deviceId}/history?hours=${hours}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        processChartData(data.data);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (rawData) => {
    // Sortuj i weź maksymalnie 10 punktów
    const sorted = [...rawData].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    const step = Math.ceil(sorted.length / 10);
    const sampled = sorted.filter((_, i) => i % step === 0).slice(0, 10);

    const cpuData = sampled.map(item => item.cpu || 0);
    const memoryData = sampled.map(item => item.memory || 0);
    const signalData = sampled.map(item => Math.abs(item.signal || 0));

    // Oblicz średnie
    const avgCPU = cpuData.reduce((a, b) => a + b, 0) / cpuData.length;
    const avgMemory = memoryData.reduce((a, b) => a + b, 0) / memoryData.length;
    const avgSignal = signalData.reduce((a, b) => a + b, 0) / signalData.length;

    // Znajdź maksimum
    const maxCPU = Math.max(...cpuData);
    const maxMemory = Math.max(...memoryData);
    const maxSignal = Math.max(...signalData);

    setChartData({
      cpu: cpuData,
      memory: memoryData,
      signal: signalData,
      stats: {
        avgCPU: avgCPU.toFixed(1),
        avgMemory: avgMemory.toFixed(1),
        avgSignal: avgSignal.toFixed(1),
        maxCPU: maxCPU.toFixed(1),
        maxMemory: maxMemory.toFixed(1),
        maxSignal: maxSignal.toFixed(1),
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!chartData) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="show-chart" size={64} color={COLORS.textMuted} />
        <Text style={styles.emptyText}>Brak danych do wyświetlenia</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.deviceName}>{deviceName}</Text>
        <Text style={styles.subtitle}>Historia metryk (ostatnie {hours}h)</Text>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <TouchableOpacity
          style={[styles.timeButton, hours === 6 && styles.timeButtonActive]}
          onPress={() => setHours(6)}
        >
          <Text style={[styles.timeText, hours === 6 && styles.timeTextActive]}>6h</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.timeButton, hours === 24 && styles.timeButtonActive]}
          onPress={() => setHours(24)}
        >
          <Text style={[styles.timeText, hours === 24 && styles.timeTextActive]}>24h</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.timeButton, hours === 72 && styles.timeButtonActive]}
          onPress={() => setHours(72)}
        >
          <Text style={[styles.timeText, hours === 72 && styles.timeTextActive]}>3d</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.timeButton, hours === 168 && styles.timeButtonActive]}
          onPress={() => setHours(168)}
        >
          <Text style={[styles.timeText, hours === 168 && styles.timeTextActive]}>7d</Text>
        </TouchableOpacity>
      </View>

      {/* CPU Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Icon name="memory" size={24} color={COLORS.primary} />
          <Text style={styles.chartTitle}>CPU Usage</Text>
        </View>

        <SimpleBarChart 
          data={chartData.cpu} 
          color={COLORS.primary}
          label="CPU (%)"
        />

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Średnia</Text>
            <Text style={styles.statValue}>{chartData.stats.avgCPU}%</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Maksimum</Text>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>
              {chartData.stats.maxCPU}%
            </Text>
          </View>
        </View>
      </View>

      {/* Memory Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Icon name="storage" size={24} color={COLORS.warning} />
          <Text style={styles.chartTitle}>Memory Usage</Text>
        </View>

        <SimpleBarChart 
          data={chartData.memory} 
          color={COLORS.warning}
          label="Memory (%)"
        />

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Średnia</Text>
            <Text style={styles.statValue}>{chartData.stats.avgMemory}%</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Maksimum</Text>
            <Text style={[styles.statValue, { color: COLORS.offline }]}>
              {chartData.stats.maxMemory}%
            </Text>
          </View>
        </View>
      </View>

      {/* Signal Chart */}
      {chartData.signal.some(s => s > 0) && (
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Icon name="wifi" size={24} color={COLORS.online} />
            <Text style={styles.chartTitle}>Signal Strength</Text>
          </View>

          <SimpleBarChart 
            data={chartData.signal} 
            color={COLORS.online}
            label="Signal (dBm)"
            max={100}
          />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Średnia</Text>
              <Text style={styles.statValue}>-{chartData.stats.avgSignal} dBm</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Najsłabszy</Text>
              <Text style={[styles.statValue, { color: COLORS.offline }]}>
                -{chartData.stats.maxSignal} dBm
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.backgroundSecondary,
  },
  deviceName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  timeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  timeTextActive: {
    color: COLORS.background,
  },
  chartCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  chartContainer: {
    marginBottom: 16,
  },
  chartLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  barValue: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
});

export default ChartsScreen;