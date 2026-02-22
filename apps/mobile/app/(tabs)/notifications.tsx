import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

const typeIcons: Record<string, string> = {
  wo_assigned: 'clipboard',
  wo_status_changed: 'sync',
  wo_due_soon: 'time',
  wo_overdue: 'alert-circle',
  pm_due: 'calendar',
  low_stock: 'cube',
  work_request: 'mail',
  system: 'information-circle',
};

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.getNotifications({ limit: 50 });
      return res.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const notifications = data?.data || [];

  const renderNotification = ({ item }: { item: any }) => {
    const iconName = typeIcons[item.type] || 'notifications';

    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.cardUnread]}
        onPress={() => markReadMutation.mutate(item.id)}
      >
        <View style={[styles.iconContainer, !item.isRead && styles.iconContainerUnread]}>
          <Ionicons name={iconName as any} size={20} color={item.isRead ? '#64748b' : '#2563eb'} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, !item.isRead && styles.titleUnread]}>
            {item.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.time}>
            {new Date(item.createdAt).toLocaleDateString()} at{' '}
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
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
  cardUnread: {
    backgroundColor: '#f0f9ff',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerUnread: {
    backgroundColor: '#dbeafe',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  titleUnread: {
    fontWeight: '600',
  },
  message: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  time: {
    fontSize: 11,
    color: '#94a3b8',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginLeft: 8,
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
