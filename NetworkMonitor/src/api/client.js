// src/api/client.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://10.0.2.2:8000'; // Android emulator
// const BASE_URL = 'http://localhost:8000'; // iOS simulator
// const BASE_URL = 'http://192.168.1.100:8000'; // Fizyczny telefon

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

//API FUNCTIONS

// AUTH
export const login = async (username, password) => {
  try {
    const response = await apiClient.post('/auth/login', {
      username,
      password,
    });
    
    await AsyncStorage.setItem('auth_token', response.data.access_token);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = async () => {
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('user');
};

// DEVICES
export const getDevices = async (status = null) => {
  try {
    const params = status ? { status } : {};
    const response = await apiClient.get('/devices', { params });
    return response.data;
  } catch (error) {
    console.error('Get devices error:', error);
    throw error;
  }
};

export const getDeviceById = async (deviceId) => {
  try {
    const response = await apiClient.get(`/devices/${deviceId}`);
    return response.data;
  } catch (error) {
    console.error('Get device error:', error);
    throw error;
  }
};

// ALERTS
export const getAlerts = async (severity = null, acknowledged = null) => {
  try {
    const params = {};
    if (severity) params.severity = severity;
    if (acknowledged !== null) params.acknowledged = acknowledged;
    
    const response = await apiClient.get('/alerts', { params });
    return response.data;
  } catch (error) {
    console.error('Get alerts error:', error);
    throw error;
  }
};

export const acknowledgeAlert = async (alertId) => {
  try {
    const response = await apiClient.post(`/alerts/${alertId}/acknowledge`);
    return response.data;
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    throw error;
  }
};

// DASHBOARD
export const getDashboardStats = async () => {
  try {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    throw error;
  }
};

// Test connection
export const testConnection = async () => {
  try {
    const response = await apiClient.get('/');
    return response.data;
  } catch (error) {
    console.error('Connection test failed:', error);
    throw error;
  }
};

export default apiClient;