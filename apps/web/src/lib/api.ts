import axios, { AxiosError, AxiosInstance } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

class ApiClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
        return Promise.reject(error)
      }
    )
  }

  setToken(token: string | null) {
    this.token = token
  }

  // Assets
  async getAssets(params?: Record<string, any>) {
    return this.client.get('/assets', { params })
  }

  async getAsset(id: string) {
    return this.client.get(`/assets/${id}`)
  }

  async createAsset(data: any) {
    return this.client.post('/assets', data)
  }

  async updateAsset(id: string, data: any) {
    return this.client.put(`/assets/${id}`, data)
  }

  async deleteAsset(id: string) {
    return this.client.delete(`/assets/${id}`)
  }

  // Locations
  async getLocations() {
    return this.client.get('/locations')
  }

  // Categories
  async getCategories() {
    return this.client.get('/categories')
  }

  // Work Orders
  async getWorkOrders(params?: Record<string, any>) {
    return this.client.get('/work-orders', { params })
  }

  async getWorkOrder(id: string) {
    return this.client.get(`/work-orders/${id}`)
  }

  async createWorkOrder(data: any) {
    return this.client.post('/work-orders', data)
  }

  async updateWorkOrder(id: string, data: any) {
    return this.client.put(`/work-orders/${id}`, data)
  }

  async updateWorkOrderStatus(id: string, status: string) {
    return this.client.patch(`/work-orders/${id}/status`, { status })
  }

  // PM Plans
  async getPmPlans(params?: Record<string, any>) {
    return this.client.get('/pm-plans', { params })
  }

  async getPmPlan(id: string) {
    return this.client.get(`/pm-plans/${id}`)
  }

  async createPmPlan(data: any) {
    return this.client.post('/pm-plans', data)
  }

  async updatePmPlan(id: string, data: any) {
    return this.client.put(`/pm-plans/${id}`, data)
  }

  // Inventory
  async getParts(params?: Record<string, any>) {
    return this.client.get('/parts', { params })
  }

  async getPart(id: string) {
    return this.client.get(`/parts/${id}`)
  }

  async createPart(data: any) {
    return this.client.post('/parts', data)
  }

  async updatePart(id: string, data: any) {
    return this.client.put(`/parts/${id}`, data)
  }

  async getStorerooms() {
    return this.client.get('/storerooms')
  }

  async getSuppliers() {
    return this.client.get('/suppliers')
  }

  async getPurchaseOrders(params?: Record<string, any>) {
    return this.client.get('/purchase-orders', { params })
  }

  // Reports
  async getDashboard(params?: Record<string, any>) {
    return this.client.get('/reports/dashboard', { params })
  }

  async getWorkOrderReport(params: Record<string, any>) {
    return this.client.get('/reports/work-orders', { params })
  }

  async getAssetReport(params: Record<string, any>) {
    return this.client.get('/reports/assets', { params })
  }

  async getPmComplianceReport(params: Record<string, any>) {
    return this.client.get('/reports/pm-compliance', { params })
  }

  async getInventoryReport(params: Record<string, any>) {
    return this.client.get('/reports/inventory', { params })
  }

  // AI
  async aiChat(message: string, conversationId?: string) {
    return this.client.post('/ai/chat', { message, conversationId })
  }

  async aiTroubleshoot(data: any) {
    return this.client.post('/ai/troubleshoot', data)
  }

  // Notifications
  async getNotifications(params?: Record<string, any>) {
    return this.client.get('/notifications', { params })
  }

  async markNotificationRead(id: string) {
    return this.client.patch(`/notifications/${id}/read`)
  }
}

export const api = new ApiClient()
