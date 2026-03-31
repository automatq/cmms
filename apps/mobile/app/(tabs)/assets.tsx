import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: '#dcfce7', text: '#16a34a' },
  inactive: { bg: '#f1f5f9', text: '#64748b' },
  under_repair: { bg: '#fef3c7', text: '#d97706' },
  retired: { bg: '#fee2e2', text: '#dc2626' },
};

export default function AssetsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['assets', search],
    queryFn: async () => {
      const res = await api.getAssets({ search, limit: 50 });
      return res.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const assets = data?.data || [];

  const renderAsset = ({ item }: { item: any }) => {
    const statusStyle = statusColors[item.status] || statusColors.inactive;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/assets/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="cube" size={24} color="#2563eb" />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.assetNumber}>{item.assetNumber}</Text>
            <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.badgeText, { color: statusStyle.text }]}>
                {item.status.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>

        <View style={styles.details}>
          {item.location && (
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={14} color="#64748b" />
              <Text style={styles.detailText}>{item.location.name}</Text>
            </View>
          )}
          {item.manufacturer && (
            <View style={styles.detailItem}>
              <Ionicons name="business-outline" size={14} color="#64748b" />
              <Text style={styles.detailText}>{item.manufacturer}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Scan Button */}
      <TouchableOpacity style={styles.scanButton} onPress={() => router.push('/scanner')}>
        <Ionicons name="qr-code" size={20} color="#fff" />
        <Text style={styles.scanButtonText}>Scan QR Code</Text>
      </TouchableOpacity>

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {assets.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No assets found</Text>
          </View>
        ) : (
          assets.map((item: any) => <View key={item.id}>{renderAsset({ item })}</View>)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    margin: 16,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetNumber: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748b',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
  },
});
