// App.tsx
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import messaging from '@react-native-firebase/messaging';
import NotificationService from './src/services/NotificationService';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
import InAppNotificationBanner from './src/components/InAppNotificationBanner';

const AppContent = () => {
  const { addNotification } = useNotifications();

  useEffect(() => {
    const initNotifications = async () => {
      const token = await NotificationService.registerForPushNotifications();
      console.log('📱 App initialized with FCM token:', token);
    };
    initNotifications();

    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('📩 Foreground notification:', remoteMessage);

      const title = remoteMessage.notification?.title ||
                    remoteMessage.data?.title ||
                    'Powiadomienie';
      const body = remoteMessage.notification?.body ||
                   remoteMessage.data?.body ||
                   '';

      addNotification({ title, body, data: remoteMessage.data });
    });

    const unsubscribeBackground = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📬 Notification opened from background:', remoteMessage);
    });

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
  }, [addNotification]);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#2D2520" />
      <AppNavigator />
      {/* Bannery powiadomień */}
      <InAppNotificationBanner />
    </>
  );
};

function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

export default App;