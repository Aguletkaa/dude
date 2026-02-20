// src/screens/StatsScreen.js - Statystyki sieci
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../constants/colors';

const API_URL = 'http://10.0.2.2:8000';

const StatsScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [topDevices, setTopDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token') || 
                    await AsyncStorage.getItem('access_token');

      // Pobierz ogólne statystyki
      const statsResponse = await fetch(`${API_URL}/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const statsData = await statsResponse.json();

      // POPRAWKA: było /api/devices - endpoint nie istnieje, używamy /devices
      const devicesResponse = await fetch(`${API_URL}/devices`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const devicesData = await devicesResponse.json();

      // Zabezpieczenie gdyby devicesData nie była tablicą
      const devices = Array.isArray(devicesData) ? devicesData : [];

      // TOP 5 urządzeń z największym CPU
      const topCPU = [...devices]
        .filter(d => d.cpu > 0)
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 5);

      // TOP 5 urządzeń z najsłabszym sygnałem
      const topSignal = [...devices]
        .filter(d => d.signal && d.signal < 0)
        .sort((a, b) => a.signal - b.signal)
        .slice(0, 5);

      // TOP 5 urządzeń z NAJWIĘKSZĄ liczbą awarii
      const topMostOutages = [...devices]
        .filter(d => d.outageCount !== undefined && d.outageCount > 0)
        .sort((a, b) => b.outageCount - a.outageCount)
        .slice(0, 5);

      // TOP 5 urządzeń z NAJMNIEJSZĄ liczbą awarii
      const topLeastOutages = [...devices]
        .filter(d => d.outageCount !== undefined)
        .sort((a, b) => a.outageCount - b.outageCount)
        .slice(0, 5);

      // Średni sygnał
      const devicesWithSignal = devices.filter(d => d.signal && d.signal < 0);
      const avgSignal = devicesWithSignal.length > 0
        ? Math.abs(devicesWithSignal.reduce((sum, d) => sum + d.signal, 0) / devicesWithSignal.length).toFixed(0)
        : 0;

      setStats(statsData);
      setTopDevices({ 
        cpu: topCPU, 
        signal: topSignal,
        mostOutages: topMostOutages,
        leastOutages: topLeastOutages,
        avgSignal: avgSignal
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statystyki</Text>
        <Text style={styles.headerSubtitle}>Analiza sieci</Text>
      </View>

      {/* Ogólne statystyki */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Przegląd sieci</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="router" size={32} color={COLORS.primary} />
            <Text style={styles.statValue}>{stats?.total_devices || 0}</Text>
            <Text style={styles.statLabel}>Wszystkie urządzenia</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="check-circle" size={32} color={COLORS.online} />
            <Text style={[styles.statValue, { color: COLORS.online }]}>
              {stats?.online_devices || 0}
            </Text>
            <Text style={styles.statLabel}>Online</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="cancel" size={32} color={COLORS.offline} />
            <Text style={[styles.statValue, { color: COLORS.offline }]}>
              {stats?.offline_devices || 0}
            </Text>
            <Text style={styles.statLabel}>Offline</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="wifi" size={32} color={COLORS.primary} />
            <Text style={styles.statValue}>
              {topDevices.avgSignal ? `-${topDevices.avgSignal}` : '0'}
            </Text>
            <Text style={styles.statLabel}>Średni sygnał dBm</Text>
          </View>
        </View>
      </View>

      {/* TOP urządzenia - najwyższe CPU */}
      {topDevices.cpu && topDevices.cpu.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="memory" size={24} color={COLORS.warning} />
            <Text style={styles.sectionTitle}>Najwyższe obciążenie CPU</Text>
          </View>
          
          {topDevices.cpu.map((device, index) => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceRow}
              onPress={() => navigation.navigate('DeviceDetail', { deviceId: device.id })}
            >
              <View style={styles.deviceRank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceIP}>{device.ip}</Text>
              </View>
              <View style={styles.deviceMetric}>
                <Text style={[styles.metricValue, { color: COLORS.warning }]}>{device.cpu}%</Text>
                <Text style={styles.metricLabel}>CPU</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* TOP urządzenia - najsłabszy sygnał */}
      {topDevices.signal && topDevices.signal.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="wifi" size={24} color={COLORS.offline} />
            <Text style={styles.sectionTitle}>Najsłabszy sygnał</Text>
          </View>
          
          {topDevices.signal.map((device, index) => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceRow}
              onPress={() => navigation.navigate('DeviceDetail', { deviceId: device.id })}
            >
              <View style={styles.deviceRank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceIP}>{device.ip}</Text>
              </View>
              <View style={styles.deviceMetric}>
                <Text style={[styles.metricValue, { color: COLORS.offline }]}>{device.signal} dBm</Text>
                <Text style={styles.metricLabel}>Signal</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* TOP urządzenia - najwięcej awarii */}
      {topDevices.mostOutages && topDevices.mostOutages.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="error" size={24} color={COLORS.offline} />
            <Text style={styles.sectionTitle}>Najwięcej awarii</Text>
          </View>
          
          {topDevices.mostOutages.map((device, index) => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceRow}
              onPress={() => navigation.navigate('DeviceDetail', { deviceId: device.id })}
            >
              <View style={styles.deviceRank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceIP}>{device.ip}</Text>
              </View>
              <View style={styles.deviceMetric}>
                <Text style={[styles.metricValue, { color: COLORS.offline }]}>{device.outageCount}</Text>
                <Text style={styles.metricLabel}>Awarie</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* TOP urządzenia - najmniej awarii */}
      {topDevices.leastOutages && topDevices.leastOutages.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="check-circle" size={24} color={COLORS.online} />
            <Text style={styles.sectionTitle}>Najmniej awarii</Text>
          </View>
          
          {topDevices.leastOutages.map((device, index) => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceRow}
              onPress={() => navigation.navigate('DeviceDetail', { deviceId: device.id })}
            >
              <View style={styles.deviceRank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceIP}>{device.ip}</Text>
              </View>
              <View style={styles.deviceMetric}>
                <Text style={[styles.metricValue, { color: COLORS.online }]}>{device.outageCount}</Text>
                <Text style={styles.metricLabel}>Awarie</Text>
              </View>
            </TouchableOpacity>
          ))}
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
  header: {
    padding: 20,
    backgroundColor: COLORS.backgroundSecondary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deviceRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  deviceIP: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  deviceMetric: {
    alignItems: 'flex-end',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

export default StatsScreen;