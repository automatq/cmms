import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export default function WorkOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const workOrderId = Array.isArray(id) ? id[0] : id
  const router = useRouter()

  const { data, isLoading, error } = useQuery({
    queryKey: ['work-order', workOrderId],
    queryFn: () => {
      if (!workOrderId) {
        throw new Error('Missing work order ID')
      }
      return api.getWorkOrder(workOrderId)
    },
    enabled: !!workOrderId,
  })

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (error || !data?.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load work order</Text>
        <Pressable style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go Back</Text>
        </Pressable>
      </View>
    )
  }

  const wo = data.data

  const statusColor: Record<string, string> = {
    DRAFT: '#9ca3af',
    OPEN: '#3b82f6',
    IN_PROGRESS: '#f59e0b',
    ON_HOLD: '#ef4444',
    COMPLETED: '#22c55e',
    CANCELLED: '#6b7280',
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.woNumber}>{wo.woNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (statusColor[wo.status] || '#9ca3af') + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor[wo.status] || '#9ca3af' }]}>
            {wo.status?.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>{wo.title}</Text>
      {wo.description && <Text style={styles.description}>{wo.description}</Text>}

      {/* Details */}
      <View style={styles.detailsCard}>
        <DetailRow label="Priority" value={wo.priority} />
        <DetailRow label="Type" value={wo.type?.replace('_', ' ')} />
        {wo.asset && <DetailRow label="Asset" value={wo.asset.name} />}
        {wo.assignedTo && (
          <DetailRow label="Assigned To" value={`${wo.assignedTo.firstName} ${wo.assignedTo.lastName}`} />
        )}
        {wo.dueDate && (
          <DetailRow label="Due Date" value={new Date(wo.dueDate).toLocaleDateString()} />
        )}
      </View>

      {/* Checklist */}
      {wo.checklistResults && wo.checklistResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checklist</Text>
          {wo.checklistResults.map((item: any) => (
            <View key={item.id} style={styles.checklistItem}>
              <Text style={styles.checkmark}>{item.isCompleted ? '\u2705' : '\u2B1C'}</Text>
              <Text style={styles.checklistText}>{item.itemName}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Labor */}
      {wo.laborEntries && wo.laborEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Labor</Text>
          {wo.laborEntries.map((entry: any) => (
            <View key={entry.id} style={styles.laborEntry}>
              <Text style={styles.laborUser}>{entry.user?.firstName} {entry.user?.lastName}</Text>
              <Text style={styles.laborHours}>{entry.hours}h</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#ef4444', marginBottom: 12 },
  retryButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#2563eb', borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  woNumber: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  description: { fontSize: 15, color: '#6b7280', marginBottom: 16, lineHeight: 22 },
  detailsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  checkmark: { fontSize: 16, marginRight: 8 },
  checklistText: { fontSize: 14, color: '#374151', flex: 1 },
  laborEntry: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  laborUser: { fontSize: 14, color: '#374151' },
  laborHours: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
})
