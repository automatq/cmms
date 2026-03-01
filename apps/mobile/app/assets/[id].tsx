import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const { data, isLoading, error } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => api.getAsset(id),
    enabled: !!id,
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
        <Text style={styles.errorText}>Failed to load asset</Text>
        <Pressable style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go Back</Text>
        </Pressable>
      </View>
    )
  }

  const asset = data.data

  const statusColor: Record<string, string> = {
    OPERATIONAL: '#22c55e',
    NON_OPERATIONAL: '#ef4444',
    IN_MAINTENANCE: '#f59e0b',
    DECOMMISSIONED: '#6b7280',
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.assetNumber}>{asset.assetNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (statusColor[asset.status] || '#9ca3af') + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor[asset.status] || '#9ca3af' }]}>
            {asset.status?.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* Name */}
      <Text style={styles.name}>{asset.name}</Text>
      {asset.description && <Text style={styles.description}>{asset.description}</Text>}

      {/* Details */}
      <View style={styles.detailsCard}>
        {asset.category && <DetailRow label="Category" value={asset.category.name} />}
        {asset.location && <DetailRow label="Location" value={asset.location.name} />}
        {asset.manufacturer && <DetailRow label="Manufacturer" value={asset.manufacturer} />}
        {asset.model && <DetailRow label="Model" value={asset.model} />}
        {asset.serialNumber && <DetailRow label="Serial Number" value={asset.serialNumber} />}
        {asset.installDate && (
          <DetailRow label="Install Date" value={new Date(asset.installDate).toLocaleDateString()} />
        )}
      </View>

      {/* Quick actions */}
      <Pressable
        style={styles.scanButton}
        onPress={() => router.push({ pathname: '/scanner' })}
      >
        <Text style={styles.scanButtonText}>Start Work on This Asset</Text>
      </Pressable>
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
  assetNumber: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  description: { fontSize: 15, color: '#6b7280', marginBottom: 16, lineHeight: 22 },
  detailsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'right' },
  scanButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  scanButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})
