import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { offlineQueue } from './offline-queue';
import { isOfflineSupportedMutation } from './query-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.client.interceptors.request.use(async (config) => {
      // Better Auth's expoClient stores the bearer token under this key
      let token: string | null = null;
      try {
        token = SecureStore.getItem('maintek.session_token') || null;
      } catch {
        // SecureStore.getItem may not be available in all envs - fall back to async
        token = await SecureStore.getItemAsync('maintek.session_token');
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Offline mutation interceptor: queue write requests that fail due to network errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (
          error.message === 'Network Error' &&
          error.config &&
          error.config.method &&
          ['post', 'patch', 'put', 'delete'].includes(error.config.method) &&
          error.config.url &&
          isOfflineSupportedMutation(error.config.url, error.config.method)
        ) {
          // Queue the mutation for later sync
          await offlineQueue.enqueue({
            endpoint: error.config.url,
            method: error.config.method.toUpperCase() as any,
            body: error.config.data ? JSON.parse(error.config.data) : undefined,
          });

          // Return a synthetic response so the UI can optimistically update
          return {
            data: { _offline: true, _queued: true },
            status: 202,
            statusText: 'Queued Offline',
            headers: {},
            config: error.config,
          };
        }

        return Promise.reject(error);
      },
    );
  }

  async setToken(token: string | null) {
    this.token = token;
    if (token) {
      await SecureStore.setItemAsync('auth_token', token);
    } else {
      await SecureStore.deleteItemAsync('auth_token');
    }
  }

  async getToken(): Promise<string | null> {
    if (!this.token) {
      this.token = await SecureStore.getItemAsync('auth_token');
    }
    return this.token;
  }

  // Dashboard
  async getDashboard(params?: Record<string, any>) {
    return this.client.get('/reports/dashboard', { params });
  }

  // Assets
  async getAssets(params?: Record<string, any>) {
    return this.client.get('/assets', { params });
  }

  async getAsset(id: string) {
    return this.client.get(`/assets/${id}`);
  }

  async getAssetByQR(qrCode: string) {
    return this.client.get(`/assets/qr/resolve/${encodeURIComponent(qrCode)}`);
  }

  // Work Orders
  async getWorkOrders(params?: Record<string, any>) {
    return this.client.get('/work-orders', { params });
  }

  async getWorkOrder(id: string) {
    return this.client.get(`/work-orders/${id}`);
  }

  async getMyWorkOrders() {
    return this.client.get('/work-orders/assigned-to-me');
  }

  async createWorkOrder(data: any) {
    return this.client.post('/work-orders', data);
  }

  async updateWorkOrderStatus(id: string, status: string) {
    return this.client.patch(`/work-orders/${id}/status`, { status });
  }

  async addLaborEntry(woId: string, data: any) {
    return this.client.post(`/work-orders/${woId}/labor`, data);
  }

  async updateChecklist(woId: string, itemId: string, data: any) {
    return this.client.patch(`/work-orders/${woId}/checklist/${itemId}`, data);
  }

  // Notifications
  async getNotifications(params?: Record<string, any>) {
    return this.client.get('/notifications', { params });
  }

  async markNotificationRead(id: string) {
    return this.client.patch(`/notifications/${id}/read`);
  }

  async registerPushToken(token: string) {
    return this.client.post('/notifications/push-token', { token });
  }

  // Activity
  async quickStartWorkOrder(assetId: string) {
    return this.client.post(`/activity/quick-start/${assetId}`);
  }

  async quickStartWorkOrderByQr(token: string) {
    return this.client.post('/activity/quick-start-by-qr', { token });
  }

  async completeActivity(activityId: string, notes?: string) {
    return this.client.patch(`/activity/${activityId}/complete`, { notes });
  }

  async abandonActivity(activityId: string, reason?: string) {
    return this.client.patch(`/activity/${activityId}/abandon`, { reason });
  }

  async getMyActiveActivity() {
    return this.client.get('/activity/my-active');
  }

  // AI
  async aiTroubleshoot(data: any) {
    return this.client.post('/ai/troubleshoot', data);
  }

  // Parts
  async getParts(params?: Record<string, any>) {
    return this.client.get('/parts', { params });
  }

  // Files
  async uploadFile(file: any, path: string = 'uploads') {
    const formData = new FormData();
    formData.append('file', file);

    return this.client.post(`/files/upload?path=${path}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async uploadWorkOrderAttachment(woId: string, file: any) {
    const formData = new FormData();
    formData.append('file', file);

    return this.client.post(`/work-orders/${woId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  // Signatures
  async uploadSignature(woId: string, signatureBase64: string) {
    return this.client.post(`/work-orders/${woId}/signature`, { signature: signatureBase64 });
  }

  async getSignature(woId: string) {
    return this.client.get(`/work-orders/${woId}/signature`);
  }

  // Downtime
  async startDowntime(assetId: string, reason: string) {
    return this.client.post(`/assets/${assetId}/downtime`, { reason });
  }

  async endDowntime(assetId: string) {
    return this.client.patch(`/assets/${assetId}/downtime/end`);
  }

  async getDowntimeHistory(assetId: string) {
    return this.client.get(`/assets/${assetId}/downtime`);
  }

  async uploadAssetDocument(assetId: string, file: any, meta: any) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', meta.name);
    if (meta.type) formData.append('type', meta.type);

    return this.client.post(`/assets/${assetId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
}

export const api = new ApiClient();
