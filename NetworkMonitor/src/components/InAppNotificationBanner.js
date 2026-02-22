// src/components/InAppNotificationBanner.js
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNotifications } from '../context/NotificationContext';
import COLORS from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pojedynczy banner powiadomienia
const NotificationBanner = ({ notification, onDismiss, index }) => {
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
        delay: index * 80, 
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  const getSeverityColor = () => {
    const title = (notification.title || '').toLowerCase();
    const body = (notification.body || '').toLowerCase();
    if (title.includes('krytycz') || title.includes('critical') || title.includes('offline') || body.includes('offline')) {
      return COLORS.offline;
    }
    if (title.includes('warning') || title.includes('ostrzeż') || title.includes('uwaga')) {
      return COLORS.warning;
    }
    if (title.includes('online') || title.includes('przywróc') || title.includes('resolved')) {
      return COLORS.online;
    }
    return COLORS.primary;
  };

  const getIcon = () => {
    const title = (notification.title || '').toLowerCase();
    if (title.includes('offline') || title.includes('krytycz') || title.includes('critical')) return 'error';
    if (title.includes('warning') || title.includes('ostrzeż')) return 'warning';
    if (title.includes('online') || title.includes('przywróc')) return 'check-circle';
    return 'notifications';
  };

  const severityColor = getSeverityColor();
  const timeStr = notification.timestamp
    ? notification.timestamp.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          borderLeftColor: severityColor,
        },
      ]}
    >
      {/* Kolorowy pasek boczny */}
      <View style={[styles.iconContainer, { backgroundColor: severityColor + '20' }]}>
        <Icon name={getIcon()} size={22} color={severityColor} />
      </View>

      {/* Treść */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title || 'Powiadomienie'}
          </Text>
          <Text style={styles.time}>{timeStr}</Text>
        </View>
        <Text style={styles.body} numberOfLines={2}>
          {notification.body || ''}
        </Text>
      </View>

      {/* Przycisk zamknięcia */}
      <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Icon name="close" size={18} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const InAppNotificationBanner = () => {
  const { notifications, dismissNotification, dismissAll } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Przycisk "zamknij wszystkie" jeśli jest więcej niż 1 */}
      {notifications.length > 1 && (
        <TouchableOpacity style={styles.dismissAllBtn} onPress={dismissAll}>
          <Icon name="clear-all" size={16} color={COLORS.textSecondary} />
          <Text style={styles.dismissAllText}>Zamknij wszystkie ({notifications.length})</Text>
        </TouchableOpacity>
      )}

      {/* Maksymalnie 3 widoczne bannery */}
      {notifications.slice(0, 3).map((notif, index) => (
        <NotificationBanner
          key={notif.id}
          notification={notif}
          index={index}
          onDismiss={() => dismissNotification(notif.id)}
        />
      ))}

      {/* Info o ukrytych */}
      {notifications.length > 3 && (
        <View style={styles.moreContainer}>
          <Text style={styles.moreText}>
            + {notifications.length - 3} więcej powiadomień
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    paddingTop: 8,
    paddingHorizontal: 10,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 6,
    padding: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  body: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  closeBtn: {
    marginLeft: 8,
    padding: 4,
  },
  dismissAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dismissAllText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  moreContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  moreText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});

export default InAppNotificationBanner;
