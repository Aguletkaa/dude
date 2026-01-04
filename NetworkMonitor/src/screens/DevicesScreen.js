// src/screens/DevicesScreen.js - POPRAWIONA WERSJA
import React, { useState, useEffect, useCallback } from 'react';
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

  const loadDevices = async () => {
    try {
      const data = await getDevices();
      
      // Dodaj logikę statusu "warning" dla urządzeń z problemami
      const processedData = data.map(device => {
        let status = device.status;
        
        // Sprawdź czy urządzenie ma problem (np. niski sygnał, wysokie CPU)
        if (status === 'online') {
          const hasWarning = 
            (device.signal && device.signal < -70) || // słaby sygnał
            (device.cpu && device.cpu > 80) ||        // wysokie CPU
            (device.memory && device.memory > 85);    // wysoka pamięć
          
          if (hasWarning) {
            status = 'warning';
          }
        }
        
        return { ...device, status };
      });
      
      setDevices(processedData);
      setFilteredDevices(processedData);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    let filtered = devices;

    // Filtrowanie po statusie
    if (filterStatus !== 'all') {
      filtered = filtered.filter(device => device.status === filterStatus);
    }

    // Wyszukiwanie - POPRAWIONE (używa 'ip' zamiast 'ip_address')
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(device =>
        device.name.toLowerCase().includes(query) ||
        device.ip.includes(query) || // POPRAWKA: było ip_address
        (device.location && device.location.toLowerCase().includes(query)) ||
        (device.model && device.model.toLowerCase().includes(query))
      );
    }

    setFilteredDevices(filtered);
  }, [filterStatus, searchQuery, devices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDevices();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return COLORS.online;
      case 'offline': return COLORS.offline;
      case 'warning': return COLORS.warning; // POPRAWKA: dodany warning
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

  // POPRAWKA: obsługa różnych formatów uptime
  const formatUptime = (uptime) => {
    if (!uptime) return 'N/A';
    
    // Jeśli uptime jest stringiem typu "2d 5h" - zwróć bezpośrednio
    if (typeof uptime === 'string' && uptime.includes('d')) {
      return uptime;
    }
    
    // Jeśli uptime to liczba sekund
    if (typeof uptime === 'number') {
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      
      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    }
    
    return 'N/A';
  };

  // POPRAWKA: formatowanie sygnału
  const formatSignal = (signal) => {
    if (!signal) return null;
    return `${signal} dBm`;
  };

  const renderDevice = ({ item }) => (
    <TouchableOpacity
      style={styles.deviceCard}
      onPress={() => navigation.navigate('DeviceDetail', { deviceId: item.id })}
    >
      <View style={styles.deviceHeader}>
        <View style={styles.deviceIconBox}>
          <Icon name={getDeviceIcon(item.type)} size={28} color={COLORS.text} />
        </View>
        
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name}</Text>
          <Text style={styles.deviceIP}>{item.ip}</Text>
        </View>

        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
      </View>

      <View style={styles.deviceDetails}>
        {/* POPRAWKA: lokalizacja z lepszym fallbackiem */}
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Lokalizacja</Text>
          <Text style={styles.detailValue}>
            {item.location || item.device_name || 'Nie podano'}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          {/* POPRAWKA: uptime z lepszym formatowaniem */}
          <View style={styles.detailItemSmall}>
            <Text style={styles.detailLabel}>Uptime</Text>
            <Text style={styles.detailValue}>
              {formatUptime(item.uptime)}
            </Text>
          </View>

          {/* Klienci połączeni (dla AP) */}
          {item.connections !== null && item.connections !== undefined && (
            <View style={styles.detailItemSmall}>
              <Text style={styles.detailLabel}>Klienci</Text>
              <Text style={styles.detailValue}>{item.connections || 0}</Text>
            </View>
          )}

          {/* Sygnał (dla urządzeń wireless) */}
          {item.signal !== null && item.signal !== undefined && (
            <View style={styles.detailItemSmall}>
              <Text style={styles.detailLabel}>Sygnał</Text>
              <Text style={[styles.detailValue, { 
                color: item.signal > -60 ? COLORS.online : 
                       item.signal > -70 ? COLORS.warning : COLORS.offline 
              }]}>
                {formatSignal(item.signal)}
              </Text>
            </View>
          )}

          {/* CPU (jeśli dostępne) */}
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Urządzenia</Text>
        <Text style={styles.headerSubtitle}>{filteredDevices.length} urządzeń</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Icon 
          name="search" 
          size={20} 
          color={COLORS.textMuted} 
          style={styles.searchIcon}
        />
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

      {/* Filters - POPRAWKA: dodany filtr "warning" */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
          onPress={() => setFilterStatus('all')}
        >
          <Text style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}>
            Wszystkie
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'online' && styles.filterChipActive]}
          onPress={() => setFilterStatus('online')}
        >
          <View style={[styles.filterDot, { backgroundColor: COLORS.online }]} />
          <Text style={[styles.filterText, filterStatus === 'online' && styles.filterTextActive]}>
            Online
          </Text>
        </TouchableOpacity>

        {/* NOWY FILTR: Warning */}
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'warning' && styles.filterChipActive]}
          onPress={() => setFilterStatus('warning')}
        >
          <View style={[styles.filterDot, { backgroundColor: COLORS.warning }]} />
          <Text style={[styles.filterText, filterStatus === 'warning' && styles.filterTextActive]}>
            Warning
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'offline' && styles.filterChipActive]}
          onPress={() => setFilterStatus('offline')}
        >
          <View style={[styles.filterDot, { backgroundColor: COLORS.offline }]} />
          <Text style={[styles.filterText, filterStatus === 'offline' && styles.filterTextActive]}>
            Offline
          </Text>
        </TouchableOpacity>
      </View>

      {/* Device List */}
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
              {searchQuery ? 'Nie znaleziono urządzeń' : 'Brak urządzeń'}
            </Text>
            {searchQuery && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearButtonText}>Wyczyść wyszukiwanie</Text>
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
    paddingRight: 40,
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
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  deviceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  deviceIP: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
    flex: 1,
    minWidth: 80,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
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
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  clearButtonText: {
    color: COLORS.background,
    fontWeight: '600',
  },
});

export default DevicesScreen;