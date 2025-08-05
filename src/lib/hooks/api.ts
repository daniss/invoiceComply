/**
 * React hooks for API operations with error handling and loading states
 */

import { useState, useEffect, useCallback } from 'react'
import { handleApiError, type ApiError } from '@/lib/api/client'

// Generic API hook for async operations
export function useAsyncOperation<T>() {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await asyncFn()
      setData(result)
      return result
    } catch (err) {
      const errorMessage = handleApiError(err)
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return {
    data,
    loading,
    error,
    execute,
    reset
  }
}

// Hook for file uploads with progress
export function useFileUpload() {
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])

  const upload = useCallback(async (
    files: FileList,
    endpoint: string,
    onProgress?: (progress: number) => void
  ) => {
    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      const formData = new FormData()
      // For single file upload (invoices), use 'file' as the field name
      if (files.length === 1) {
        formData.append('file', files[0])
      } else {
        // For multiple files, use 'files'
        Array.from(files).forEach(file => formData.append('files', file))
      }

      // For demonstration - in real app, you'd use XMLHttpRequest for progress
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include' // Include cookies for authentication
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      setUploadedFiles(result.files || [])
      setProgress(100)
      
      return result
    } catch (err) {
      const errorMessage = handleApiError(err)
      setError(errorMessage)
      throw err
    } finally {
      setUploading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setProgress(0)
    setError(null)
    setUploadedFiles([])
    setUploading(false)
  }, [])

  return {
    progress,
    uploading,
    error,
    uploadedFiles,
    upload,
    reset
  }
}

// Hook for form submissions
export function useFormSubmission<T = any>() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(async (submitFn: () => Promise<T>) => {
    setSubmitting(true)
    setError(null)
    setSubmitted(false)

    try {
      const result = await submitFn()
      setSubmitted(true)
      return result
    } catch (err) {
      const errorMessage = handleApiError(err)
      setError(errorMessage)
      throw err
    } finally {
      setSubmitting(false)
    }
  }, [])

  const reset = useCallback(() => {
    setSubmitting(false)
    setSubmitted(false)
    setError(null)
  }, [])

  return {
    submitting,
    submitted,
    error,
    submit,
    reset
  }
}

// Hook for paginated data
export function usePaginatedData<T>(
  fetchFn: (page: number, limit: number) => Promise<{ data: T[]; pagination: any }>,
  initialPage = 1,
  pageSize = 20
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(initialPage)
  const [pagination, setPagination] = useState<any>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchPage = useCallback(async (pageNum: number, append = false) => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchFn(pageNum, pageSize)
      
      if (append) {
        setData(prev => [...prev, ...result.data])
      } else {
        setData(result.data)
      }
      
      setPagination(result.pagination)
      setHasMore(result.data.length === pageSize)
    } catch (err) {
      const errorMessage = handleApiError(err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, pageSize])

  const loadMore = useCallback(() => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPage(nextPage, true)
  }, [page, fetchPage])

  const refresh = useCallback(() => {
    setPage(initialPage)
    fetchPage(initialPage, false)
  }, [initialPage, fetchPage])

  useEffect(() => {
    fetchPage(page, false)
  }, [])

  return {
    data,
    loading,
    error,
    pagination,
    hasMore,
    loadMore,
    refresh
  }
}

// Hook for real-time status polling
export function useStatusPolling(
  statusFn: () => Promise<any>,
  interval = 2000,
  condition?: (status: any) => boolean // Stop polling when this returns true
) {
  const [status, setStatus] = useState<any>(null)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startPolling = useCallback(() => {
    setPolling(true)
    setError(null)
  }, [])

  const stopPolling = useCallback(() => {
    setPolling(false)
  }, [])

  useEffect(() => {
    if (!polling) return

    const poll = async () => {
      try {
        const result = await statusFn()
        setStatus(result)
        
        // Stop polling if condition is met
        if (condition && condition(result)) {
          setPolling(false)
        }
      } catch (err) {
        const errorMessage = handleApiError(err)
        setError(errorMessage)
        setPolling(false)
      }
    }

    // Poll immediately
    poll()

    // Then poll at intervals
    const intervalId = setInterval(poll, interval)

    return () => clearInterval(intervalId)
  }, [polling, statusFn, interval, condition])

  return {
    status,
    polling,
    error,
    startPolling,
    stopPolling
  }
}

// Hook for optimistic updates
export function useOptimisticUpdate<T>(initialData: T[]) {
  const [data, setData] = useState<T[]>(initialData)
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set())

  const optimisticUpdate = useCallback(async (
    id: string,
    updateFn: (item: T) => T,
    asyncOperation: () => Promise<T>
  ) => {
    // Apply optimistic update
    setData(prev => prev.map(item => 
      (item as any).id === id ? updateFn(item) : item
    ))
    setPendingUpdates(prev => new Set(prev).add(id))

    try {
      // Perform async operation
      const result = await asyncOperation()
      
      // Replace with actual result
      setData(prev => prev.map(item => 
        (item as any).id === id ? result : item
      ))
    } catch (err) {
      // Revert optimistic update on error
      setData(prev => prev.map(item => 
        (item as any).id === id ? initialData.find(initial => (initial as any).id === id) || item : item
      ))
      throw err
    } finally {
      setPendingUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }, [initialData])

  const isPending = useCallback((id: string) => pendingUpdates.has(id), [pendingUpdates])

  return {
    data,
    setData,
    optimisticUpdate,
    isPending
  }
}

// Hook for auto-save functionality
export function useAutoSave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  delay = 2000
) {
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!data) return

      setSaving(true)
      setError(null)

      try {
        await saveFn(data)
        setLastSaved(new Date())
      } catch (err) {
        const errorMessage = handleApiError(err)
        setError(errorMessage)
      } finally {
        setSaving(false)
      }
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [data, saveFn, delay])

  return {
    saving,
    lastSaved,
    error
  }
}