// App.tsx
import React, { useEffect } from 'react';
import { StatusBar, Alert } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import messaging from '@react-native-firebase/messaging';
import NotificationService from './src/services/NotificationService';


function App() {
  useEffect(() => {
    // Zarejestruj dla push notifications
    const initNotifications = async () => {
      const token = await NotificationService.registerForPushNotifications();
      console.log('📱 App initialized with FCM token:', token);
    };

    initNotifications();

    // Obsługa powiadomień w foreground
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
  console.log('📩 Notification received:', remoteMessage);
  // Zostaw puste - Android pokaże sam
});

    // Obsługa kliknięcia w powiadomienie (background)
    const unsubscribeBackground = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📬 Notification opened from background:', remoteMessage);
    });

    // Sprawdź czy app otworzyło się z powiadomienia (quit state)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('📬 Notification opened from quit state:', remoteMessage);
        }
      });

    return () => {
      unsubscribeForeground();
    };
  }, []);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppNavigator />
    </>
  );
}

export default App;