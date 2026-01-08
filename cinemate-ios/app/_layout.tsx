import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { Colors } from '../lib/constants';
import { useAppStore } from '../lib/store';
import { initializeTokenCache } from '../lib/api';

export default function RootLayout() {
  const { user, isAuthenticated, isSessionRestored, restoreSession } = useAppStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  // Restore session on app launch - initialize API token cache FIRST
  useEffect(() => {
    const initSession = async () => {
      console.log('[APP] Initializing session...');
      // Initialize API token cache FIRST for fast API calls
      await initializeTokenCache();
      await restoreSession();
      setIsReady(true); // No delay needed
    };
    initSession();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isReady || !isSessionRestored) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup';

    console.log('[APP] Auth check - isAuthenticated:', isAuthenticated, 'inAuthGroup:', inAuthGroup);

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      console.log('[APP] Redirecting to login');
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home if authenticated but on login page
      console.log('[APP] Redirecting to home (user is authenticated)');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isReady, isSessionRestored]);

  // Show loading screen while restoring session
  if (!isReady || !isSessionRestored) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingEmoji}>🎬</Text>
        <Text style={styles.loadingText}>CineVibe</Text>
        <ActivityIndicator size="small" color={Colors.primary} style={styles.spinner} />
        <Text style={styles.loadingSubtext}>Restoring session...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  spinner: {
    marginTop: 24,
  },
  loadingSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
});
