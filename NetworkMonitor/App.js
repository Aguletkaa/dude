// App.tsx
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import messaging from '@react-native-firebase/messaging';
import NotificationService from './src/services/NotificationService';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
import InAppNotificationBanner from './src/components/InAppNotificationBanner';

// Wewnętrzny komponent z dostępem do contextu
const AppContent = () => {
  const { addNotification } = useNotifications();

  useEffect(() => {
    // Zarejestruj FCM token
    const initNotifications = async () => {
      const token = await NotificationService.registerForPushNotifications();
      console.log('📱 App initialized with FCM token:', token);
    };
    initNotifications();

    // ========================================
    // FOREGROUND - powiadomienie gdy apka jest otwarta
    // Firebase NIE wyświetla automatycznie - musimy sami!
    // ========================================
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('📩 Foreground notification:', remoteMessage);

      const title = remoteMessage.notification?.title ||
                    remoteMessage.data?.title ||
                    'Powiadomienie';
      const body = remoteMessage.notification?.body ||
                   remoteMessage.data?.body ||
                   '';

      // Dodaj do in-app bannerów - zostanie widoczny dopóki użytkownik nie zamknie
      addNotification({ title, body, data: remoteMessage.data });
    });

    // ========================================
    // BACKGROUND - kliknięcie w powiadomienie gdy apka jest w tle
    // ========================================
    const unsubscribeBackground = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📬 Notification opened from background:', remoteMessage);
      // Tutaj możesz dodać nawigację do konkretnego ekranu
      // np. navigation.navigate('Alerts') jeśli masz ref do navigation
    });

    // ========================================
    // QUIT STATE - apka otworzona z powiadomienia (była zamknięta)
    // ========================================
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
      {/* Bannery powiadomień - renderowane NAD wszystkim */}
      <InAppNotificationBanner />
    </>
  );
};

// Główny komponent - owijka z Providerem
function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

export default App;