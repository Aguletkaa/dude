// src/screens/AlertsScreen.js - System Alertów (tylko Critical i Info)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../constants/colors';

const API_URL = 'http://10.0.2.2:8000';

const AlertsScreen = ({ navigation }) => {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({
    critical_count: 0,
    info_count: 0,
    unacknowledged: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');

  const loadAlerts = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token') || 
                    await AsyncStorage.getItem('access_token');
      
      if (!token) {
        console.error('No token found');
        return;
      }

      // Pobierz summary
      const summaryResponse = await fetch(`${API_URL}/api/alerts/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const summaryData = await summaryResponse.json();
      setSummary({
        critical_count: summaryData.critical_count || 0,
        info_count: summaryData.info_count || 0,
        unacknowledged: summaryData.unacknowledged || 0
      });

      // Pobierz alerty - TYLKO critical i info, BEZ warning
      let url = `${API_URL}/api/alerts?resolved=false&limit=200`;
      if (filterSeverity === 'critical') {
        url += `&severity=critical`;
      } else if (filterSeverity === 'info') {
        url += `&severity=info`;
      } else {
        // "all" - pobierz critical i info, pomiń warning
        // Nie dodajemy żadnego filtra, ale przefiltrujemy po pobraniu
      }

      const alertsResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const alertsData = await alertsResponse.json();
      
      // Filtruj tylko critical i info (ignoruj warning)
      const filteredAlerts = (alertsData.alerts || []).filter(
        alert => alert.severity === 'critical' || alert.severity === 'info'
      );
      
      setAlerts(filteredAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [filterSeverity]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAlerts();
  }, [filterSeverity]);

  const deleteAlert = async (alertId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token') || 
                    await AsyncStorage.getItem('access_token');
      
      const response = await fetch(`${API_URL}/api/alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Odśwież listę
        loadAlerts();
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return COLORS.offline;
      case 'info': return COLORS.primary;
      default: return COLORS.textMuted;
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'info': return 'info';
      default: return 'notifications';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    
    // Format: 21:59 06.12.2025
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${hours}:${minutes} ${day}.${month}.${year}`;
  };

  const renderAlert = ({ item }) => (
    <View style={styles.alertCard}>
      <View style={styles.alertHeader}>
        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
          <Icon name={getSeverityIcon(item.severity)} size={20} color={COLORS.background} />
        </View>
        
        <View style={styles.alertInfo}>
          <Text style={styles.deviceName}>{item.device_name}</Text>
          <Text style={styles.deviceIP}>{item.device_ip}</Text>
        </View>

        <Text style={styles.timeText}>{formatTime(item.triggered_at)}</Text>
      </View>

      <View style={styles.alertBody}>
        <Text style={styles.alertMessage}>{item.message}</Text>
        
        {item.device_location && (
          <View style={styles.locationRow}>
            <Icon name="location-on" size={14} color={COLORS.textMuted} />
            <Text style={styles.locationText}>{item.device_location}</Text>
          </View>
        )}
      </View>

      {/* Mały przycisk usuń */}
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => deleteAlert(item.id)}
      >
        <Icon name="close" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerty</Text>
        <Text style={styles.headerSubtitle}>
          {alerts.length} aktywne
        </Text>
      </View>

      {/* Summary Cards - tylko Critical i Info */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: COLORS.offline + '20' }]}>
          <Icon name="error" size={28} color={COLORS.offline} />
          <Text style={styles.summaryCount}>{summary.critical_count}</Text>
          <Text style={styles.summaryLabel}>Critical</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: COLORS.primary + '20' }]}>
          <Icon name="info" size={28} color={COLORS.primary} />
          <Text style={styles.summaryCount}>{summary.info_count}</Text>
          <Text style={styles.summaryLabel}>Info</Text>
        </View>
      </View>

      {/* Filtry - tylko Critical i Info */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterSeverity === 'all' && styles.filterChipActive]}
          onPress={() => setFilterSeverity('all')}
        >
          <Text style={[styles.filterText, filterSeverity === 'all' && styles.filterTextActive]}>
            Wszystkie
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterSeverity === 'critical' && styles.filterChipActive]}
          onPress={() => setFilterSeverity('critical')}
        >
          <Text style={[styles.filterText, filterSeverity === 'critical' && styles.filterTextActive]}>
            Critical
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterSeverity === 'info' && styles.filterChipActive]}
          onPress={() => setFilterSeverity('info')}
        >
          <Text style={[styles.filterText, filterSeverity === 'info' && styles.filterTextActive]}>
            Info
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="notifications-none" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {filterSeverity === 'all' 
                ? 'Brak aktywnych alertów' 
                : filterSeverity === 'critical'
                ? 'Brak alertów Critical'
                : 'Brak alertów Info'}
            </Text>
          </View>
        }
      />
    </View>
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
  summaryRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.background,
  },
  listContainer: {
    padding: 16,
  },
  alertCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  severityBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  deviceIP: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  alertBody: {
    marginBottom: 0,
  },
  alertMessage: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
});

export default AlertsScreen;