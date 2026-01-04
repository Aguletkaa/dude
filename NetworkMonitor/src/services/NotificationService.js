// src/services/NotificationService.js - Firebase Cloud Messaging
import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.0.2.2:8000';

class NotificationService {
  
  // Poproś o pozwolenie na powiadomienia
  async requestUserPermission() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
    }

    return enabled;
  }

  // Pobierz FCM token
  async getFCMToken() {
    try {
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        console.log('FCM Token:', fcmToken);
        await AsyncStorage.setItem('fcm_token', fcmToken);
        return fcmToken;
      }
      return null;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Zarejestruj token w backendzie
  async registerForPushNotifications() {
    try {
      // Sprawdź pozwolenie
      const hasPermission = await this.requestUserPermission();
      
      if (!hasPermission) {
        console.log('Push notification permission denied');
        return null;
      }

      // Pobierz FCM token
      const fcmToken = await this.getFCMToken();
      
      if (!fcmToken) {
        console.log('Failed to get FCM token');
        return null;
      }

      // Wyślij token do backendu
      await this.sendTokenToBackend(fcmToken);

      return fcmToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  // Wyślij token do backendu
  async sendTokenToBackend(token) {
    try {
      const authToken = await AsyncStorage.getItem('auth_token') || 
                        await AsyncStorage.getItem('access_token');

      if (!authToken) {
        console.log('No auth token, skipping push token registration');
        return;
      }

      const response = await fetch(`${API_URL}/api/user/register-push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          push_token: token,
          device_type: Platform.OS,
        }),
      });

      if (response.ok) {
        console.log('✅ FCM token registered with backend');
      } else {
        console.log('❌ Failed to register FCM token with backend');
      }
    } catch (error) {
      console.error('Error sending FCM token to backend:', error);
    }
  }

  // Nasłuchuj na powiadomienia (foreground)
  onMessageReceived(callback) {
    return messaging().onMessage(async remoteMessage => {
      console.log('📩 Notification received (foreground):', remoteMessage);
      if (callback) {
        callback(remoteMessage);
      }
    });
  }

  // Nasłuchuj na kliknięcia w powiadomienia (background/quit)
  onNotificationOpenedApp(callback) {
    // App opened from background
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📬 Notification opened from background:', remoteMessage);
      if (callback) {
        callback(remoteMessage);
      }
    });

    // App opened from quit state
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('📬 Notification opened from quit state:', remoteMessage);
          if (callback) {
            callback(remoteMessage);
          }
        }
      });
  }

  // Pobierz ustawienia powiadomień
  async getNotificationSettings() {
    try {
      const settings = await AsyncStorage.getItem('notification_settings');
      if (settings) {
        return JSON.parse(settings);
      }
      
      return {
        push_enabled: true,
        email_enabled: false,
        sms_enabled: false,
        sms_number: '',
        email_address: '',
      };
    } catch (error) {
      console.error('Error loading notification settings:', error);
      return {
        push_enabled: true,
        email_enabled: false,
        sms_enabled: false,
        sms_number: '',
        email_address: '',
      };
    }
  }

  // Zapisz ustawienia powiadomień
  async saveNotificationSettings(settings) {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
      
      const authToken = await AsyncStorage.getItem('auth_token') || 
                        await AsyncStorage.getItem('access_token');

      if (authToken) {
        await fetch(`${API_URL}/api/user/notification-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(settings),
        });
      }

      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      return false;
    }
  }

  // Wyślij lokalne powiadomienie testowe
  async sendLocalNotification(title, body) {
    // Dla Firebase - wyślij request do backendu żeby wysłał push
    try {
      const authToken = await AsyncStorage.getItem('auth_token') || 
                        await AsyncStorage.getItem('access_token');
      const fcmToken = await AsyncStorage.getItem('fcm_token');

      if (!authToken || !fcmToken) {
        console.log('❌ No auth token or FCM token');
        return false;
      }

      // Wyślij przez backend
      const response = await fetch(`${API_URL}/api/test-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: title,
          body: body,
        }),
      });

      if (response.ok) {
        console.log('✅ Test notification sent');
        return true;
      } else {
        console.log('❌ Failed to send test notification');
        return false;
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }

  // Sprawdź czy mamy pozwolenie
  async checkPermission() {
    const authStatus = await messaging().hasPermission();
    return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
           authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  }
}

export default new NotificationService();