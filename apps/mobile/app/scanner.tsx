import { Alert, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera/next';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { api } from '@/lib/api';

type ScanTarget =
  | { kind: 'token'; value: string }
  | { kind: 'assetId'; value: string };

function extractScanTarget(data: string): ScanTarget | null {
  const trimmed = data.trim();

  const tokenUrlMatch = trimmed.match(/\/scan\/asset\/([A-Za-z0-9_-]{16,})/i);
  if (tokenUrlMatch) {
    return { kind: 'token', value: tokenUrlMatch[1] };
  }

  const legacyUrlMatch = trimmed.match(/\/assets\/([0-9a-f-]{36})/i);
  if (legacyUrlMatch) {
    return { kind: 'assetId', value: legacyUrlMatch[1] };
  }

  const uuidMatch = trimmed.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  if (uuidMatch) {
    return { kind: 'assetId', value: uuidMatch[0] };
  }

  const rawTokenMatch = trimmed.match(/^[A-Za-z0-9_-]{16,}$/);
  if (rawTokenMatch) {
    return { kind: 'token', value: rawTokenMatch[0] };
  }

  return null;
}

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  const resetScanner = () => {
    setScanned(false);
    setProcessing(false);
  };

  const openActiveWork = (payload: {
    activityId: string;
    workOrderId: string;
    woNumber: string;
    assetName: string;
    assetNumber?: string;
    isNew?: boolean;
  }) => {
    router.replace({
      pathname: '/active-work',
      params: {
        activityId: payload.activityId,
        workOrderId: payload.workOrderId,
        woNumber: payload.woNumber,
        assetName: payload.assetName,
        assetNumber: payload.assetNumber || '',
        isNew: payload.isNew ? 'true' : 'false',
      },
    });
  };

  const handleConflict = (error: any) => {
    const errorData = error?.response?.data;
    if (error?.response?.status !== 409 || errorData?.code !== 'ACTIVE_SESSION_EXISTS') {
      return false;
    }

    const activeActivity = errorData.activeActivity;
    const activeWorkOrder = errorData.activeWorkOrder;
    const activeAsset = errorData.activeAsset;

    Alert.alert(
      'Session Already Running',
      `You already have an active timed session on ${activeAsset?.name || 'another asset'}. Resume it instead of starting a second timer.`,
      [
        {
          text: 'Resume Current Session',
          onPress: () =>
            openActiveWork({
              activityId: activeActivity.id,
              workOrderId: activeWorkOrder.id,
              woNumber: activeWorkOrder.woNumber,
              assetName: activeAsset.name,
              assetNumber: activeAsset.assetNumber,
              isNew: false,
            }),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: resetScanner,
        },
      ],
    );

    return true;
  };

  const startWork = async (target: ScanTarget) => {
    try {
      const response =
        target.kind === 'token'
          ? await api.quickStartWorkOrderByQr(target.value)
          : await api.quickStartWorkOrder(target.value);

      const { activity, workOrder, asset, isNewWorkOrder } = response.data;

      openActiveWork({
        activityId: activity.id,
        workOrderId: workOrder.id,
        woNumber: workOrder.woNumber,
        assetName: asset.name,
        assetNumber: asset.assetNumber || '',
        isNew: isNewWorkOrder,
      });
    } catch (error: any) {
      if (handleConflict(error)) {
        return;
      }

      const message =
        error?.response?.data?.message ||
        'Failed to start work session.';
      Alert.alert('Error', message, [
        { text: 'Scan Again', onPress: resetScanner },
        { text: 'Cancel', onPress: () => router.back() },
      ]);
    }
  };

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || processing) {
      return;
    }

    setScanned(true);
    setProcessing(true);

    const target = extractScanTarget(data);

    if (!target) {
      Alert.alert(
        'Invalid QR Code',
        'Could not identify an asset from this QR code.',
        [
          { text: 'Scan Again', onPress: resetScanner },
          { text: 'Cancel', onPress: () => router.back() },
        ],
      );
      return;
    }

    await startWork(target);
  };

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
