import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getDeviceById } from '../api/client';
import COLORS from '../constants/colors';

const DeviceDetailScreen = ({ route, navigation }) => {
  const { deviceId } = route.params;
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDevice = async () => {
    try {
      const data = await getDeviceById(deviceId);
      setDevice(data);
    } catch (error) {
      console.error('Error loading device:', error);
      Alert.alert('Blad', 'Nie mozna zaladowac danych urzadzenia');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDevice();
    const interval = setInterval(() => {
      loadDevice();
    }, 10000);
    return () => clearInterval(interval);
  }, [deviceId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDevice();
  };

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

  const formatUptime = (uptimeStr) => {
    if (typeof uptimeStr === 'string' && uptimeStr.includes('d')) {
      return uptimeStr;
    }
    if (typeof uptimeStr === 'number') {
      const days = Math.floor(uptimeStr / 86400);
      const hours = Math.floor((uptimeStr % 86400) / 3600);
      const minutes = Math.floor((uptimeStr % 3600) / 60);
      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }
    return uptimeStr || 'N/A';
  };

  const getProgressColor = (value, warningAt, criticalAt) => {
    if (value >= criticalAt) return COLORS.offline;
    if (value >= warningAt) return COLORS.warning;
    return COLORS.online;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={64} color={COLORS.offline} />
        <Text style={styles.errorText}>Nie znaleziono urzadzenia</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Wroc</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{device.name}</Text>
          <Text style={styles.headerSubtitle}>{device.ip}</Text>
        </View>
      </View>

      <View style={styles.headerCard}>
        <View style={[styles.deviceIconLarge, { borderColor: getStatusColor(device.status) }]}>
          <Icon name={getDeviceIcon(device.type)} size={50} color={COLORS.text} />
        </View>

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(device.status) }]}>
          <Text style={styles.statusText}>{device.status?.toUpperCase() || 'UNKNOWN'}</Text>
        </View>

        {device.model && (
          <Text style={styles.modelText}>{device.model}</Text>
        )}
        {device.version && (
          <Text style={styles.versionText}>Firmware: {device.version}</Text>
        )}
      </View>

      {device.uptime && (
        <View style={styles.uptimeBox}>
          <Icon name="schedule" size={24} color={COLORS.primary} />
          <Text style={styles.uptimeLabel}>Uptime</Text>
          <Text style={styles.uptimeValue}>{formatUptime(device.uptime)}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Metryki</Text>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Icon name="memory" size={24} color={COLORS.primary} style={styles.metricIcon} />
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>Procesor (CPU)</Text>
              <Text style={styles.metricValue}>{device.cpu || 0}%</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(device.cpu || 0, 100)}%`,
                  backgroundColor: getProgressColor(device.cpu || 0, 60, 80)
                }
              ]}
            />
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Icon name="storage" size={24} color={COLORS.primary} style={styles.metricIcon} />
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>Pamiec RAM</Text>
              <Text style={styles.metricValue}>{device.memory || 0}%</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(device.memory || 0, 100)}%`,
                  backgroundColor: getProgressColor(device.memory || 0, 70, 85)
                }
              ]}
            />
          </View>
        </View>

        {device.signal && (
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Icon name="signal-cellular-alt" size={24} color={COLORS.primary} style={styles.metricIcon} />
              <View style={styles.metricInfo}>
                <Text style={styles.metricLabel}>Sygnal</Text>
                <Text style={styles.metricValue}>{device.signal} dBm</Text>
              </View>
            </View>
          </View>
        )}

        {device.connections !== null && device.connections !== undefined && (
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Icon name="people" size={24} color={COLORS.primary} style={styles.metricIcon} />
              <View style={styles.metricInfo}>
                <Text style={styles.metricLabel}>Polaczeni klienci</Text>
                <Text style={styles.metricValue}>{device.connections}</Text>
              </View>
            </View>
          </View>
        )}

        {device.noise_floor && (
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Icon name="hearing" size={24} color={COLORS.primary} style={styles.metricIcon} />
              <View style={styles.metricInfo}>
                <Text style={styles.metricLabel}>Noise Floor</Text>
                <Text style={styles.metricValue}>{device.noise_floor} dBm</Text>
              </View>
            </View>
          </View>
        )}

        {device.tx_power && (
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Icon name="bolt" size={24} color={COLORS.primary} style={styles.metricIcon} />
              <View style={styles.metricInfo}>
                <Text style={styles.metricLabel}>TX Power</Text>
                <Text style={styles.metricValue}>{device.tx_power} dBm</Text>
              </View>
            </View>
          </View>
        )}

        {device.airmax_quality !== null && device.airmax_quality !== undefined && (
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Icon name="speed" size={24} color={COLORS.primary} style={styles.metricIcon} />
              <View style={styles.metricInfo}>
                <Text style={styles.metricLabel}>airMAX Quality</Text>
                <Text style={styles.metricValue}>{device.airmax_quality}%</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(device.airmax_quality, 100)}%`,
                    backgroundColor: getProgressColor(100 - device.airmax_quality, 60, 40)
                  }
                ]}
              />
            </View>
          </View>
        )}

        {device.airmax_capacity !== null && device.airmax_capacity !== undefined && (
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Icon name="network-check" size={24} color={COLORS.primary} style={styles.metricIcon} />
              <View style={styles.metricInfo}>
                <Text style={styles.metricLabel}>airMAX Capacity</Text>
                <Text style={styles.metricValue}>{device.airmax_capacity}%</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(device.airmax_capacity, 100)}%`,
                    backgroundColor: getProgressColor(100 - device.airmax_capacity, 60, 40)
                  }
                ]}
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informacje</Text>

        <View style={styles.infoCard}>
          {device.model && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Model</Text>
                <Text style={styles.infoValue}>{device.model}</Text>
              </View>
              <View style={styles.infoDivider} />
            </>
          )}

          {device.version && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Wersja firmware</Text>
                <Text style={styles.infoValue}>{device.version}</Text>
              </View>
              <View style={styles.infoDivider} />
            </>
          )}

          {device.mac_address && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>AP MAC</Text>
                <Text style={[styles.infoValue, styles.monoText]}>{device.mac_address}</Text>
              </View>
              <View style={styles.infoDivider} />
            </>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Typ urzadzenia</Text>
            <Text style={styles.infoValue}>
              {device.wireless_mode || (device.type || 'unknown').replace('_', ' ').toUpperCase()}
            </Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Adres IP</Text>
            <Text style={[styles.infoValue, styles.monoText]}>{device.ip}</Text>
          </View>

          {device.frequency && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Czestotliwosc</Text>
                <Text style={styles.infoValue}>{device.frequency}</Text>
              </View>
            </>
          )}

          {device.outageCount !== undefined && device.outageCount !== null && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Liczba awarii</Text>
                <Text style={[
                  styles.infoValue,
                  { color: device.outageCount > 100 ? COLORS.offline :
                           device.outageCount > 50 ? COLORS.warning : COLORS.text }
                ]}>
                  {device.outageCount}
                </Text>
              </View>
            </>
          )}

          {device.location && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Lokalizacja</Text>
                <Text style={styles.infoValue}>{device.location}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {(device.tx_rate || device.rx_rate) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transfer</Text>

          <View style={styles.transferRow}>
            {device.tx_rate && (
              <View style={styles.transferBox}>
                <Icon name="arrow-upward" size={20} color={COLORS.online} />
                <Text style={styles.transferLabel}>TX</Text>
                <Text style={styles.transferValue}>{device.tx_rate} Mbps</Text>
              </View>
            )}
            {device.rx_rate && (
              <View style={styles.transferBox}>
                <Icon name="arrow-downward" size={20} color={COLORS.primary} />
                <Text style={styles.transferLabel}>RX</Text>
                <Text style={styles.transferValue}>{device.rx_rate} Mbps</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.actionButton} onPress={onRefresh}>
          <Icon name="refresh" size={20} color={COLORS.background} style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>Odswiez dane</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Automatyczne odswiezanie co 10 sekund
          {device.metrics_age && ` | Cache: ${device.metrics_age}s`}
        </Text>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
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
    fontFamily: 'monospace',
  },
  headerCard: {
    backgroundColor: COLORS.card,
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deviceIconLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  modelText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  uptimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  uptimeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  uptimeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  metricCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    marginRight: 12,
  },
  metricInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.iconBg,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'right',
    flex: 1,
  },
  monoText: {
    fontFamily: 'monospace',
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  transferRow: {
    flexDirection: 'row',
    gap: 12,
  },
  transferBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transferLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  transferValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});

export default DeviceDetailScreen;