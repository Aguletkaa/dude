// src/services/NotificationService.js
import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.0.2.2:8000';

const DEFAULT_SETTINGS = {
  push_enabled: true,
  email_enabled: false,
  sms_enabled: false,
  sms_number: '',
  email_address: '',
  repeat_interval: 15,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  notify_on_recovery: true,
};

class NotificationService {

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

  async registerForPushNotifications() {
    try {
      const hasPermission = await this.requestUserPermission();

      if (!hasPermission) {
        console.log('Push notification permission denied');
        return null;
      }

      const fcmToken = await this.getFCMToken();

      if (!fcmToken) {
        console.log('Failed to get FCM token');
        return null;
      }

      await this.sendTokenToBackend(fcmToken);
      return fcmToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

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

  onMessageReceived(callback) {
    return messaging().onMessage(async remoteMessage => {
      console.log('Notification received (foreground):', remoteMessage);
      if (callback) {
        callback(remoteMessage);
      }
    });
  }

  onNotificationOpenedApp(callback) {
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📬 Notification opened from background:', remoteMessage);
      if (callback) {
        callback(remoteMessage);
      }
    });

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

  async getNotificationSettings() {
    try {
      const authToken = await AsyncStorage.getItem('auth_token') ||
                        await AsyncStorage.getItem('access_token');

      if (authToken) {
        try {
          const response = await fetch(`${API_URL}/api/user/notification-settings`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
          });
          if (response.ok) {
            const backendSettings = await response.json();
            const merged = { ...DEFAULT_SETTINGS, ...backendSettings };
            await AsyncStorage.setItem('notification_settings', JSON.stringify(merged));
            return merged;
          }
        } catch (e) {
          console.log('Could not fetch settings from backend, using local');
        }
      }

      const settings = await AsyncStorage.getItem('notification_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }

      return { ...DEFAULT_SETTINGS };
    } catch (error) {
      console.error('Error loading notification settings:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  async saveNotificationSettings(settings) {
    try {
      const fullSettings = { ...DEFAULT_SETTINGS, ...settings };
      await AsyncStorage.setItem('notification_settings', JSON.stringify(fullSettings));

      const authToken = await AsyncStorage.getItem('auth_token') ||
                        await AsyncStorage.getItem('access_token');

      if (authToken) {
        await fetch(`${API_URL}/api/user/notification-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(fullSettings),
        });
      }

      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      return false;
    }
  }

  async sendLocalNotification(title, body) {
    try {
      const authToken = await AsyncStorage.getItem('auth_token') ||
                        await AsyncStorage.getItem('access_token');
      const fcmToken = await AsyncStorage.getItem('fcm_token');

      if (!authToken || !fcmToken) {
        console.log('❌ No auth token or FCM token');
        return false;
      }

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

  async checkPermission() {
    const authStatus = await messaging().hasPermission();
    return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
           authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  }
}

export default new NotificationService();