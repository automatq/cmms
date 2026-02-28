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
            window.location.href = '/'
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
    return this.client.patch(`/assets/${id}`, data)
  }

  async retireAsset(id: string) {
    return this.client.post(`/assets/${id}/retire`)
  }

  async recordMeterReading(assetId: string, data: { reading: number; notes?: string }) {
    return this.client.post(`/assets/${assetId}/meters`, data)
  }

  async getAssetMeters(assetId: string, params?: Record<string, any>) {
    return this.client.get(`/assets/${assetId}/meters`, { params })
  }

  async uploadAssetDocument(assetId: string, file: File, name: string, type?: string) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)
    if (type) formData.append('type', type)
    return this.client.post(`/assets/${assetId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  async getAssetDocumentUrl(assetId: string, docId: string) {
    return this.client.get(`/assets/${assetId}/documents/${docId}/url`)
  }

  async deleteAssetDocument(assetId: string, docId: string) {
    return this.client.delete(`/assets/${assetId}/documents/${docId}`)
  }

  async getAssetQrCode(assetId: string) {
    return this.client.get(`/assets/${assetId}/qr-code`)
  }

  async getAssetHierarchy() {
    return this.client.get('/assets/hierarchy')
  }

  async getAssetChildren(assetId: string) {
    return this.client.get(`/assets/${assetId}/children`)
  }

  async getAssetHistory(assetId: string) {
    return this.client.get(`/assets/${assetId}/history`)
  }

  // Locations
  async getLocations() {
    return this.client.get('/locations')
  }

  async createLocation(data: any) {
    return this.client.post('/locations', data)
  }

  async updateLocation(id: string, data: any) {
    return this.client.patch(`/locations/${id}`, data)
  }

  async deleteLocation(id: string) {
    return this.client.delete(`/locations/${id}`)
  }

  async getLocationTree() {
    return this.client.get('/locations/tree')
  }

  // Categories
  async getCategories() {
    return this.client.get('/asset-categories')
  }

  async getCategoryTree() {
    return this.client.get('/asset-categories/tree')
  }

  async createCategory(data: any) {
    return this.client.post('/asset-categories', data)
  }

  async updateCategory(id: string, data: any) {
    return this.client.patch(`/asset-categories/${id}`, data)
  }

  async deleteCategory(id: string) {
    return this.client.delete(`/asset-categories/${id}`)
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
    return this.client.patch(`/work-orders/${id}`, data)
  }

  async updateWorkOrderStatus(id: string, status: string) {
    return this.client.patch(`/work-orders/${id}/status`, { status })
  }

  // Work Requests
  async getWorkRequests(params?: Record<string, any>) {
    return this.client.get('/work-orders/requests', { params })
  }

  async approveWorkRequest(id: string) {
    return this.client.patch(`/work-orders/requests/${id}/approve`)
  }

  async rejectWorkRequest(id: string, reason: string) {
    return this.client.patch(`/work-orders/requests/${id}/reject`, { reason })
  }

  // PM Plans
  async getPmPlans(params?: Record<string, any>) {
    return this.client.get('/pm', { params })
  }

  async getPmPlan(id: string) {
    return this.client.get(`/pm/${id}`)
  }

  async createPmPlan(data: any) {
    return this.client.post('/pm', data)
  }

  async updatePmPlan(id: string, data: any) {
    return this.client.patch(`/pm/${id}`, data)
  }

  async deletePmPlan(id: string) {
    return this.client.delete(`/pm/${id}`)
  }

  async togglePmPlanActive(id: string) {
    return this.client.post(`/pm/${id}/toggle-active`)
  }

  async triggerPmPlan(id: string) {
    return this.client.post(`/pm/${id}/trigger`)
  }

  async getPmPlanHistory(id: string) {
    return this.client.get(`/pm/${id}/history`)
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

  async getCostReport(params: Record<string, any>) {
    return this.client.get('/reports/costs', { params })
  }

  async getTechnicianPerformanceReport(params: Record<string, any>) {
    return this.client.get('/reports/technician-performance', { params })
  }

  // AI
  async aiChat(message: string, conversationId?: string, temperature?: number) {
    return this.client.post('/ai/chat', { message, conversationId, temperature })
  }

  async aiClearConversation(conversationId: string) {
    return this.client.delete(`/ai/chat/${conversationId}`)
  }

  async aiTroubleshoot(data: any) {
    return this.client.post('/ai/troubleshoot', data)
  }

  async aiSummarizeWorkOrder(workOrderId: string) {
    return this.client.post('/ai/summarize-wo', { workOrderId })
  }

  async aiPredictFailure(assetId: string, daysAhead?: number) {
    return this.client.post('/ai/predict-failure', { assetId, daysAhead })
  }

  async aiMaintenanceRecommendation(assetId: string, symptoms?: string) {
    return this.client.post('/ai/maintenance-recommendation', { assetId, symptoms })
  }

  // Files
  async uploadFile(file: File, path: string = 'uploads') {
    const formData = new FormData()
    formData.append('file', file)
    return this.client.post(`/files/upload?path=${path}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }

  async uploadAssetImage(assetId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return this.client.post(`/assets/${assetId}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }

  // Organization / Settings
  async getOrganization() {
    return this.client.get('/organization')
  }

  async updateOrganization(data: any) {
    return this.client.patch('/organization', data)
  }

  // Notifications
  async getNotifications(limit = 50) {
    return this.client.get('/notifications', { params: { limit } })
  }

  async getUnreadCount() {
    return this.client.get('/notifications/unread-count')
  }

  async markNotificationRead(id: string) {
    return this.client.patch(`/notifications/${id}/read`)
  }

  async markAllNotificationsRead() {
    return this.client.post('/notifications/read-all')
  }

  // User profile & preferences
  async getMyProfile() {
    return this.client.get('/users/me')
  }

  async updateNotificationPreferences(preferences: Record<string, boolean>) {
    return this.client.patch('/users/me/preferences', { notificationPreferences: preferences })
  }

  // CSV Import/Export
  async exportAssetsCsv() {
    return this.client.get('/assets/csv/export', { responseType: 'blob' })
  }

  async importAssetsCsv(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return this.client.post('/assets/csv/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  async exportPartsCsv() {
    return this.client.get('/parts/csv/export', { responseType: 'blob' })
  }

  async importPartsCsv(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return this.client.post('/parts/csv/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  async exportLocationsCsv() {
    return this.client.get('/locations/csv/export', { responseType: 'blob' })
  }

  async importLocationsCsv(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return this.client.post('/locations/csv/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  // Checklist Templates
  async getChecklistTemplates(params?: Record<string, any>) {
    return this.client.get('/checklist-templates', { params })
  }

  async getChecklistTemplate(id: string) {
    return this.client.get(`/checklist-templates/${id}`)
  }

  async createChecklistTemplate(data: any) {
    return this.client.post('/checklist-templates', data)
  }

  async updateChecklistTemplate(id: string, data: any) {
    return this.client.patch(`/checklist-templates/${id}`, data)
  }

  async deleteChecklistTemplate(id: string) {
    return this.client.delete(`/checklist-templates/${id}`)
  }

  async getLibraryTemplates() {
    return this.client.get('/checklist-templates/library')
  }

  async importLibraryTemplate(index: number) {
    return this.client.post(`/checklist-templates/library/${index}/import`)
  }

  // Onboarding
  async completeOnboarding() {
    return this.client.post('/organization/complete-onboarding')
  }

  // Users & Roles
  async getUsers(params?: Record<string, any>) {
    return this.client.get('/users', { params })
  }

  async createUser(data: any) {
    return this.client.post('/users', data)
  }

  async updateUser(id: string, data: any) {
    return this.client.patch(`/users/${id}`, data)
  }

  async deactivateUser(id: string) {
    return this.client.post(`/users/${id}/deactivate`)
  }

  async activateUser(id: string) {
    return this.client.post(`/users/${id}/activate`)
  }

  async getRoles() {
    return this.client.get('/roles')
  }

  async getRole(id: string) {
    return this.client.get(`/roles/${id}`)
  }

  async createRole(data: any) {
    return this.client.post('/roles', data)
  }

  async updateRole(id: string, data: any) {
    return this.client.patch(`/roles/${id}`, data)
  }

  async deleteRole(id: string) {
    return this.client.delete(`/roles/${id}`)
  }

  // Work Order sub-resources
  async addWorkOrderLabor(woId: string, data: any) {
    return this.client.post(`/work-orders/${woId}/labor`, data)
  }

  async removeWorkOrderLabor(woId: string, laborId: string) {
    return this.client.delete(`/work-orders/${woId}/labor/${laborId}`)
  }

  async addWorkOrderPart(woId: string, data: any) {
    return this.client.post(`/work-orders/${woId}/parts`, data)
  }

  async removeWorkOrderPart(woId: string, partId: string) {
    return this.client.delete(`/work-orders/${woId}/parts/${partId}`)
  }

  async addWorkOrderAttachment(woId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return this.client.post(`/work-orders/${woId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  async getWorkOrderAttachmentUrl(woId: string, attachmentId: string) {
    return this.client.get(`/work-orders/${woId}/attachments/${attachmentId}/url`)
  }

  async removeWorkOrderAttachment(woId: string, attachmentId: string) {
    return this.client.delete(`/work-orders/${woId}/attachments/${attachmentId}`)
  }

  async saveWorkOrderChecklist(woId: string, data: any) {
    return this.client.post(`/work-orders/${woId}/checklist`, data)
  }

  async uploadChecklistPhoto(woId: string, stepIndex: number, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return this.client.post(`/work-orders/${woId}/checklist/${stepIndex}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  // Inventory operations
  async receiveStock(data: any) {
    return this.client.post('/inventory/receive', data)
  }

  async issueStock(data: any) {
    return this.client.post('/inventory/issue', data)
  }

  async adjustStock(data: any) {
    return this.client.post('/inventory/adjust', data)
  }

  async transferStock(data: any) {
    return this.client.post('/inventory/transfer', data)
  }

  async getInventoryTransactions(params?: Record<string, any>) {
    return this.client.get('/inventory/transactions', { params })
  }

  // Suppliers
  async createSupplier(data: any) {
    return this.client.post('/suppliers', data)
  }

  async updateSupplier(id: string, data: any) {
    return this.client.put(`/suppliers/${id}`, data)
  }

  async deleteSupplier(id: string) {
    return this.client.delete(`/suppliers/${id}`)
  }

  // Storerooms
  async createStoreroom(data: any) {
    return this.client.post('/storerooms', data)
  }

  async updateStoreroom(id: string, data: any) {
    return this.client.put(`/storerooms/${id}`, data)
  }

  async deleteStoreroom(id: string) {
    return this.client.delete(`/storerooms/${id}`)
  }

  // Purchase Orders
  async getPurchaseOrder(id: string) {
    return this.client.get(`/purchase-orders/${id}`)
  }

  async createPurchaseOrder(data: any) {
    return this.client.post('/purchase-orders', data)
  }

  async sendPurchaseOrder(id: string) {
    return this.client.post(`/purchase-orders/${id}/send`)
  }

  async receivePurchaseOrder(id: string, data: any) {
    return this.client.post(`/purchase-orders/${id}/receive`, data)
  }

  async cancelPurchaseOrder(id: string) {
    return this.client.post(`/purchase-orders/${id}/cancel`)
  }

  // Billing
  async getSubscription() {
    return this.client.get('/billing/subscription')
  }

  async createCheckoutSession(data: { plan: string; successUrl: string; cancelUrl: string }) {
    return this.client.post('/billing/checkout', data)
  }

  async createBillingPortal(data: { returnUrl: string }) {
    return this.client.post('/billing/portal', data)
  }

  async cancelSubscription() {
    return this.client.post('/billing/cancel')
  }

  async getInvoices(limit?: number) {
    return this.client.get('/billing/invoices', { params: { limit } })
  }

  // Activity
  async getActiveActivities() {
    return this.client.get('/activity/active')
  }

  async quickStartWorkOrder(assetId: string) {
    return this.client.post(`/activity/quick-start/${assetId}`)
  }

  async completeActivity(activityId: string, notes?: string) {
    return this.client.patch(`/activity/${activityId}/complete`, { notes })
  }

  async getMyActiveActivity() {
    return this.client.get('/activity/my-active')
  }
}

export const api = new ApiClient()
