import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getDevices } from '../api/client';
import COLORS from '../constants/colors';

const StatsScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [topDevices, setTopDevices] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getDevices();

      const online = data.filter(d => d.status === 'online');
      const offline = data.filter(d => d.status === 'offline');

      const statsData = {
        total_devices: data.length,
        online_devices: online.length,
        offline_devices: offline.length,
        availability: data.length > 0 ? Math.round((online.length / data.length) * 100) : 0,
      };

      const devicesWithCPU = data.filter(d => d.cpu && d.cpu > 0).sort((a, b) => b.cpu - a.cpu);
      const topCPU = devicesWithCPU.slice(0, 5);

      const devicesWithSignal = data.filter(d => d.signal && d.signal !== 0);
      const topSignal = [...devicesWithSignal].sort((a, b) => Math.abs(b.signal) - Math.abs(a.signal)).slice(0, 5);

      const devicesWithOutages = data.filter(d => d.outageCount !== undefined && d.outageCount !== null);
      const topMostOutages = [...devicesWithOutages].sort((a, b) => b.outageCount - a.outageCount).slice(0, 5);
      const topLeastOutages = [...devicesWithOutages].sort((a, b) => a.outageCount - b.outageCount).slice(0, 5);

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Statystyki</Text>
          <Text style={styles.headerSubtitle}>Analiza sieci</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Przeglad sieci</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="router" size={32} color={COLORS.primary} />
            <Text style={styles.statValue}>{stats?.total_devices || 0}</Text>
            <Text style={styles.statLabel}>Wszystkie urzadzenia</Text>
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
            <Text style={styles.statLabel}>Sredni sygnal (dBm)</Text>
          </View>
        </View>
      </View>

      {topDevices.cpu && topDevices.cpu.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="memory" size={24} color={COLORS.warning} />
            <Text style={styles.sectionTitle}>Najwyzsze CPU</Text>
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
                <Text style={[styles.metricValue, { color: device.cpu > 80 ? COLORS.offline : COLORS.warning }]}>
                  {device.cpu}%
                </Text>
                <Text style={styles.metricLabel}>CPU</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {topDevices.signal && topDevices.signal.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="signal-cellular-alt" size={24} color={COLORS.offline} />
            <Text style={styles.sectionTitle}>Najslabszy sygnal</Text>
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
                <Text style={[styles.metricValue, { color: COLORS.offline }]}>
                  {device.signal} dBm
                </Text>
                <Text style={styles.metricLabel}>Sygnal</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {topDevices.mostOutages && topDevices.mostOutages.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="warning" size={24} color={COLORS.offline} />
            <Text style={styles.sectionTitle}>Najwiecej awarii</Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
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