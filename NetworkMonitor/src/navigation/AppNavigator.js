// src/navigation/AppNavigator.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
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
import COLORS from '../constants/colors';
import NotificationsSettingsScreen from '../screens/NotificationsSettingsScreen';


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator - główna nawigacja po zalogowaniu
const MainTabs = () => {
  const [alertCount, setAlertCount] = useState(0);

  // Pobierz liczbę niepotwierdonych alertów
  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token') || 
                      await AsyncStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch('http://10.0.2.2:8000/api/alerts/summary', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          // Wszystkie aktywne: critical + info (bez warning)
          const totalActive = (data.critical_count || 0) + (data.info_count || 0);
          setAlertCount(totalActive);
        }
      } catch (error) {
        console.error('Error fetching alert count:', error);
      }
    };

    fetchAlertCount();
    
    // Odświeżaj co 30 sekund
    const interval = setInterval(fetchAlertCount, 30000);
    return () => clearInterval(interval);
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
          tabBarIcon: ({ color, size }) => (
            <Icon name="dashboard" size={24} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="Devices"
        component={DevicesScreen}
        options={{
          tabBarLabel: 'Urządzenia',
          tabBarIcon: ({ color, size }) => (
            <Icon name="router" size={24} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          tabBarLabel: 'Alerty',
          tabBarIcon: ({ color, size }) => (
            <Icon name="notifications" size={24} color={color} />
          ),
          tabBarBadge: alertCount > 0 ? alertCount : null,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.offline,
            color: COLORS.background,
            fontSize: 10,
            fontWeight: '700',
          },
        }}
      />
    </Tab.Navigator>
  );
};

// Main Navigator
const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Sprawdź czy użytkownik jest zalogowany
  useEffect(() => {
    checkLoginStatus();
    
    // Sprawdzaj co sekundę (prosty polling)
    const interval = setInterval(() => {
      checkLoginStatus();
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const checkLoginStatus = async () => {
    try {
      // Sprawdź oba możliwe klucze (stara wersja używała auth_token)
      const token = await AsyncStorage.getItem('auth_token') || 
                    await AsyncStorage.getItem('access_token');
      setIsLoggedIn(!!token);
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading screen
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
          // Auth Stack - nie zalogowany
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // Main Stack - zalogowany
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            
            {/* Device Detail jako modal/push screen */}
            <Stack.Screen 
              name="DeviceDetail" 
              component={DeviceDetailScreen}
              options={{
                headerShown: true,
                title: 'Szczegóły urządzenia',
                headerStyle: {
                  backgroundColor: COLORS.backgroundSecondary,
                },
                headerTintColor: COLORS.text,
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />

            {/* Device Picker - wybór urządzenia do wykresów */}
            <Stack.Screen 
              name="DevicePicker" 
              component={DevicePickerScreen}
              options={{
                headerShown: true,
                title: 'Wybierz urządzenie',
                headerStyle: {
                  backgroundColor: COLORS.backgroundSecondary,
                },
                headerTintColor: COLORS.text,
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />

            {/* Charts Screen */}
            <Stack.Screen 
              name="Charts" 
              component={ChartsScreen}
              options={{
                headerShown: true,
                title: 'Wykresy',
                headerStyle: {
                  backgroundColor: COLORS.backgroundSecondary,
                },
                headerTintColor: COLORS.text,
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />

            {/* Stats Screen */}
            <Stack.Screen 
              name="Stats" 
              component={StatsScreen}
              options={{
                headerShown: true,
                title: 'Statystyki',
                headerStyle: {
                  backgroundColor: COLORS.backgroundSecondary,
                },
                headerTintColor: COLORS.text,
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />

            {/* Map Screen */}
            <Stack.Screen 
              name="Map" 
              component={MapScreen}
              options={{
                headerShown: true,
                title: 'Mapa sieci',
                headerStyle: {
                  backgroundColor: COLORS.backgroundSecondary,
                },
                headerTintColor: COLORS.text,
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />

            {/* Settings Screen */}
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: 'Ustawienia',
                headerStyle: {
                  backgroundColor: COLORS.backgroundSecondary,
                },
                headerTintColor: COLORS.text,
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen 
              name="NotificationsSettings" 
              component={NotificationsSettingsScreen}
              options={{
              headerShown: true,
              title: 'Powiadomienia',
              headerStyle: { backgroundColor: COLORS.backgroundSecondary 
              },
              headerTintColor: COLORS.text,
              }}
            />
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
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

export default AppNavigator;