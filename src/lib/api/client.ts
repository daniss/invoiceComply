/**
 * API client utilities for frontend communication with backend
 */

export class ApiError extends Error {
  constructor(
    message: string, 
    public statusCode: number, 
    public response?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Base API client
class ApiClient {
  private baseUrl: string

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include', // Include cookies for authentication
      ...options
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {}
        
        throw new ApiError(errorMessage, response.status)
      }

      const data = await response.json()
      return data
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError('Network error', 0, error)
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    if (params) {
      // Filter out undefined values
      const filteredParams = Object.entries(params)
        .filter(([_, value]) => value !== undefined && value !== null)
        .reduce((acc, [key, value]) => {
          acc[key] = value
          return acc
        }, {} as Record<string, any>)
      
      const url = Object.keys(filteredParams).length > 0
        ? `${endpoint}?${new URLSearchParams(filteredParams).toString()}`
        : endpoint
      
      return this.request<T>(url, { method: 'GET' })
    }

    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // File upload with FormData
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    })
  }
}

// Create API client instance
export const apiClient = new ApiClient()

// Specialized API functions
export const invoiceApi = {
  upload: (files: FileList, metadata?: any) => {
    const formData = new FormData()
    Array.from(files).forEach(file => formData.append('files', file))
    if (metadata) formData.append('metadata', JSON.stringify(metadata))
    return apiClient.upload<{ success: boolean; invoices: any[] }>('/invoices/upload', formData)
  },

  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<{ success: boolean; invoices: any[]; pagination: any }>('/invoices', params),

  getById: (id: string) =>
    apiClient.get<{ success: boolean; invoice: any }>(`/invoices/${id}`),

  generateFacturX: (invoiceId: string, data: any) =>
    apiClient.post<{ success: boolean; xml: any; pdf?: any }>(`/invoices/${invoiceId}/factur-x`, data),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/invoices/${id}`)
}

export const complianceApi = {
  check: (invoiceData: any) =>
    apiClient.post<{ success: boolean; compliance: any }>('/compliance/check', { invoiceData }),

  getHistory: (params?: { invoiceId?: string; page?: number }) =>
    apiClient.get<{ success: boolean; checks: any[] }>('/compliance/check', params)
}

export const transmissionApi = {
  send: (invoiceId: string, recipientSiret: string, options?: any) =>
    apiClient.post<{ success: boolean; transmission: any }>('/transmissions/send', {
      invoiceId,
      recipientSiret,
      ...options
    }),

  getStatus: (transmissionId?: string, params?: any) =>
    apiClient.get<{ success: boolean; transmission?: any; transmissions?: any[] }>('/transmissions/status', {
      transmissionId,
      ...params
    }),

  updateStatus: (transmissionId: string, status: string, details?: any) =>
    apiClient.post<{ success: boolean; transmission: any }>('/transmissions/status', {
      transmissionId,
      status,
      ...details
    })
}


export const facturXApi = {
  generate: (invoiceData: any, options?: { format?: string; compliance?: boolean }) =>
    apiClient.post<{ success: boolean; xml?: any; pdf?: any; compliance?: any }>('/factur-x/generate', {
      invoiceData,
      ...options
    }),

  getHistory: (params?: { invoiceId?: string; page?: number }) =>
    apiClient.get<{ success: boolean; generations: any[] }>('/factur-x/generate', params)
}

export const settingsApi = {
  getCompany: () =>
    apiClient.get<{ success: boolean; settings: any }>('/settings/company'),

  updateCompany: (settings: any) =>
    apiClient.patch<{ success: boolean; settings: any }>('/settings/company', settings),

  createCompany: (settings: any) =>
    apiClient.post<{ success: boolean; settings: any }>('/settings/company', settings)
}

export const dashboardApi = {
  getStats: (params?: { period?: string }) =>
    apiClient.get<{ success: boolean; stats: any }>('/dashboard/stats', params)
}

export const auditApi = {
  export: (params?: { format?: string; startDate?: string; endDate?: string }) =>
    apiClient.get<{ success: boolean; data: any }>('/audit/export', params)
}

export const gdprApi = {
  export: () =>
    apiClient.get<{ success: boolean; data: any }>('/gdpr/export')
}

// Utility functions
export const handleApiError = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Une erreur inattendue s\'est produite'
}

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError
}

// React Query keys for caching
export const queryKeys = {
  invoices: {
    all: ['invoices'],
    lists: () => [...queryKeys.invoices.all, 'list'],
    list: (params: any) => [...queryKeys.invoices.lists(), params],
    details: () => [...queryKeys.invoices.all, 'detail'],
    detail: (id: string) => [...queryKeys.invoices.details(), id]
  },
  transmissions: {
    all: ['transmissions'],
    lists: () => [...queryKeys.transmissions.all, 'list'],
    list: (params: any) => [...queryKeys.transmissions.lists(), params],
    status: (id: string) => [...queryKeys.transmissions.all, 'status', id]
  },
  compliance: {
    all: ['compliance'],
    checks: () => [...queryKeys.compliance.all, 'checks'],
    check: (params: any) => [...queryKeys.compliance.checks(), params]
  },
  bulk: {
    all: ['bulk'],
    jobs: () => [...queryKeys.bulk.all, 'jobs'],
    job: (id: string) => [...queryKeys.bulk.jobs(), id]
  },
  dashboard: {
    all: ['dashboard'],
    stats: (params: any) => [...queryKeys.dashboard.all, 'stats', params]
  },
  settings: {
    all: ['settings'],
    company: () => [...queryKeys.settings.all, 'company']
  }
}