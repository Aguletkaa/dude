// src/screens/DeviceDetailScreen.js - PEŁNA WERSJA z wszystkimi metrykami Ubiquiti
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
      Alert.alert('Błąd', 'Nie można załadować danych urządzenia');
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
    const seconds = parseInt(uptimeStr) || 0;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Helper do kolorowania wartości sygnału
  const getSignalColor = (signal) => {
    if (signal === null || signal === undefined) return COLORS.text;
    if (signal > -60) return COLORS.online;
    if (signal > -70) return COLORS.warning;
    return COLORS.offline;
  };

  // Helper do kolorowania procentów (wyższe = lepsze)
  const getPercentColor = (value, thresholdGood = 70, thresholdWarn = 50) => {
    if (value === null || value === undefined) return COLORS.text;
    if (value >= thresholdGood) return COLORS.online;
    if (value >= thresholdWarn) return COLORS.warning;
    return COLORS.offline;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  };

  if (!device) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Nie można załadować urządzenia</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDevice}>
          <Text style={styles.retryText}>Spróbuj ponownie</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Sprawdź czy to urządzenie Ubiquiti (ma dodatkowe metryki)
  const isUbiquiti = device.model || device.airmax_enabled || device.signal !== null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* ============ HEADER ============ */}
      <View style={styles.headerCard}>
        <View style={styles.deviceIconLarge}>
          <Icon name={getDeviceIcon(device.type)} size={50} color={COLORS.text} />
        </View>
        
        <Text style={styles.deviceName}>{device.name}</Text>
        <Text style={styles.deviceIP}>{device.ip}</Text>
        
        {/* STATUS */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(device.status) }]}>
          <Text style={styles.statusText}>{device.status?.toUpperCase() || 'UNKNOWN'}</Text>
        </View>

        {/* Model i wersja pod statusem */}
        {device.model && (
          <Text style={styles.modelText}>{device.model}</Text>
        )}
        {device.version && (
          <Text style={styles.versionText}>Firmware: {device.version}</Text>
        )}
      </View>

      {/* ============ UPTIME BOX ============ */}
      {device.uptime && (
        <View style={styles.uptimeBox}>
          <Icon name="schedule" size={24} color={COLORS.primary} />
          <Text style={styles.uptimeLabel}>Uptime</Text>
          <Text style={styles.uptimeValue}>{formatUptime(device.uptime)}</Text>
        </View>
      )}

      {/* ============ METRYKI SYSTEMOWE ============ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Metryki</Text>

        {/* CPU */}
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
                  backgroundColor: (device.cpu || 0) > 80 ? COLORS.offline : 
                                 (device.cpu || 0) > 60 ? COLORS.warning : COLORS.online
                }
              ]} 
            />
          </View>
        </View>

        {/* Memory */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Icon name="storage" size={24} color={COLORS.primary} style={styles.metricIcon} />
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>Pamięć RAM</Text>
              <Text style={styles.metricValue}>{device.memory || 0}%</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(device.memory || 0, 100)}%`,
                  backgroundColor: (device.memory || 0) > 85 ? COLORS.offline : 
                                 (device.memory || 0) > 70 ? COLORS.warning : COLORS.online
                }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* ============ WIRELESS / UBIQUITI METRICS ============ */}
      {isUbiquiti && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wireless</Text>

          {/* Connections */}
          {device.connections !== null && device.connections !== undefined && (
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Icon name="people" size={24} color={COLORS.primary} style={styles.metricIcon} />
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Połączeni klienci</Text>
                  <Text style={styles.metricValue}>{device.connections}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Signal / RSSI */}
          {device.signal !== null && device.signal !== undefined && (
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Icon name="signal-cellular-alt" size={24} color={COLORS.primary} style={styles.metricIcon} />
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Sygnał (RSSI)</Text>
                  <Text style={[styles.metricValue, { color: getSignalColor(device.signal) }]}>
                    {device.signal} dBm
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* TX Power */}
          {device.tx_power !== null && device.tx_power !== undefined && (
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Icon name="wifi-tethering" size={24} color={COLORS.primary} style={styles.metricIcon} />
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>TX Power</Text>
                  <Text style={styles.metricValue}>{device.tx_power} dBm</Text>
                </View>
              </View>
            </View>
          )}

          {/* Noise Floor */}
          {device.noise_floor !== null && device.noise_floor !== undefined && (
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Icon name="graphic-eq" size={24} color={COLORS.primary} style={styles.metricIcon} />
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Noise Floor</Text>
                  <Text style={styles.metricValue}>{device.noise_floor} dBm</Text>
                </View>
              </View>
            </View>
          )}

          {/* CCQ */}
          {device.ccq !== null && device.ccq !== undefined && (
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Icon name="network-check" size={24} color={COLORS.primary} style={styles.metricIcon} />
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>CCQ (Connection Quality)</Text>
                  <Text style={[styles.metricValue, { color: getPercentColor(device.ccq, 80, 60) }]}>
                    {device.ccq}%
                  </Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${Math.min(device.ccq || 0, 100)}%`,
                      backgroundColor: getPercentColor(device.ccq, 80, 60)
                    }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* ============ airMAX SECTION ============ */}
      {device.airmax_enabled && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>airMAX</Text>

          {/* airMAX Status */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Icon name="verified" size={24} color={COLORS.online} style={styles.metricIcon} />
              <View style={styles.metricInfo}>
                <Text style={styles.metricLabel}>airMAX</Text>
                <Text style={[styles.metricValue, { color: COLORS.online }]}>Enabled</Text>
              </View>
            </View>
          </View>

          {/* airMAX Quality */}
          {device.airmax_quality > 0 && (
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Icon name="stars" size={24} color={COLORS.primary} style={styles.metricIcon} />
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>airMAX Quality</Text>
                  <Text style={[styles.metricValue, { color: getPercentColor(device.airmax_quality) }]}>
                    {device.airmax_quality}%
                  </Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${device.airmax_quality}%`,
                      backgroundColor: getPercentColor(device.airmax_quality)
                    }
                  ]} 
                />
              </View>
            </View>
          )}

          {/* airMAX Capacity */}
          {device.airmax_capacity > 0 && (
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Icon name="speed" size={24} color={COLORS.primary} style={styles.metricIcon} />
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>airMAX Capacity</Text>
                  <Text style={[styles.metricValue, { color: getPercentColor(device.airmax_capacity, 60, 40) }]}>
                    {device.airmax_capacity}%
                  </Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${device.airmax_capacity}%`,
                      backgroundColor: getPercentColor(device.airmax_capacity, 60, 40)
                    }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* ============ INFORMACJE O URZĄDZENIU ============ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informacje</Text>
        
        <View style={styles.infoCard}>
          {/* Model */}
          {device.model && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Model</Text>
                <Text style={styles.infoValue}>{device.model}</Text>
              </View>
              <View style={styles.infoDivider} />
            </>
          )}

          {/* Version */}
          {device.version && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Wersja firmware</Text>
                <Text style={styles.infoValue}>{device.version}</Text>
              </View>
              <View style={styles.infoDivider} />
            </>
          )}

          {/* AP MAC */}
          {device.mac_address && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>AP MAC</Text>
                <Text style={[styles.infoValue, styles.monoText]}>{device.mac_address}</Text>
              </View>
              <View style={styles.infoDivider} />
            </>
          )}

          {/* Typ urządzenia */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Typ urządzenia</Text>
            <Text style={styles.infoValue}>
              {device.wireless_mode || (device.type || 'unknown').replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.infoDivider} />
          
          {/* IP */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Adres IP</Text>
            <Text style={[styles.infoValue, styles.monoText]}>{device.ip}</Text>
          </View>

          {/* Frequency */}
          {device.frequency && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Częstotliwość</Text>
                <Text style={styles.infoValue}>{device.frequency} MHz</Text>
              </View>
            </>
          )}

          {/* Channel Width */}
          {device.channel_width && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Szerokość kanału</Text>
                <Text style={styles.infoValue}>{device.channel_width} MHz</Text>
              </View>
            </>
          )}

          {/* SSID */}
          {device.ssid && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>SSID</Text>
                <Text style={styles.infoValue}>{device.ssid}</Text>
              </View>
            </>
          )}

          {/* Security */}
          {device.security && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Zabezpieczenia</Text>
                <Text style={styles.infoValue}>{device.security}</Text>
              </View>
            </>
          )}

          {/* LAN Speed */}
          {device.lan_speed && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>LAN Speed</Text>
                <Text style={styles.infoValue}>{device.lan_speed}</Text>
              </View>
            </>
          )}

          {/* Outage Count */}
          {device.outageCount !== null && device.outageCount !== undefined && (
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

          {/* Lokalizacja */}
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

      {/* ============ TRANSFER RATES ============ */}
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

      {/* ============ ACTIONS ============ */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.actionButton} onPress={onRefresh}>
          <Icon name="refresh" size={20} color={COLORS.background} style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>Odśwież dane</Text>
        </TouchableOpacity>
      </View>

      {/* ============ FOOTER ============ */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Automatyczne odświeżanie co 10 sekund
          {device.metrics_age && ` • Cache: ${device.metrics_age}s`}
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
  
  // Header
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
  deviceName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  deviceIP: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  modelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Uptime Box
  uptimeBox: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  uptimeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 12,
    flex: 1,
  },
  uptimeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },

  // Metric Cards
  metricCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
    height: 8,
    backgroundColor: COLORS.iconBg,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Info Card
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

  // Transfer
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

  // Actions
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

  // Footer
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