// src/screens/NotificationsSettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../constants/colors';
import NotificationService from '../services/NotificationService';

const NotificationsSettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    push_enabled: true,
    email_enabled: false,
    sms_enabled: false,
    sms_number: '',
    email_address: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedSettings = await NotificationService.getNotificationSettings();
    setSettings(savedSettings);
  };

  const handleSave = async () => {
    // Walidacja
    if (settings.email_enabled && !settings.email_address.includes('@')) {
      Alert.alert('Błąd', 'Podaj prawidłowy adres email');
      return;
    }

    if (settings.sms_enabled && settings.sms_number.length < 9) {
      Alert.alert('Błąd', 'Podaj prawidłowy numer telefonu');
      return;
    }

    const success = await NotificationService.saveNotificationSettings(settings);
    
    if (success) {
      Alert.alert('Sukces', 'Ustawienia powiadomień zostały zapisane');
    } else {
      Alert.alert('Błąd', 'Nie udało się zapisać ustawień');
    }
  };

  const handleTestNotification = async () => {
    await NotificationService.sendLocalNotification(
      'Test powiadomienia',
      'To jest testowe powiadomienie z aplikacji Network Monitor',
      { test: true }
    );
    Alert.alert('Wysłano', 'Powiadomienie testowe zostało wysłane');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Push Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Powiadomienia Push</Text>
        
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Icon name="notifications-active" size={24} color={COLORS.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Powiadomienia Push</Text>
                <Text style={styles.settingDescription}>
                  Otrzymuj powiadomienia o alertach krytycznych
                </Text>
              </View>
            </View>
            <Switch
              value={settings.push_enabled}
              onValueChange={(value) => setSettings({...settings, push_enabled: value})}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={settings.push_enabled ? COLORS.text : COLORS.textMuted}
            />
          </View>

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestNotification}
          >
            <Icon name="send" size={18} color={COLORS.primary} />
            <Text style={styles.testButtonText}>Wyślij testowe powiadomienie</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Email Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Powiadomienia Email</Text>
        
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Icon name="email" size={24} color={COLORS.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Powiadomienia Email</Text>
                <Text style={styles.settingDescription}>
                  Otrzymuj emaile o alertach krytycznych
                </Text>
              </View>
            </View>
            <Switch
              value={settings.email_enabled}
              onValueChange={(value) => setSettings({...settings, email_enabled: value})}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={settings.email_enabled ? COLORS.text : COLORS.textMuted}
            />
          </View>

          {settings.email_enabled && (
            <TextInput
              style={styles.input}
              placeholder="Adres email"
              placeholderTextColor={COLORS.textMuted}
              value={settings.email_address}
              onChangeText={(text) => setSettings({...settings, email_address: text})}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
        </View>
      </View>

      {/* SMS Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Powiadomienia SMS</Text>
        
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Icon name="sms" size={24} color={COLORS.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Powiadomienia SMS</Text>
                <Text style={styles.settingDescription}>
                  Otrzymuj SMS o alertach krytycznych
                </Text>
              </View>
            </View>
            <Switch
              value={settings.sms_enabled}
              onValueChange={(value) => setSettings({...settings, sms_enabled: value})}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={settings.sms_enabled ? COLORS.text : COLORS.textMuted}
            />
          </View>

          {settings.sms_enabled && (
            <TextInput
              style={styles.input}
              placeholder="Numer telefonu (np. +48123456789)"
              placeholderTextColor={COLORS.textMuted}
              value={settings.sms_number}
              onChangeText={(text) => setSettings({...settings, sms_number: text})}
              keyboardType="phone-pad"
            />
          )}

          {settings.sms_enabled && (
            <View style={styles.warningBox}>
              <Icon name="info" size={20} color={COLORS.warning} />
              <Text style={styles.warningText}>
                Powiadomienia SMS mogą generować dodatkowe koszty
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Icon name="save" size={20} color={COLORS.text} />
          <Text style={styles.saveButtonText}>Zapisz ustawienia</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 16,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 8,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: COLORS.warning,
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    gap: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});

export default NotificationsSettingsScreen;
