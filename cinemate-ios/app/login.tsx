import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Film, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { Colors } from '../lib/constants';
import { useAppStore } from '../lib/store';
import { DEMO_USER } from '../lib/mockData';
import { authApi } from '../lib/api';

// Complete auth session handling
WebBrowser.maybeCompleteAuthSession();

// Production backend URL
const BACKEND_URL = 'https://cinevibe-six.vercel.app';

// Google OAuth Client IDs
// IMPORTANT: Replace these with your actual Google OAuth Client IDs
// You can get these from Google Cloud Console: https://console.cloud.google.com/apis/credentials
const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_EXPO_CLIENT_ID = 'YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com'; // For Expo Go

export default function LoginScreen() {
  const router = useRouter();
  const { login, setIsUsingDemoMode } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google OAuth configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    // For production iOS builds
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    // Web client ID (same as your website, used for Expo Go dev)
    webClientId: GOOGLE_WEB_CLIENT_ID,
    // Client ID (for Expo Go development)
    clientId: GOOGLE_EXPO_CLIENT_ID,
    // Scopes
    scopes: ['profile', 'email'],
    // Redirect URI for Expo Go
    redirectUri: makeRedirectUri({
      scheme: 'cinemate',
    }),
  });

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleAuthSuccess(response.authentication?.accessToken);
    } else if (response?.type === 'error') {
      console.log('[GOOGLE] Auth error:', response.error);
      Alert.alert('Google Sign-In Error', response.error?.message || 'Failed to sign in with Google');
      setGoogleLoading(false);
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleAuthSuccess = async (accessToken: string | undefined) => {
    if (!accessToken) {
      Alert.alert('Error', 'No access token received from Google');
      setGoogleLoading(false);
      return;
    }

    try {
      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      const googleUser = await userInfoResponse.json();
      console.log('[GOOGLE] User info:', googleUser);

      // Send to backend for authentication/registration
      const response = await fetch(`${BACKEND_URL}/api/auth/google-mobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleUser.email,
          name: googleUser.name,
          googleId: googleUser.id,
          picture: googleUser.picture,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('[GOOGLE] Login success!');
        
        if (data.token) {
          await authApi.setToken(data.token);
        }
        
        // Login and persist session (async)
        await login(data.user);
        await setIsUsingDemoMode(false);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', data.error || 'Failed to authenticate with Google');
      }
    } catch (error: any) {
      console.error('[GOOGLE] Error:', error);
      Alert.alert('Error', `Failed to complete Google sign-in: ${error.message}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    console.log('[LOGIN] Attempting login for:', email.toLowerCase());
    console.log('[LOGIN] Backend URL:', `${BACKEND_URL}/api/auth/mobile-login`);
    
    try {
      // Try to authenticate with the backend
      const response = await fetch(`${BACKEND_URL}/api/auth/mobile-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });

      console.log('[LOGIN] Response status:', response.status);
      const data = await response.json();
      console.log('[LOGIN] Response data:', JSON.stringify(data));

      if (response.ok && data.success) {
        console.log('[LOGIN] Success! User:', data.user?.email);
        
        // Store the auth token for API calls
        if (data.token) {
          console.log('[LOGIN] Storing auth token');
          await authApi.setToken(data.token);
        }
        
        // Login and persist session (async)
        await login(data.user);
        await setIsUsingDemoMode(false);
        router.replace('/(tabs)');
      } else {
        // Show specific error message from backend
        console.log('[LOGIN] Failed:', data.error);
        Alert.alert(
          'Login Failed',
          data.error || 'Invalid email or password'
        );
      }
    } catch (error: any) {
      // Network error - show details
      console.log('[LOGIN] Network error:', error?.message || error);
      Alert.alert(
        'Connection Error',
        `Could not connect to server. Error: ${error?.message || 'Network error'}. Please check your internet connection and try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Check if Google OAuth is configured
    if (GOOGLE_WEB_CLIENT_ID === 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com') {
      Alert.alert(
        'Google Sign-In Not Configured',
        'To enable Google Sign-In:\n\n1. Go to Google Cloud Console\n2. Create OAuth credentials\n3. Update GOOGLE_*_CLIENT_ID in login.tsx\n\nFor now, please use email/password or Demo mode.',
        [{ text: 'OK' }]
      );
      return;
    }

    setGoogleLoading(true);
    try {
      await promptAsync();
    } catch (error: any) {
      console.error('[GOOGLE] Prompt error:', error);
      Alert.alert('Error', 'Failed to initiate Google sign-in');
      setGoogleLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    // Login and persist demo session
    await login(DEMO_USER);
    await setIsUsingDemoMode(true);
    router.replace('/(tabs)');
  };

  return (
    <LinearGradient
      colors={[Colors.background, '#1a1a3e', Colors.background]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Film color={Colors.primary} size={48} />
            </View>
            <Text style={styles.appName}>CineVibe</Text>
            <Text style={styles.tagline}>Your AI-Powered Movie Companion</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
            <Text style={styles.welcomeSubtitle}>
              Sign in to get personalized movie recommendations
            </Text>

            <View style={styles.inputContainer}>
              <Mail color={Colors.textMuted} size={20} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock color={Colors.textMuted} size={20} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff color={Colors.textMuted} size={20} />
                ) : (
                  <Eye color={Colors.textMuted} size={20} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login */}
            <TouchableOpacity
              style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
              onPress={handleGoogleLogin}
              disabled={googleLoading || !request}
            >
              {googleLoading ? (
                <ActivityIndicator color="#333" />
              ) : (
                <>
                  <View style={styles.googleLogo}>
                    <Text style={styles.googleG}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Demo Button */}
            <TouchableOpacity style={styles.demoButton} onPress={handleDemoLogin}>
              <Text style={styles.demoButtonText}>🎬 Try Demo Mode</Text>
            </TouchableOpacity>
          </View>

          {/* Sign Up */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 12,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  form: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: Colors.textMuted,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  googleButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    flexDirection: 'row',
    gap: 10,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  demoButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 2,
    borderColor: Colors.primary,
    marginTop: 12,
  },
  demoButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
