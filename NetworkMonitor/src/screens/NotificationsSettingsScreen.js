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
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await NotificationService.getNotificationSettings();
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...savedSettings }));
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (settings.email_enabled && !settings.email_address.includes('@')) {
      Alert.alert('Błąd', 'Podaj prawidłowy adres email');
      return;
    }
    if (settings.sms_enabled && settings.sms_number.length < 9) {
      Alert.alert('Błąd', 'Podaj prawidłowy numer telefonu');
      return;
    }

    setSaving(true);
    const success = await NotificationService.saveNotificationSettings(settings);
    setSaving(false);

    if (success) {
      Alert.alert('Sukces', 'Ustawienia powiadomień zostały zapisane');
    } else {
      Alert.alert('Błąd', 'Nie udało się zapisać ustawień');
    }
  };

  const handleTestPush = async () => {
    await NotificationService.sendLocalNotification(
      'Test powiadomienia',
      'To jest testowe powiadomienie z aplikacji Network Monitor'
    );
    Alert.alert('Wysłano', 'Powiadomienie testowe zostało wysłane');
  };

  const handleTestEmail = async () => {
    if (!settings.email_address || !settings.email_address.includes('@')) {
      Alert.alert('Błąd', 'Najpierw podaj prawidłowy adres email');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('auth_token') || await AsyncStorage.getItem('access_token');
      const res = await fetch('http://10.0.2.2:8000/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subject: 'Test email', body: 'To jest testowy email z Network Monitor' }),
      });
      if (res.ok) Alert.alert('Wysłano', 'Email testowy został wysłany');
      else Alert.alert('Błąd', 'Nie udało się wysłać emaila');
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się wysłać emaila');
    }
  };

  const handleTestSMS = async () => {
    if (!settings.sms_number || settings.sms_number.length < 9) {
      Alert.alert('Błąd', 'Najpierw podaj prawidłowy numer telefonu');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('auth_token') || await AsyncStorage.getItem('access_token');
      const res = await fetch('http://10.0.2.2:8000/api/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: 'Test SMS z Network Monitor' }),
      });
      if (res.ok) Alert.alert('Wysłano', 'SMS testowy został wysłany');
      else Alert.alert('Błąd', 'Nie udało się wysłać SMS');
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się wysłać SMS');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Powiadomienia</Text>
          <Text style={styles.headerSubtitle}>Konfiguracja alertów</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kanały powiadomień</Text>

          <View style={styles.card}>
            {/* Push */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: '#4CAF5020' }]}>
                  <Icon name="notifications-active" size={22} color={COLORS.online} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Powiadomienia Push</Text>
                  <Text style={styles.settingDescription}>
                    Natychmiastowe powiadomienia na telefon
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.push_enabled}
                onValueChange={(value) => setSettings({ ...settings, push_enabled: value })}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={settings.push_enabled ? COLORS.text : COLORS.textMuted}
              />
            </View>

            {settings.push_enabled && (
              <TouchableOpacity style={styles.testButton} onPress={handleTestPush}>
                <Icon name="send" size={16} color={COLORS.primary} />
                <Text style={styles.testButtonText}>Wyślij testowe push</Text>
              </TouchableOpacity>
            )}

            <View style={styles.divider} />

            {/* Email */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: '#2196F320' }]}>
                  <Icon name="email" size={22} color="#2196F3" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Powiadomienia Email</Text>
                  <Text style={styles.settingDescription}>
                    Alerty krytyczne na adres email
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.email_enabled}
                onValueChange={(value) => setSettings({ ...settings, email_enabled: value })}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={settings.email_enabled ? COLORS.text : COLORS.textMuted}
              />
            </View>

            {settings.email_enabled && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Adres email"
                  placeholderTextColor={COLORS.textMuted}
                  value={settings.email_address}
                  onChangeText={(text) => setSettings({ ...settings, email_address: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.testButton} onPress={handleTestEmail}>
                  <Icon name="send" size={16} color={COLORS.primary} />
                  <Text style={styles.testButtonText}>Wyślij testowy email</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.divider} />

            {/* SMS */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: '#FF980020' }]}>
                  <Icon name="sms" size={22} color="#FF9800" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Powiadomienia SMS</Text>
                  <Text style={styles.settingDescription}>
                    Alerty krytyczne na numer telefonu
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.sms_enabled}
                onValueChange={(value) => setSettings({ ...settings, sms_enabled: value })}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={settings.sms_enabled ? COLORS.text : COLORS.textMuted}
              />
            </View>

            {settings.sms_enabled && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Numer telefonu (np. +48123456789)"
                  placeholderTextColor={COLORS.textMuted}
                  value={settings.sms_number}
                  onChangeText={(text) => setSettings({ ...settings, sms_number: text })}
                  keyboardType="phone-pad"
                />
                <View style={styles.warningBox}>
                  <Icon name="info" size={18} color={COLORS.warning} />
                  <Text style={styles.warningText}>
                    Powiadomienia SMS mogą generować dodatkowe koszty
                  </Text>
                </View>
                <TouchableOpacity style={styles.testButton} onPress={handleTestSMS}>
                  <Icon name="send" size={16} color={COLORS.primary} />
                  <Text style={styles.testButtonText}>Wyślij testowy SMS</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>


        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Częstotliwość powiadomień</Text>

          <View style={styles.card}>
            {/* Repeat interval */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: '#9C27B020' }]}>
                  <Icon name="repeat" size={22} color="#9C27B0" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Powtarzaj powiadomienia</Text>
                  <Text style={styles.settingDescription}>
                    Gdy urządzenie dalej nie działa, powiadamiaj ponownie
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.intervalRow}>
              <Text style={styles.intervalLabel}>Co ile minut:</Text>
              <View style={styles.intervalButtons}>
                {[0, 5, 15, 30, 60].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.intervalChip,
                      settings.repeat_interval === val && styles.intervalChipActive,
                    ]}
                    onPress={() => setSettings({ ...settings, repeat_interval: val })}
                  >
                    <Text
                      style={[
                        styles.intervalChipText,
                        settings.repeat_interval === val && styles.intervalChipTextActive,
                      ]}
                    >
                      {val === 0 ? 'Raz' : `${val}m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customIntervalRow}>
                <Text style={styles.customIntervalLabel}>Lub wpisz własną wartość:</Text>
                <View style={styles.customIntervalInput}>
                  <TextInput
                    style={styles.customIntervalField}
                    value={String(settings.repeat_interval)}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      setSettings({ ...settings, repeat_interval: num });
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <Text style={styles.customIntervalUnit}>min</Text>
                </View>
              </View>
            </View>

            <Text style={styles.intervalHint}>
              {settings.repeat_interval === 0
                ? 'Powiadomienie zostanie wysłane tylko raz na awarię'
                : `Jeśli urządzenie dalej nie działa, dostaniesz powiadomienie co ${settings.repeat_interval} minut`}
            </Text>

            <View style={styles.divider} />

            {/* Notify on recovery */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: '#4CAF5020' }]}>
                  <Icon name="check-circle" size={22} color={COLORS.online} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Powiadom o naprawie</Text>
                  <Text style={styles.settingDescription}>
                    Gdy niedziałające urządzenie wróci do pracy
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.notify_on_recovery}
                onValueChange={(value) => setSettings({ ...settings, notify_on_recovery: value })}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={settings.notify_on_recovery ? COLORS.text : COLORS.textMuted}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tryb cichy</Text>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: '#60739020' }]}>
                  <Icon name="nightlight" size={22} color="#607390" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Godziny ciszy</Text>
                  <Text style={styles.settingDescription}>
                    Wyłącz wszystkie powiadomienia w określonych godzinach
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.quiet_hours_enabled}
                onValueChange={(value) => setSettings({ ...settings, quiet_hours_enabled: value })}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={settings.quiet_hours_enabled ? COLORS.text : COLORS.textMuted}
              />
            </View>

            {settings.quiet_hours_enabled && (
              <>
                <View style={styles.timeRow}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Od</Text>
                    <TextInput
                      style={styles.timeInput}
                      placeholder="22:00"
                      placeholderTextColor={COLORS.textMuted}
                      value={settings.quiet_hours_start}
                      onChangeText={(text) => setSettings({ ...settings, quiet_hours_start: text })}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>
                  <Icon name="arrow-forward" size={20} color={COLORS.textMuted} style={{ marginTop: 24 }} />
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Do</Text>
                    <TextInput
                      style={styles.timeInput}
                      placeholder="08:00"
                      placeholderTextColor={COLORS.textMuted}
                      value={settings.quiet_hours_end}
                      onChangeText={(text) => setSettings({ ...settings, quiet_hours_end: text })}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>
                </View>
                <Text style={styles.intervalHint}>
                  Powiadomienia nie będą wysyłane od {settings.quiet_hours_start} do {settings.quiet_hours_end}.
                  Alerty nadal będą rejestrowane w systemie.
                </Text>
              </>
            )}
          </View>
        </View>


        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Icon name="save" size={20} color={COLORS.text} />
            )}
            <Text style={styles.saveButtonText}>
              {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flex: 1,
  },

  //Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
    backgroundColor: COLORS.backgroundSecondary,
    gap: 14,
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  //Sections
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  //Setting rows
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },

  //Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },

  //Input
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 15,
  },

  //Test button
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 6,
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  //Warning
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    color: COLORS.warning,
    flex: 1,
  },

  //Interval chips
  intervalRow: {
    marginTop: 12,
  },
  intervalLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  intervalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  intervalChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  intervalChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  intervalChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  intervalChipTextActive: {
    color: COLORS.text,
  },
  intervalHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 10,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  customIntervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  customIntervalLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  customIntervalInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customIntervalField: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    width: 70,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontFamily: 'monospace',
  },
  customIntervalUnit: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  //time row
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  timeInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'monospace',
  },

  //Save button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
});

export default NotificationsSettingsScreen;