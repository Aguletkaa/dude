import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../constants/colors';

const API_URL = 'http://10.0.2.2:8000';

const SettingsScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [passwordForProfile, setPasswordForProfile] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [passwordForUsername, setPasswordForUsername] = useState('');

  React.useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const userData = JSON.parse(userJson);
        setUser(userData);
        setNewUsername(userData.username || '');
        setFullName(userData.full_name || '');
        setEmail(userData.email || '');
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Blad', 'Wypelnij wszystkie pola');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Blad', 'Nowe hasla nie pasuja do siebie');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Blad', 'Nowe haslo musi miec min. 6 znakow');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token') ||
                    await AsyncStorage.getItem('access_token');

      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        Alert.alert('Sukces', 'Haslo zostalo zmienione');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await response.json();
        Alert.alert('Blad', data.detail || 'Nie udalo sie zmienic hasla');
      }
    } catch (error) {
      Alert.alert('Blad', 'Blad polaczenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeProfile = async () => {
    if (!passwordForProfile) {
      Alert.alert('Blad', 'Podaj haslo aby potwierdzic zmiany');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token') ||
                    await AsyncStorage.getItem('access_token');

      const response = await fetch(`${API_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          password: passwordForProfile,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setPasswordForProfile('');
        Alert.alert('Sukces', 'Profil zostal zaktualizowany');
      } else {
        const data = await response.json();
        Alert.alert('Blad', data.detail || 'Nie udalo sie zaktualizowac profilu');
      }
    } catch (error) {
      Alert.alert('Blad', 'Blad polaczenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Wylogowanie',
      'Czy na pewno chcesz sie wylogowac?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wyloguj',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Ustawienia</Text>
          <Text style={styles.headerSubtitle}>Konto uzytkownika</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informacje o koncie</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="person" size={24} color={COLORS.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Nazwa uzytkownika</Text>
              <Text style={styles.infoValue}>{user?.username || 'Loading...'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Icon name="badge" size={24} color={COLORS.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Imie i nazwisko</Text>
              <Text style={styles.infoValue}>{user?.full_name || 'Nie ustawiono'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Icon name="email" size={24} color={COLORS.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'Nie ustawiono'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zmien dane profilu</Text>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Nazwa uzytkownika (min. 3 znaki)"
            placeholderTextColor={COLORS.textMuted}
            value={newUsername}
            onChangeText={setNewUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Imie i nazwisko"
            placeholderTextColor={COLORS.textMuted}
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Aktualne haslo (wymagane)"
            placeholderTextColor={COLORS.textMuted}
            value={passwordForProfile}
            onChangeText={setPasswordForProfile}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleChangeProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <>
                <Icon name="save" size={20} color={COLORS.text} />
                <Text style={styles.buttonText}>Zapisz zmiany</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zmien haslo</Text>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Aktualne haslo"
            placeholderTextColor={COLORS.textMuted}
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Nowe haslo (min. 6 znakow)"
            placeholderTextColor={COLORS.textMuted}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Powtorz nowe haslo"
            placeholderTextColor={COLORS.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <>
                <Icon name="lock" size={20} color={COLORS.primary} />
                <Text style={[styles.buttonText, { color: COLORS.primary }]}>
                  Zmien haslo
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Icon name="logout" size={20} color={COLORS.offline} />
          <Text style={[styles.buttonText, { color: COLORS.offline }]}>
            Wyloguj sie
          </Text>
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
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoText: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  logoutButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.offline,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});

export default SettingsScreen;