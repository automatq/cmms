import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { offlineQueue, OfflineMutation } from '../lib/offline-queue';
import { useNetwork } from '../lib/network-provider';

export function SyncStatusBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(offlineQueue.pendingCount);
    update();
    return offlineQueue.subscribe(update);
  }, []);

  if (count === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count}</Text>
    </View>
  );
}

export function SyncStatusScreen() {
  const { isConnected } = useNetwork();
  const [mutations, setMutations] = useState<OfflineMutation[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => {
    setMutations(offlineQueue.getAll());
  }, []);

  useEffect(() => {
    refresh();
    return offlineQueue.subscribe(refresh);
  }, [refresh]);

  // Auto-sync when connection restored
  useEffect(() => {
    if (isConnected && offlineQueue.pendingCount > 0) {
      handleSync();
    }
  }, [isConnected]);

  const handleSync = async () => {
    if (!isConnected) {
      Alert.alert('Offline', 'Cannot sync while offline. Please reconnect first.');
      return;
    }

    setSyncing(true);
    try {
      const result = await offlineQueue.sync();
      Alert.alert('Sync Complete', `${result.synced} synced, ${result.failed} failed`);
    } catch {
      Alert.alert('Sync Error', 'An error occurred while syncing');
    } finally {
      setSyncing(false);
      refresh();
    }
  };

  const renderItem = ({ item }: { item: OfflineMutation }) => (
    <View style={styles.item}>
      <View style={styles.itemLeft}>
        <Text style={styles.itemMethod}>{item.method}</Text>
        <Text style={styles.itemEndpoint} numberOfLines={1}>
          {item.endpoint}
        </Text>
      </View>
      <View style={styles.itemRight}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor:
                item.status === 'pending'
                  ? '#f59e0b'
                  : item.status === 'syncing'
                  ? '#3b82f6'
                  : '#ef4444',
            },
          ]}
        />
        <Text style={styles.itemStatus}>{item.status}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sync Queue</Text>
        <View style={styles.connectionStatus}>
          <Ionicons
            name={isConnected ? 'wifi' : 'wifi-outline'}
            size={18}
            color={isConnected ? '#22c55e' : '#ef4444'}
          />
          <Text style={[styles.connectionText, { color: isConnected ? '#22c55e' : '#ef4444' }]}>
            {isConnected ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {mutations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
          <Text style={styles.emptyText}>All changes are synced</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={mutations}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={styles.list}
          />
          <TouchableOpacity
            style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={syncing}
          >
            <Ionicons name="sync" size={20} color="#fff" />
            <Text style={styles.syncButtonText}>
              {syncing ? 'Syncing...' : `Sync ${mutations.length} change${mutations.length !== 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 18, fontWeight: '600' },
  connectionStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  connectionText: { fontSize: 14, fontWeight: '500' },
  list: { flex: 1 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemLeft: { flex: 1, gap: 2 },
  itemMethod: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  itemEndpoint: { fontSize: 14, color: '#1f2937' },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  itemStatus: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#6b7280' },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    margin: 16,
    padding: 14,
    borderRadius: 10,
  },
  syncButtonDisabled: { opacity: 0.6 },
  syncButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
