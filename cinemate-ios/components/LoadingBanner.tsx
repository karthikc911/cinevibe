import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../lib/constants';

interface LoadingBannerProps {
  visible: boolean;
  message?: string;
}

export function LoadingBanner({ visible, message = 'Loading...' }: LoadingBannerProps) {
  if (!visible) return null;
  
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#fff" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 10,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

