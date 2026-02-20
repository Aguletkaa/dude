import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../constants/colors';

const API_URL = 'http://10.0.2.2:8000';

const DevicePickerScreen = ({ navigation }) => {
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = devices.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.ip.includes(searchQuery)
      );
      setFilteredDevices(filtered);
    } else {
      setFilteredDevices(devices);
    }
  }, [searchQuery, devices]);

  const loadDevices = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token') ||
                    await AsyncStorage.getItem('access_token');

      const response = await fetch(`${API_URL}/devices`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      const ubiquitiDevices = data.filter(d => d.ip.startsWith('192.168.10.'));
      setDevices(ubiquitiDevices);
      setFilteredDevices(ubiquitiDevices);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDevice = ({ item }) => (
    <TouchableOpacity
      style={styles.deviceCard}
      onPress={() => navigation.navigate('Charts', {
        deviceId: item.id,
        deviceName: item.name
      })}
    >
      <View style={[
        styles.statusDot,
        { backgroundColor: item.status === 'online' ? COLORS.online : COLORS.offline }
      ]} />

      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceIP}>{item.ip}</Text>
      </View>

      <Icon name="chevron-right" size={24} color={COLORS.textMuted} />
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
          <Text style={styles.headerTitle}>Wybierz urzadzenie</Text>
          <Text style={styles.headerSubtitle}>{filteredDevices.length} urzadzen Ubiquiti</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Szukaj urzadzenia..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredDevices}
        renderItem={renderDevice}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="router" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Brak urzadzen</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  deviceIP: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
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

export default DevicePickerScreen;