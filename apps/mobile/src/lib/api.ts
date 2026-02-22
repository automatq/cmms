import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

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
      if (!this.token) {
        this.token = await SecureStore.getItemAsync('auth_token');
      }
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
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
    return this.client.get('/assets/qr/' + qrCode);
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

  // AI
  async aiTroubleshoot(data: any) {
    return this.client.post('/ai/troubleshoot', data);
  }

  // Parts
  async getParts(params?: Record<string, any>) {
    return this.client.get('/parts', { params });
  }
}

export const api = new ApiClient();
