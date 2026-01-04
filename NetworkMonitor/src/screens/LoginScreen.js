// src/screens/LoginScreen.js - Dark Theme with Icon
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { login } from '../api/client';
import COLORS from '../constants/colors';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Błąd', 'Wypełnij wszystkie pola');
      return;
    }

    try {
      setLoading(true);
      const response = await login(username, password);
      console.log('✅ Zalogowano:', response.user.username);
      console.log('✅ Token zapisany');
      
      // Zarejestruj FCM token
      const NotificationService = require('../services/NotificationService').default;
      setTimeout(async () => {
        await NotificationService.registerForPushNotifications();
      }, 1500);
      
      // Token jest już zapisany w api/client.js
      // AppNavigator automatycznie przełączy się na MainTabs gdy wykryje token
      
    } catch (error) {
      console.error('❌ Login error:', error);
      Alert.alert(
        'Błąd logowania',
        error.response?.data?.detail || 'Nieprawidłowe dane logowania'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundPattern} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Logo Area */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            {/* Network Hub Icon - nowoczesny, profesjonalny */}
            <View style={styles.hubIcon}>
              {/* Centralny node */}
              <View style={styles.centralNode} />
              
              {/* Węzły połączone */}
              <View style={[styles.connectionLine, styles.line1]} />
              <View style={[styles.connectionLine, styles.line2]} />
              <View style={[styles.connectionLine, styles.line3]} />
              <View style={[styles.connectionLine, styles.line4]} />
              
              {/* Outer nodes */}
              <View style={[styles.outerNode, styles.node1]} />
              <View style={[styles.outerNode, styles.node2]} />
              <View style={[styles.outerNode, styles.node3]} />
              <View style={[styles.outerNode, styles.node4]} />
              
              {/* Sygnał/fale */}
              <View style={[styles.wave, styles.wave1]} />
              <View style={[styles.wave, styles.wave2]} />
            </View>
          </View>
          <Text style={styles.appTitle}>Dude</Text>
          <Text style={styles.appSubtitle}>MONITOR</Text>
        </View>

        {/* Info Text */}
        <Text style={styles.infoText}>
          Zaloguj się aby monitorować{'\n'}infrastrukturę sieciową
        </Text>

        {/* Login Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Login</Text>
            <TextInput
              style={styles.input}
              placeholder="Nazwa użytkownika"
              placeholderTextColor={COLORS.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Hasło</Text>
            <TextInput
              style={styles.input}
              placeholder="Hasło"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.loginButtonText}>Zaloguj się</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Network Monitoring System</Text>
          <Text style={styles.versionText}>v1.0.0</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
  },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBox: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  // Network Hub Icon - profesjonalny, nowoczesny
  hubIcon: {
    width: 80,
    height: 80,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralNode: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
    zIndex: 10,
  },
  connectionLine: {
    position: 'absolute',
    width: 2,
    height: 25,
    backgroundColor: COLORS.primary,
  },
  line1: {
    top: -5,
    transform: [{ rotate: '0deg' }],
  },
  line2: {
    top: 20,
    left: 20,
    transform: [{ rotate: '90deg' }],
  },
  line3: {
    bottom: -5,
    transform: [{ rotate: '0deg' }],
  },
  line4: {
    top: 20,
    right: 20,
    transform: [{ rotate: '90deg' }],
  },
  outerNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  node1: {
    top: -10,
    left: 34,
  },
  node2: {
    top: 34,
    right: -10,
  },
  node3: {
    bottom: -10,
    left: 34,
  },
  node4: {
    top: 34,
    left: -10,
  },
  wave: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    opacity: 0.3,
  },
  wave1: {
    top: 32,
    right: 5,
  },
  wave2: {
    top: 32,
    left: 5,
  },
  appTitle: {
    fontSize: 48,
    fontWeight: '300',
    color: COLORS.text,
    marginBottom: 0,
  },
  appSubtitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 4,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  versionText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
});

export default LoginScreen;