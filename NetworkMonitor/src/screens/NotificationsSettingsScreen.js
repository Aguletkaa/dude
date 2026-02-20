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
    repeat_interval: 15,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    notify_on_recovery: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedSettings = await NotificationService.getNotificationSettings();
    setSettings(savedSettings);
  };

  const handleSave = async () => {
    if (settings.email_enabled && !settings.email_address.includes('@')) {
      Alert.alert('Blad', 'Podaj prawidlowy adres email');
      return;
    }

    if (settings.sms_enabled && settings.sms_number.length < 9) {
      Alert.alert('Blad', 'Podaj prawidlowy numer telefonu');
      return;
    }

    const success = await NotificationService.saveNotificationSettings(settings);

    if (success) {
      Alert.alert('Sukces', 'Ustawienia powiadomien zostaly zapisane');
    } else {
      Alert.alert('Blad', 'Nie udalo sie zapisac ustawien');
    }
  };

  const handleTestNotification = async () => {
    await NotificationService.sendLocalNotification(
      'Test powiadomienia',
      'To jest testowe powiadomienie z aplikacji Network Monitor',
      { test: true }
    );
    Alert.alert('Wyslano', 'Powiadomienie testowe zostalo wyslane');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Powiadomienia</Text>
          <Text style={styles.headerSubtitle}>Konfiguracja alertow</Text>
        </View>
      </View>

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

          <TouchableOpacity style={styles.testButton} onPress={handleTestNotification}>
            <Icon name="send" size={18} color={COLORS.primary} />
            <Text style={styles.testButtonText}>Wyslij testowe powiadomienie</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email</Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Icon name="email" size={24} color={COLORS.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Powiadomienia Email</Text>
                <Text style={styles.settingDescription}>
                  Wyslij alerty na adres email
                </Text>
              </View>
            </View>
            <Switch
              value={settings.email_enabled}
              onValueChange={(value) => setSettings({...settings, email_enabled: value})}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
            />
          </View>

          {settings.email_enabled && (
            <TextInput
              style={styles.input}
              placeholder="Adres email"
              placeholderTextColor={COLORS.textMuted}
              value={settings.email_address}
              onChangeText={(value) => setSettings({...settings, email_address: value})}
              keyboardType="email-address"
            />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SMS</Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Icon name="sms" size={24} color={COLORS.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Powiadomienia SMS</Text>
                <Text style={styles.settingDescription}>
                  Wyslij alerty SMS na numer telefonu
                </Text>
              </View>
            </View>
            <Switch
              value={settings.sms_enabled}
              onValueChange={(value) => setSettings({...settings, sms_enabled: value})}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
            />
          </View>

          {settings.sms_enabled && (
            <TextInput
              style={styles.input}
              placeholder="Numer telefonu"
              placeholderTextColor={COLORS.textMuted}
              value={settings.sms_number}
              onChangeText={(value) => setSettings({...settings, sms_number: value})}
              keyboardType="phone-pad"
            />
          )}

          {settings.sms_enabled && (
            <View style={styles.warningBox}>
              <Icon name="info" size={20} color={COLORS.warning} />
              <Text style={styles.warningText}>
                Funkcja SMS wymaga konfiguracji bramki SMS po stronie serwera
              </Text>
            </View>
          )}

          <View style={[styles.settingRow, {marginTop: 20}]}>
            <View style={styles.settingInfo}>
              <Icon name="check-circle" size={24} color={COLORS.online} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Powiadom o naprawie</Text>
                <Text style={styles.settingDescription}>
                  Gdy urzadzenie wroci do pracy
                </Text>
              </View>
            </View>
            <Switch
              value={settings.notify_on_recovery}
              onValueChange={(value) => setSettings({...settings, notify_on_recovery: value})}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
            />
          </View>
        </View>
      </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.backgroundSecondary,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
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