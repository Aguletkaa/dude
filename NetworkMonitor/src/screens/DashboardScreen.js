// src/screens/DashboardScreen.js - Final Version z alertami
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
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDashboardStats, logout } from '../api/client';
import COLORS from '../constants/colors';

const DashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('Użytkowniku');

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token') || 
                    await AsyncStorage.getItem('access_token');
      
      // Pobierz dane użytkownika
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUserName(user.username || user.full_name || 'Użytkowniku');
      }
      
      const [statsData, alertsData] = await Promise.all([
        getDashboardStats(),
        fetch('http://10.0.2.2:8000/api/alerts/summary', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }).then(r => r.json()).catch(() => ({ critical_count: 0 }))
      ]);
      
      setStats(statsData);
      // Wszystkie aktywne: critical + info
      const totalActive = (alertsData.critical_count || 0) + (alertsData.info_count || 0);
      setAlertCount(totalActive);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

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
        <View>
          <Text style={styles.greeting}>Witaj, {userName}</Text>
          <Text style={styles.subtitle}>Panel zarządzania siecią</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Icon name="logout" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Grid Menu - ULEPSZONE */}
      <View style={styles.menuGrid}>
        <TouchableOpacity 
          style={[styles.menuTile, styles.tile1]}
          onPress={() => navigation.navigate('Map')}
          activeOpacity={0.7}
        >
          <View style={styles.iconGlow}>
            <Icon name="map" size={48} color={COLORS.text} />
          </View>
          <Text style={styles.tileText}>Mapa</Text>
          <Text style={styles.tileSubtext}>Topologia sieci</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuTile, styles.tile2]}
          onPress={() => navigation.navigate('Devices')}
          activeOpacity={0.7}
        >
          <View style={styles.iconGlow}>
            <Icon name="router" size={48} color={COLORS.text} />
          </View>
          <Text style={styles.tileText}>Urządzenia</Text>
          <Text style={styles.tileSubtext}>{stats?.total_devices || 0} urządzeń</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuTile, styles.tile3]}
          onPress={() => navigation.navigate('Alerts')}
          activeOpacity={0.7}
        >
          <View style={styles.iconGlow}>
            <Icon name="warning" size={48} color={COLORS.text} />
          </View>
          <Text style={styles.tileText}>Alerty</Text>
          <Text style={styles.tileSubtext}>
            {alertCount} aktywnych
          </Text>
          {alertCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{alertCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuTile, styles.tile4]}
          onPress={() => navigation.navigate('DevicePicker')}
          activeOpacity={0.7}
        >
          <View style={styles.iconGlow}>
            <Icon name="show-chart" size={48} color={COLORS.text} />
          </View>
          <Text style={styles.tileText}>Wykresy</Text>
          <Text style={styles.tileSubtext}>Analiza danych</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuTile, styles.tile5]}
          onPress={() => navigation.navigate('Stats')}
          activeOpacity={0.7}
        >
          <View style={styles.iconGlow}>
            <Icon name="bar-chart" size={48} color={COLORS.text} />
          </View>
          <Text style={styles.tileText}>Statystyki</Text>
          <Text style={styles.tileSubtext}>Raporty</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuTile, styles.tile6]}
          onPress={() => navigation.navigate('NotificationsSettings')}  // ZMIEŃ TO
          activeOpacity={0.7}
        >
          <View style={styles.iconGlow}>
            <Icon name="notifications" size={48} color={COLORS.text} />
          </View>
          <Text style={styles.tileText}>Powiadomienia</Text>
          <Text style={styles.tileSubtext}>Konfiguracja</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuTile, styles.tile7]}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <View style={styles.iconGlow}>
            <Icon name="settings" size={48} color={COLORS.text} />
          </View>
          <Text style={styles.tileText}>Ustawienia</Text>
          <Text style={styles.tileSubtext}>Konto</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Przegląd sieci</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Urządzeń</Text>
            <Text style={styles.statValue}>{stats?.total_devices || 0}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Online</Text>
            <Text style={[styles.statValue, { color: COLORS.online }]}>
              {stats?.online_devices || 0}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Offline</Text>
            <Text style={[styles.statValue, { color: COLORS.offline }]}>
              {stats?.offline_devices || 0}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Alerty</Text>
            <Text style={[styles.statValue, { color: COLORS.offline }]}>
              {alertCount}
            </Text>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.backgroundSecondary,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '300',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  menuTile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 12,
  },
  tile1: { 
    backgroundColor: '#8B7355',
  },
  tile2: { 
    backgroundColor: '#7A6B54',
  },
  tile3: { 
    backgroundColor: '#A0836C',
  },
  tile4: { 
    backgroundColor: '#6B5B4A',
  },
  tile5: { 
    backgroundColor: '#9B8570',
  },
  tile6: { 
    backgroundColor: '#7C6D5C',
  },
  tile7: { 
    backgroundColor: '#8A7B6A',
  },
  iconGlow: {
    marginBottom: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  tileText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 4,
  },
  tileSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.offline,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  statsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
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
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.text,
  },
});

export default DashboardScreen;