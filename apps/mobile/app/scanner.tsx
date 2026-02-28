import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission is required to scan QR codes</Text>
          <Text style={styles.permissionButton} onPress={requestPermission}>
            Grant Permission
          </Text>
        </View>
      </View>
    );
  }

  const extractAssetId = (data: string): string | null => {
    // Match URL pattern: /assets/{uuid}
    const urlMatch = data.match(/\/assets\/([0-9a-f-]{36})/i);
    if (urlMatch) return urlMatch[1];

    // Check if data is a raw UUID
    const uuidMatch = data.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    if (uuidMatch) return uuidMatch[0];

    return null;
  };

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    const assetId = extractAssetId(data);

    if (!assetId) {
      // Fallback: try the old QR code lookup
      try {
        const response = await api.getAssetByQR(data);
        if (response.data) {
          // Quick-start with the found asset
          await startWork(response.data.id);
          return;
        }
      } catch {
        // Fall through to error
      }

      Alert.alert(
        'Invalid QR Code',
        'Could not identify an asset from this QR code.',
        [
          { text: 'Scan Again', onPress: () => { setScanned(false); setProcessing(false); } },
          { text: 'Cancel', onPress: () => router.back() },
        ]
      );
      return;
    }

    await startWork(assetId);
  };

  const startWork = async (assetId: string) => {
    try {
      const response = await api.quickStartWorkOrder(assetId);
      const { activity, workOrder, asset, isNewWorkOrder } = response.data;

      router.replace({
        pathname: '/active-work',
        params: {
          activityId: activity.id,
          workOrderId: workOrder.id,
          woNumber: workOrder.woNumber,
          assetName: asset.name,
          assetNumber: asset.assetNumber || '',
          isNew: isNewWorkOrder ? 'true' : 'false',
        },
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to start work session.';
      Alert.alert('Error', message, [
        { text: 'Scan Again', onPress: () => { setScanned(false); setProcessing(false); } },
        { text: 'Cancel', onPress: () => router.back() },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instructions}>
            {processing ? 'Starting work session...' : 'Point your camera at an asset QR code'}
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderRadius: 16,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 16,
  },
  instructions: {
    color: '#fff',
    fontSize: 16,
    marginTop: 24,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionButton: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
});
