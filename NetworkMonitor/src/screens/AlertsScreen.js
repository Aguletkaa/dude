// src/screens/AlertsScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../constants/colors';

const API_URL = 'http://10.0.2.2:8000';
const SWIPE_THRESHOLD = -80;

const SwipeableAlert = ({ item, onDelete, onSelect, isSelected, selectionMode }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          translateX.setValue(g.dx);
          deleteOpacity.setValue(Math.min(Math.abs(g.dx) / 80, 1));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < SWIPE_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: -400,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onDelete(item.id));
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          Animated.timing(deleteOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

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
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const mo = (date.getMonth() + 1).toString().padStart(2, '0');
    const yy = date.getFullYear();
    return `${hh}:${mm} ${dd}.${mo}.${yy}`;
  };

  return (
    <View style={styles.swipeContainer}>
      <Animated.View style={[styles.deleteBackground, { opacity: deleteOpacity }]}>
        <Icon name="delete" size={28} color="#fff" />
        <Text style={styles.deleteBackgroundText}>Usuń</Text>
      </Animated.View>

      {/* Karta */}
      <Animated.View
        style={[styles.alertCard, { transform: [{ translateX }] }]}
        {...(selectionMode ? {} : panResponder.panHandlers)}
      >
        {/* Checkbox w trybie zaznaczania */}
        {selectionMode && (
          <TouchableOpacity style={styles.checkbox} onPress={() => onSelect(item.id)}>
            <Icon
              name={isSelected ? 'check-box' : 'check-box-outline-blank'}
              size={24}
              color={isSelected ? COLORS.primary : COLORS.textMuted}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.alertCardInner}
          onLongPress={() => onSelect(item.id)}
          activeOpacity={0.8}
        >
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
        </TouchableOpacity>

        {/* Przycisk X (gdy nie w trybie zaznaczania) */}
        {!selectionMode && (
          <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(item.id)}>
            <Icon name="close" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

// GŁÓWNY EKRAN
const AlertsScreen = ({ navigation }) => {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({ critical_count: 0, info_count: 0, unacknowledged: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const loadAlerts = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token') ||
                    await AsyncStorage.getItem('access_token');
      if (!token) return;

      const severityParam = filterSeverity !== 'all' ? `&severity=${filterSeverity}` : '';

      const [summaryRes, alertsRes] = await Promise.all([
        fetch(`${API_URL}/api/alerts/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/alerts?resolved=false&limit=200${severityParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const summaryData = await summaryRes.json();
      setSummary({
        critical_count: summaryData.critical_count || 0,
        info_count: summaryData.info_count || 0,
        unacknowledged: summaryData.unacknowledged || 0,
      });

      const alertsData = await alertsRes.json();
      const filtered = (alertsData.alerts || []).filter(
        a => a.severity === 'critical' || a.severity === 'info'
      );
      setAlerts(filtered);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterSeverity]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAlerts();
  }, [loadAlerts]);

  const deleteAlert = useCallback(async (alertId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token') ||
                    await AsyncStorage.getItem('access_token');
      await fetch(`${API_URL}/api/alerts/${alertId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(alertId); return s; });
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      'Usuń alerty',
      `Czy na pewno chcesz usunąć ${selectedIds.size} ${selectedIds.size === 1 ? 'alert' : 'alertów'}?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            const token = await AsyncStorage.getItem('auth_token') ||
                          await AsyncStorage.getItem('access_token');
            await Promise.all(
              Array.from(selectedIds).map(id =>
                fetch(`${API_URL}/api/alerts/${id}`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                })
              )
            );
            setAlerts(prev => prev.filter(a => !selectedIds.has(a.id)));
            setSelectedIds(new Set());
            setSelectionMode(false);
          },
        },
      ]
    );
  }, [selectedIds]);

  const toggleSelect = useCallback((id) => {
    setSelectionMode(true);
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      if (s.size === 0) setSelectionMode(false);
      return s;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(alerts.map(a => a.id)));
  }, [alerts]);

  const cancelSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const renderAlert = useCallback(({ item }) => (
    <SwipeableAlert
      item={item}
      onDelete={deleteAlert}
      onSelect={toggleSelect}
      isSelected={selectedIds.has(item.id)}
      selectionMode={selectionMode}
    />
  ), [deleteAlert, toggleSelect, selectedIds, selectionMode]);

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
          <Text style={styles.headerTitle}>Alerty</Text>
          <Text style={styles.headerSubtitle}>{alerts.length} aktywnych</Text>
        </View>

        {selectionMode ? (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={selectAll} style={styles.headerBtn}>
              <Icon name="select-all" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={deleteSelected} style={styles.headerBtn}>
              <Icon name="delete" size={22} color={COLORS.offline} />
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelSelection} style={styles.headerBtn}>
              <Icon name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setSelectionMode(true)} style={styles.headerBtn}>
            <Icon name="playlist-add-check" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Pasek zaznaczania */}
      {selectionMode && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>
            Zaznaczono: {selectedIds.size} / {alerts.length}
          </Text>
          <TouchableOpacity onPress={selectAll}>
            <Text style={styles.selectAllText}>Zaznacz wszystkie</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Summary Cards */}
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

      {/* Filtry */}
      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'Wszystkie' },
          { key: 'critical', label: 'Critical' },
          { key: 'info', label: 'Info' },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filterSeverity === f.key && styles.filterChipActive]}
            onPress={() => setFilterSeverity(f.key)}
          >
            <Text style={[styles.filterText, filterSeverity === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista alertów */}
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
                : `Brak alertów typu ${filterSeverity}`}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    backgroundColor: COLORS.backgroundSecondary,
    gap: 12,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 6 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },

  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.primary + '15',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary + '30',
  },
  selectionText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  selectAllText: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },

  summaryRow: { flexDirection: 'row', padding: 16, gap: 12 },
  summaryCard: {
    flex: 1, borderRadius: 12, padding: 16,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  summaryCount: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  filterChip: {
    flex: 1, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.background },

  listContainer: { padding: 16, paddingTop: 0 },

  swipeContainer: { marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  deleteBackground: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 100,
    backgroundColor: COLORS.offline,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, gap: 4,
  },
  deleteBackgroundText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  alertCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertCardInner: { flex: 1, padding: 16 },
  checkbox: { paddingLeft: 12, paddingRight: 4 },

  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  severityBadge: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  alertInfo: { flex: 1 },
  deviceName: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  deviceIP: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'monospace' },
  timeText: { fontSize: 11, color: COLORS.textMuted },

  alertBody: {},
  alertMessage: { fontSize: 14, color: COLORS.text, lineHeight: 20, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: COLORS.textMuted },

  deleteButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, textAlign: 'center' },
});

export default AlertsScreen;