import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getDevices } from '../api/client';
import COLORS from '../constants/colors';

const DevicesScreen = ({ navigation }) => {
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const intervalRef = useRef(null);

  const loadDevices = useCallback(async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const data = await getDevices();

      const processedData = data.map(device => {
        let status = device.status;

        if (status === 'online') {
          const hasWarning =
            (device.signal && device.signal < -70) ||
            (device.cpu && device.cpu > 80) ||
            (device.memory && device.memory > 85);

          if (hasWarning) status = 'warning';
        }

        return { ...device, status };
      });

      setDevices(processedData);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();

    intervalRef.current = setInterval(() => {
      loadDevices(true);
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadDevices]);

  useEffect(() => {
    let filtered = devices;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.ip.includes(q) ||
        (d.location && d.location.toLowerCase().includes(q))
      );
    }

    setFilteredDevices(filtered);
  }, [devices, filterStatus, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDevices();
  }, [loadDevices]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return COLORS.online;
      case 'offline': return COLORS.offline;
      case 'warning': return COLORS.warning;
      default: return COLORS.textMuted;
    }
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'antenna': return 'cell-tower';
      case 'router': return 'router';
      case 'switch': return 'device-hub';
      case 'access_point': return 'wifi';
      default: return 'devices';
    }
  };

  const formatUptime = (uptime) => {
    if (typeof uptime === 'string') return uptime;
    if (typeof uptime === 'number') {
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }
    return 'N/A';
  };

  const formatSignal = (signal) => {
    if (!signal) return null;
    return `${signal} dBm`;
  };

  const statusCounts = {
    all: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    warning: devices.filter(d => d.status === 'warning').length,
    offline: devices.filter(d => d.status === 'offline').length,
  };

  const renderDevice = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.deviceCard,
        item.status === 'offline' && styles.deviceCardOffline,
        item.status === 'warning' && styles.deviceCardWarning,
      ]}
      onPress={() => navigation.navigate('DeviceDetail', { deviceId: item.id })}
    >
      <View style={styles.deviceHeader}>
        <View style={[
          styles.deviceIconBox,
          { borderColor: getStatusColor(item.status) + '40' }
        ]}>
          <Icon name={getDeviceIcon(item.type)} size={28} color={getStatusColor(item.status)} />
        </View>

        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name}</Text>
          <Text style={styles.deviceIP}>{item.ip}</Text>
        </View>

        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status === 'online' ? 'Online' :
             item.status === 'offline' ? 'Offline' :
             item.status === 'warning' ? 'Warning' : 'Nieznany'}
          </Text>
        </View>
      </View>

      <View style={styles.deviceDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Lokalizacja</Text>
          <Text style={styles.detailValue}>
            {item.location || 'Nie podano'}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItemSmall}>
            <Text style={styles.detailLabel}>Uptime</Text>
            <Text style={styles.detailValue}>{formatUptime(item.uptime)}</Text>
          </View>

          {item.connections !== null && item.connections !== undefined && (
            <View style={styles.detailItemSmall}>
              <Text style={styles.detailLabel}>Klienci</Text>
              <Text style={styles.detailValue}>{item.connections || 0}</Text>
            </View>
          )}

          {item.signal !== null && item.signal !== undefined && (
            <View style={styles.detailItemSmall}>
              <Text style={styles.detailLabel}>Sygnal</Text>
              <Text style={[styles.detailValue, {
                color: item.signal > -60 ? COLORS.online :
                       item.signal > -70 ? COLORS.warning : COLORS.offline
              }]}>
                {formatSignal(item.signal)}
              </Text>
            </View>
          )}

          {item.cpu !== null && item.cpu !== undefined && item.cpu > 0 && (
            <View style={styles.detailItemSmall}>
              <Text style={styles.detailLabel}>CPU</Text>
              <Text style={[styles.detailValue, {
                color: item.cpu > 80 ? COLORS.offline :
                       item.cpu > 60 ? COLORS.warning : COLORS.text
              }]}>
                {item.cpu}%
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Urzadzenia</Text>
          <Text style={styles.headerSubtitle}>{filteredDevices.length} urzadzen</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Icon name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Szukaj po nazwie, IP, lokalizacji..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="clear" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'Wszystkie' },
          { key: 'online', label: 'Online' },
          { key: 'warning', label: 'Warning' },
          { key: 'offline', label: 'Offline' },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, filterStatus === key && styles.filterChipActive]}
            onPress={() => setFilterStatus(key)}
          >
            {key !== 'all' && (
              <View style={[styles.filterDot, {
                backgroundColor: key === 'online' ? COLORS.online :
                                 key === 'warning' ? COLORS.warning : COLORS.offline
              }]} />
            )}
            <Text style={[styles.filterText, filterStatus === key && styles.filterTextActive]}>
              {label} {statusCounts[key] > 0 ? `(${statusCounts[key]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredDevices}
        renderItem={renderDevice}
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
            <Icon name="devices-other" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Nie znaleziono urzadzen' : 'Brak urzadzen'}
            </Text>
            {searchQuery && (
              <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery('')}>
                <Text style={styles.clearButtonText}>Wyczysc wyszukiwanie</Text>
              </TouchableOpacity>
            )}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  searchIcon: {
    position: 'absolute',
    left: 28,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.background,
  },
  listContainer: {
    padding: 16,
  },
  deviceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deviceCardOffline: {
    borderColor: COLORS.offline + '60',
    backgroundColor: COLORS.offline + '08',
  },
  deviceCardWarning: {
    borderColor: COLORS.warning + '60',
    backgroundColor: COLORS.warning + '08',
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },
  deviceIP: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deviceDetails: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  detailItem: {
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  detailItemSmall: {
    minWidth: 60,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
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
  clearButton: {
    marginTop: 12,
    padding: 10,
  },
  clearButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default DevicesScreen;