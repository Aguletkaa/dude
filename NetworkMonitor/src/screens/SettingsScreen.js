// src/screens/SettingsScreen.js - Ustawienia użytkownika (POPRAWIONE)
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
  
  // Change Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Change Profile
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [passwordForProfile, setPasswordForProfile] = useState('');
  
  // Change Username
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
      Alert.alert('Błąd', 'Wypełnij wszystkie pola');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Błąd', 'Nowe hasła nie pasują do siebie');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Błąd', 'Nowe hasło musi mieć min. 6 znaków');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('auth_token') || 
                    await AsyncStorage.getItem('access_token');

      const response = await fetch(`${API_URL}/api/user/change-password`, {
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

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Sukces', 'Hasło zostało zmienione');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Błąd', data.detail || 'Nie udało się zmienić hasła');
      }
    } catch (error) {
      Alert.alert('Błąd', 'Błąd połączenia z serwerem');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeProfile = async () => {
    if (!newUsername || !fullName || !email || !passwordForProfile) {
      Alert.alert('Błąd', 'Wypełnij wszystkie pola');
      return;
    }

    if (newUsername.length < 3) {
      Alert.alert('Błąd', 'Nazwa użytkownika musi mieć min. 3 znaki');
      return;
    }

    if (fullName.length < 3) {
      Alert.alert('Błąd', 'Imię i nazwisko musi mieć min. 3 znaki');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Błąd', 'Podaj prawidłowy email');
      return;
    }

    // Sprawdź czy username się zmienił
    const usernameChanged = newUsername !== user?.username;

    Alert.alert(
      'Potwierdź',
      usernameChanged 
        ? `Zmiana nazwy użytkownika spowoduje wylogowanie. Kontynuować?`
        : 'Czy na pewno zmienić dane profilu?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Zmień',
          onPress: async () => {
            setLoading(true);

            try {
              const token = await AsyncStorage.getItem('auth_token') || 
                            await AsyncStorage.getItem('access_token');

              // Jeśli username się zmienił, użyj endpointu change-username
              if (usernameChanged) {
                const response = await fetch(`${API_URL}/api/user/change-username`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    new_username: newUsername,
                    password: passwordForProfile,
                  }),
                });

                const data = await response.json();

                if (response.ok) {
                  Alert.alert('Sukces', 'Dane zostały zmienione. Zaloguj się ponownie.');
                  
                  // Wyloguj
                  await AsyncStorage.clear();
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                } else {
                  Alert.alert('Błąd', data.detail || 'Nie udało się zmienić danych');
                }
              } else {
                // Tylko zmiana profilu (bez username)
                const response = await fetch(`${API_URL}/api/user/change-profile`, {
                  method: 'POST',
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

                const data = await response.json();

                if (response.ok) {
                  // Zaktualizuj dane użytkownika lokalnie
                  await AsyncStorage.setItem('user', JSON.stringify({
                    ...user,
                    full_name: fullName,
                    email: email,
                  }));

                  setUser({
                    ...user,
                    full_name: fullName,
                    email: email,
                  });

                  Alert.alert('Sukces', 'Dane profilu zostały zmienione');
                  setPasswordForProfile('');
                } else {
                  Alert.alert('Błąd', data.detail || 'Nie udało się zmienić danych');
                }
              }
            } catch (error) {
              Alert.alert('Błąd', 'Błąd połączenia z serwerem');
              console.error(error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleChangeUsername = async () => {
    if (!newUsername || !passwordForUsername) {
      Alert.alert('Błąd', 'Wypełnij wszystkie pola');
      return;
    }

    if (newUsername.length < 3) {
      Alert.alert('Błąd', 'Nazwa użytkownika musi mieć min. 3 znaki');
      return;
    }

    Alert.alert(
      'Potwierdź',
      `Czy na pewno zmienić nazwę użytkownika na "${newUsername}"? Zostaniesz wylogowany.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Zmień',
          onPress: async () => {
            setLoading(true);

            try {
              const token = await AsyncStorage.getItem('auth_token') || 
                            await AsyncStorage.getItem('access_token');

              const response = await fetch(`${API_URL}/api/user/change-username`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  new_username: newUsername,
                  password: passwordForUsername,
                }),
              });

              const data = await response.json();

              if (response.ok) {
                Alert.alert('Sukces', 'Nazwa użytkownika została zmieniona. Zaloguj się ponownie.');
                
                // Wyloguj
                await AsyncStorage.clear();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              } else {
                Alert.alert('Błąd', data.detail || 'Nie udało się zmienić nazwy użytkownika');
              }
            } catch (error) {
              Alert.alert('Błąd', 'Błąd połączenia z serwerem');
              console.error(error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Wyloguj',
      'Czy na pewno chcesz się wylogować?',
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
      {/* User Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informacje o koncie</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="person" size={24} color={COLORS.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Nazwa użytkownika</Text>
              <Text style={styles.infoValue}>{user?.username || 'Loading...'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Icon name="badge" size={24} color={COLORS.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Imię i nazwisko</Text>
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

      {/* Change Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zmień dane profilu</Text>
        
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Nazwa użytkownika (min. 3 znaki)"
            placeholderTextColor={COLORS.textMuted}
            value={newUsername}
            onChangeText={setNewUsername}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Imię i nazwisko"
            placeholderTextColor={COLORS.textMuted}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Potwierdź hasłem"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            value={passwordForProfile}
            onChangeText={setPasswordForProfile}
            autoCapitalize="none"
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
                <Icon name="edit" size={20} color={COLORS.text} />
                <Text style={styles.buttonText}>Zapisz zmiany</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Change Password */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zmień hasło</Text>
        
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Stare hasło"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            value={oldPassword}
            onChangeText={setOldPassword}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Nowe hasło (min. 6 znaków)"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Potwierdź nowe hasło"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
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
                  Zmień hasło
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Icon name="logout" size={20} color={COLORS.offline} />
          <Text style={[styles.buttonText, { color: COLORS.offline }]}>
            Wyloguj się
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