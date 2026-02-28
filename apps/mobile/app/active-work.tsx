import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export default function ActiveWorkScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    activityId: string
    workOrderId: string
    woNumber: string
    assetName: string
    assetNumber: string
    isNew: string
  }>()

  const [elapsed, setElapsed] = useState(0)
  const [notes, setNotes] = useState('')
  const startTime = useRef(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const completeMutation = useMutation({
    mutationFn: () => api.completeActivity(params.activityId, notes || undefined),
    onSuccess: () => {
      Alert.alert('Work Completed', 'Your work session has been recorded.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ])
    },
    onError: () => {
      Alert.alert('Error', 'Failed to complete work session. Please try again.')
    },
  })

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleComplete = () => {
    Alert.alert('Complete Work', 'Are you sure you want to complete this work session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: () => completeMutation.mutate() },
    ])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status indicator */}
      <View style={styles.statusBar}>
        <View style={styles.pulseDot} />
        <Text style={styles.statusText}>Work In Progress</Text>
      </View>

      {/* Asset info */}
      <View style={styles.infoCard}>
        <Text style={styles.label}>Asset</Text>
        <Text style={styles.assetName}>{params.assetName}</Text>
        {params.assetNumber && (
          <Text style={styles.assetNumber}>{params.assetNumber}</Text>
        )}
      </View>

      {/* Work order info */}
      <View style={styles.infoCard}>
        <Text style={styles.label}>Work Order</Text>
        <Text style={styles.woNumber}>{params.woNumber}</Text>
        {params.isNew === 'true' && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>Auto-Created</Text>
          </View>
        )}
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerLabel}>Elapsed Time</Text>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
      </View>

      {/* Notes */}
      <View style={styles.notesContainer}>
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add notes about the work performed..."
          placeholderTextColor="#9ca3af"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Actions */}
      <Pressable
        style={[styles.completeButton, completeMutation.isPending && styles.buttonDisabled]}
        onPress={handleComplete}
        disabled={completeMutation.isPending}
      >
        <Text style={styles.completeButtonText}>
          {completeMutation.isPending ? 'Completing...' : 'Complete Work'}
        </Text>
      </Pressable>

      <Pressable
        style={styles.viewWoButton}
        onPress={() => router.push(`/work-orders/${params.workOrderId}`)}
      >
        <Text style={styles.viewWoButtonText}>View Work Order Details</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    marginRight: 10,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#166534',
  },
  infoCard: {
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
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  assetName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  assetNumber: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  woNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  newBadge: {
    marginTop: 6,
    backgroundColor: '#dbeafe',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  timerContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  timer: {
    fontSize: 48,
    fontWeight: '700',
    color: '#22c55e',
    fontVariant: ['tabular-nums'],
  },
  notesContainer: {
    marginVertical: 12,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  completeButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  viewWoButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  viewWoButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
})
