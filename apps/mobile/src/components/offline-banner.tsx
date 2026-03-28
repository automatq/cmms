import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '../lib/network-provider';

export function OfflineBanner() {
  const { isConnected } = useNetwork();

  if (isConnected) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>You're offline — changes will sync when reconnected</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f59e0b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#1e1e1e',
    fontSize: 13,
    fontWeight: '500',
  },
});
