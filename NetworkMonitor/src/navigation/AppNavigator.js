// src/navigation/AppNavigator.js
import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DevicesScreen from '../screens/DevicesScreen';
import DeviceDetailScreen from '../screens/DeviceDetailScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ChartsScreen from '../screens/ChartsScreen';
import StatsScreen from '../screens/StatsScreen';
import DevicePickerScreen from '../screens/DevicePickerScreen';
import MapScreen from '../screens/MapScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationsSettingsScreen from '../screens/NotificationsSettingsScreen';
import COLORS from '../constants/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const API_URL = 'http://10.0.2.2:8000';
const BADGE_REFRESH_INTERVAL = 30000;

const MainTabs = () => {
  const [alertCount, setAlertCount] = useState(0);
  const intervalRef = useRef(null);

  const fetchAlertCount = async (silent = false) => {
    try {
      const token =
        (await AsyncStorage.getItem('auth_token')) ||
        (await AsyncStorage.getItem('access_token'));
      if (!token) return;

      const response = await fetch(`${API_URL}/api/alerts/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const totalActive = (data.critical_count || 0) + (data.info_count || 0);
        setAlertCount(totalActive);
      }
    } catch (error) {
      console.error('Error fetching alert count:', error);
    }
  };

  useEffect(() => {
    fetchAlertCount();

    intervalRef.current = setInterval(() => {
      fetchAlertCount(true);
    }, BADGE_REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.backgroundSecondary,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Panel główny',
          tabBarIcon: ({ color }) => (
            <Icon name="dashboard" size={24} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Devices"
        component={DevicesScreen}
        options={{
          tabBarLabel: 'Urządzenia',
          tabBarIcon: ({ color }) => (
            <Icon name="router" size={24} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          tabBarLabel: 'Alerty',
          tabBarIcon: ({ color }) => (
            <Icon name="notifications" size={24} color={color} />
          ),
          tabBarBadge: alertCount > 0 ? alertCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.offline,
            color: COLORS.background,
            fontSize: 10,
            fontWeight: '700',
          },
        }}
        listeners={{
          // Odśwież licznik gdy wchodzimy w zakładkę Alerty
          tabPress: () => {
            setTimeout(() => fetchAlertCount(), 500);
          },
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
    const interval = setInterval(checkLoginStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('auth_token')) ||
        (await AsyncStorage.getItem('access_token'));
      setIsLoggedIn(!!token);
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Ładowanie...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} />
            <Stack.Screen name="Charts" component={ChartsScreen} />
            <Stack.Screen name="Stats" component={StatsScreen} />
            <Stack.Screen name="DevicePicker" component={DevicePickerScreen} />
            <Stack.Screen name="Map" component={MapScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="NotificationsSettings" component={NotificationsSettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default AppNavigator;