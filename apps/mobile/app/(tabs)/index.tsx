import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function DashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: dashboard, refetch, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.getDashboard({ days: 30 });
      return res.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const kpis = dashboard?.kpis || [];
  const openWOs = kpis.find((k: any) => k.label === 'Open Work Orders')?.value || 0;
  const overdueWOs = kpis.find((k: any) => k.label === 'Overdue')?.value || 0;
  const pmCompliance = kpis.find((k: any) => k.label === 'PM Compliance')?.value || 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/scanner')}>
          <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="qr-code" size={24} color="#2563eb" />
          </View>
          <Text style={styles.actionText}>Scan QR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/work-orders')}>
          <View style={[styles.actionIcon, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="add-circle" size={24} color="#16a34a" />
          </View>
          <Text style={styles.actionText}>New WO</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/assets')}>
          <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="cube" size={24} color="#d97706" />
          </View>
          <Text style={styles.actionText}>Assets</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Ionicons name="clipboard-outline" size={24} color="#2563eb" />
          <Text style={styles.kpiValue}>{openWOs}</Text>
          <Text style={styles.kpiLabel}>Open WOs</Text>
        </View>

        <View style={[styles.kpiCard, overdueWOs > 0 && styles.kpiCardWarning]}>
          <Ionicons name="alert-circle-outline" size={24} color={overdueWOs > 0 ? '#dc2626' : '#64748b'} />
          <Text style={[styles.kpiValue, overdueWOs > 0 && styles.kpiValueWarning]}>{overdueWOs}</Text>
          <Text style={styles.kpiLabel}>Overdue</Text>
        </View>

        <View style={styles.kpiCard}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#16a34a" />
          <Text style={styles.kpiValue}>{pmCompliance}%</Text>
          <Text style={styles.kpiLabel}>PM Compliance</Text>
        </View>
      </View>

      {/* Upcoming PMs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming PM</Text>
        {dashboard?.upcomingPMs?.slice(0, 5).map((pm: any) => (
          <View key={pm.id} style={styles.listItem}>
            <View style={styles.listIcon}>
              <Ionicons name="calendar-outline" size={20} color="#2563eb" />
            </View>
            <View style={styles.listContent}>
              <Text style={styles.listTitle}>{pm.name}</Text>
              <Text style={styles.listSubtitle}>
                {pm.asset || 'No asset'} • Due: {new Date(pm.nextDueAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))}
        {(!dashboard?.upcomingPMs || dashboard.upcomingPMs.length === 0) && (
          <Text style={styles.emptyText}>No upcoming PMs</Text>
        )}
      </View>

      {/* Low Stock Alerts */}
      {dashboard?.lowStockAlerts && dashboard.lowStockAlerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
          {dashboard.lowStockAlerts.slice(0, 3).map((part: any) => (
            <View key={part.partId} style={styles.listItem}>
              <View style={[styles.listIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="warning-outline" size={20} color="#d97706" />
              </View>
              <View style={styles.listContent}>
                <Text style={styles.listTitle}>{part.partName}</Text>
                <Text style={styles.listSubtitle}>
                  SKU: {part.sku} • Qty: {part.qtyOnHand}/{part.reorderPoint}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  kpiContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiCardWarning: {
    backgroundColor: '#fef2f2',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  kpiValueWarning: {
    color: '#dc2626',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  listSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    paddingVertical: 16,
  },
});
