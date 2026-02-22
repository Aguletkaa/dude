// src/screens/ChartsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
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

//KOMPONENT WYKRESU
const SimpleBarChart = ({ data, color, label, unit = '', max = 100 }) => {
  if (!data || data.length === 0) return null;

  const safeMax = max > 0 ? max : 1;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartLabel}>{label}</Text>
      <View style={styles.barsContainer}>
        {data.map((value, index) => {
          const height = Math.max((value / safeMax) * 150, 2);
          return (
            <View key={index} style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  { height, backgroundColor: color },
                ]}
              />
              <Text style={styles.barValue}>
                {value > 0 ? value.toFixed(0) : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

//EKRAN GŁÓWNY

const ChartsScreen = ({ route, navigation }) => {
  const deviceId = route?.params?.deviceId;
  const deviceName = route?.params?.deviceName || 'Urządzenie';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [hours, setHours] = useState(24);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    if (!deviceId) {
      setError('Brak ID urządzenia. Wróć i wybierz urządzenie z listy.');
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (deviceId) {
      loadChartData();
    }
  }, [hours, deviceId]);

  const loadChartData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNoData(false);
      setChartData(null);

      const token =
        (await AsyncStorage.getItem('auth_token')) ||
        (await AsyncStorage.getItem('access_token'));

      const response = await fetch(
        `${API_URL}/api/devices/${deviceId}/history?hours=${hours}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const rawData = data.data || data.metrics || [];

      if (rawData.length === 0) {
        setNoData(true);
      } else {
        processChartData(rawData);
      }
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError(`Błąd ładowania danych: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [deviceId, hours]);

  const processChartData = (rawData) => {
    const sorted = [...rawData].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    const maxPoints = 20;
    const step = Math.ceil(sorted.length / maxPoints);
    const sampled = sorted.filter((_, i) => i % step === 0).slice(0, maxPoints);

    const cpuData = sampled.map((item) => item.cpu || 0);
    const memoryData = sampled.map((item) => item.memory || 0);
    const signalData = sampled.map((item) =>
      item.signal ? Math.abs(item.signal) : 0
    );
    const connectionsData = sampled.map((item) => item.connections || 0);

    const labels = sampled.map((item) => {
      const d = new Date(item.timestamp);
      return `${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    });

    // Statystyki
    const avg = (arr) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const max = (arr) => (arr.length > 0 ? Math.max(...arr) : 0);

    setChartData({
      cpu: cpuData,
      memory: memoryData,
      signal: signalData,
      connections: connectionsData,
      labels,
      stats: {
        avgCPU: avg(cpuData).toFixed(1),
        maxCPU: max(cpuData).toFixed(1),
        avgMemory: avg(memoryData).toFixed(1),
        maxMemory: max(memoryData).toFixed(1),
        avgSignal: avg(signalData).toFixed(1),
        maxConnections: max(connectionsData).toFixed(0),
        dataPoints: sorted.length,
      },
    });
  };

  //RENDEROWANIE
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Ładowanie danych ({hours}h)...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="error-outline" size={64} color={COLORS.offline} />
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryText}>Wróć</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (noData) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.deviceName}>{deviceName}</Text>
            <Text style={styles.subtitle}>Historia metryk</Text>
          </View>
        </View>

        {/* Time Range */}
        <View style={styles.timeRangeContainer}>
          {[6, 24, 72, 168].map((h) => (
            <TouchableOpacity
              key={h}
              style={[styles.timeButton, hours === h && styles.timeButtonActive]}
              onPress={() => setHours(h)}
            >
              <Text style={[styles.timeText, hours === h && styles.timeTextActive]}>
                {h === 72 ? '3d' : h === 168 ? '7d' : `${h}h`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.emptyContainer}>
          <Icon name="show-chart" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>
            Brak danych za ostatnie {hours}h
          </Text>
          <Text style={styles.emptySubtext}>
            Dane pojawią się po zebraniu metryk przez worker
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.deviceName}>{deviceName}</Text>
          <Text style={styles.subtitle}>
            Ostatnie {hours === 72 ? '3 dni' : hours === 168 ? '7 dni' : `${hours}h`}
            {chartData?.stats?.dataPoints
              ? ` · ${chartData.stats.dataPoints} pomiarów`
              : ''}
          </Text>
        </View>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {[6, 24, 72, 168].map((h) => (
          <TouchableOpacity
            key={h}
            style={[styles.timeButton, hours === h && styles.timeButtonActive]}
            onPress={() => setHours(h)}
          >
            <Text style={[styles.timeText, hours === h && styles.timeTextActive]}>
              {h === 72 ? '3d' : h === 168 ? '7d' : `${h}h`}
            </Text>
          </TouchableOpacity>
        ))}
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
          max={100}
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
          <Text style={styles.chartTitle}>Pamięć RAM</Text>
        </View>

        <SimpleBarChart
          data={chartData.memory}
          color={COLORS.warning}
          label="Pamięć (%)"
          max={100}
        />

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Średnia</Text>
            <Text style={styles.statValue}>{chartData.stats.avgMemory}%</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Maksimum</Text>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>
              {chartData.stats.maxMemory}%
            </Text>
          </View>
        </View>
      </View>

      {/* Signal Chart */}
      {chartData.signal.some((v) => v > 0) && (
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Icon name="wifi" size={24} color={COLORS.online} />
            <Text style={styles.chartTitle}>Sygnał</Text>
          </View>

          <SimpleBarChart
            data={chartData.signal}
            color={COLORS.online}
            label="Sygnał (|dBm|)"
            max={Math.max(...chartData.signal, 1)}
          />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Średni</Text>
              <Text style={styles.statValue}>-{chartData.stats.avgSignal} dBm</Text>
            </View>
          </View>
        </View>
      )}

      {/* Connections Chart */}
      {chartData.connections.some((v) => v > 0) && (
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Icon name="people" size={24} color="#9B59B6" />
            <Text style={styles.chartTitle}>Połączenia</Text>
          </View>

          <SimpleBarChart
            data={chartData.connections}
            color="#9B59B6"
            label="Liczba klientów"
            max={Math.max(...chartData.connections, 1)}
          />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Maks. klientów</Text>
              <Text style={styles.statValue}>{chartData.stats.maxConnections}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
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
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.backgroundSecondary,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerText: {
    flex: 1,
  },
  deviceName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
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
    marginBottom: 16,
    gap: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  chartContainer: {
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    gap: 3,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 2,
  },
  barValue: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: 3,
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
});

export default ChartsScreen;