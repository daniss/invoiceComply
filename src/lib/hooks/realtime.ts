/**
 * Real-time data hooks using Supabase subscriptions
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Generic real-time hook
export function useRealtimeSubscription<T>(
  table: string,
  filter?: string,
  initialData?: T[]
) {
  const [data, setData] = useState<T[]>(initialData || [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel

    const setupSubscription = async () => {
      try {
        // Initial fetch
        let query = supabase.from(table).select('*')
        if (filter) {
          query = query.filter(filter.split('=')[0], 'eq', filter.split('=')[1])
        }
        
        const { data: initialData, error: fetchError } = await query
        
        if (fetchError) throw fetchError
        setData(initialData || [])

        // Setup real-time subscription
        channel = supabase
          .channel(`${table}_changes`)
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table,
              filter
            },
            (payload) => {
              const { eventType, new: newRecord, old: oldRecord } = payload

              setData(currentData => {
                switch (eventType) {
                  case 'INSERT':
                    return [...currentData, newRecord as T]
                  
                  case 'UPDATE':
                    return currentData.map(item => 
                      (item as any).id === newRecord.id ? newRecord as T : item
                    )
                  
                  case 'DELETE':
                    return currentData.filter(item => 
                      (item as any).id !== oldRecord.id
                    )
                  
                  default:
                    return currentData
                }
              })
            }
          )
          .subscribe()

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [table, filter])

  return { data, loading, error }
}

// Invoice-specific hooks
export function useInvoices(userId?: string) {
  return useRealtimeSubscription(
    'invoices',
    userId ? `user_id=eq.${userId}` : undefined
  )
}

export function useTransmissions(userId?: string) {
  return useRealtimeSubscription(
    'transmissions', 
    userId ? `user_id=eq.${userId}` : undefined
  )
}

export function useBulkJobs(userId?: string) {
  return useRealtimeSubscription(
    'bulk_processing_jobs',
    userId ? `user_id=eq.${userId}` : undefined
  )
}

// Compliance checks hook
export function useComplianceChecks(userId?: string) {
  return useRealtimeSubscription(
    'compliance_checks',
    userId ? `user_id=eq.${userId}` : undefined
  )
}

// Hook for tracking specific invoice status
export function useInvoiceStatus(invoiceId: string) {
  const [status, setStatus] = useState<string>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    const setupTracking = async () => {
      // Get initial status
      const { data, error } = await supabase
        .from('invoices')
        .select('status')
        .eq('id', invoiceId)
        .single()

      if (!error && data) {
        setStatus(data.status)
      }
      setLoading(false)

      // Subscribe to changes
      const channel = supabase
        .channel(`invoice_${invoiceId}_status`)
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'invoices',
            filter: `id=eq.${invoiceId}`
          },
          (payload) => {
            setStatus(payload.new.status)
          }
        )
        .subscribe()

      return () => supabase.removeChannel(channel)
    }

    const cleanup = setupTracking()
    return () => cleanup.then(fn => fn && fn())
  }, [invoiceId])

  return { status, loading }
}

// Hook for transmission status tracking
export function useTransmissionStatus(transmissionId: string) {
  const [status, setStatus] = useState<string>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    const setupTracking = async () => {
      // Get initial status
      const { data, error } = await supabase
        .from('transmissions')
        .select('status, error_message, delivered_at')
        .eq('id', transmissionId)
        .single()

      if (!error && data) {
        setStatus(data.status)
      }
      setLoading(false)

      // Subscribe to changes
      const channel = supabase
        .channel(`transmission_${transmissionId}_status`)
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transmissions',
            filter: `id=eq.${transmissionId}`
          },
          (payload) => {
            setStatus(payload.new.status)
          }
        )
        .subscribe()

      return () => supabase.removeChannel(channel)
    }

    const cleanup = setupTracking()
    return () => cleanup.then(fn => fn && fn())
  }, [transmissionId])

  return { status, loading }
}

// Hook for bulk job progress
export function useBulkJobProgress(jobId: string) {
  const [progress, setProgress] = useState({
    status: 'pending',
    processedFiles: 0,
    totalFiles: 0,
    errors: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    const setupTracking = async () => {
      // Get initial progress
      const { data, error } = await supabase
        .from('bulk_processing_jobs')
        .select('status, processed_files, total_files, errors')
        .eq('id', jobId)
        .single()

      if (!error && data) {
        setProgress({
          status: data.status,
          processedFiles: data.processed_files || 0,
          totalFiles: data.total_files || 0,
          errors: data.errors || []
        })
      }
      setLoading(false)

      // Subscribe to changes
      const channel = supabase
        .channel(`bulk_job_${jobId}_progress`)
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bulk_processing_jobs',
            filter: `id=eq.${jobId}`
          },
          (payload) => {
            setProgress({
              status: payload.new.status,
              processedFiles: payload.new.processed_files || 0,
              totalFiles: payload.new.total_files || 0,
              errors: payload.new.errors || []
            })
          }
        )
        .subscribe()

      return () => supabase.removeChannel(channel)
    }

    const cleanup = setupTracking()
    return () => cleanup.then(fn => fn && fn())
  }, [jobId])

  return { progress, loading }
}

// Hook for dashboard stats with real-time updates
export function useDashboardStats(userId?: string) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let channels: RealtimeChannel[] = []

    const setupDashboard = async () => {
      try {
        // Fetch initial stats
        const response = await fetch('/api/dashboard/stats')
        if (!response.ok) throw new Error('Failed to fetch stats')
        
        const data = await response.json()
        setStats(data.stats)

        // Subscribe to invoice changes
        const invoiceChannel = supabase
          .channel('dashboard_invoices')
          .on('postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'invoices',
              filter: userId ? `user_id=eq.${userId}` : undefined
            },
            () => {
              // Refetch stats when invoices change
              fetch('/api/dashboard/stats')
                .then(res => res.json())
                .then(data => setStats(data.stats))
                .catch(console.error)
            }
          )
          .subscribe()

        // Subscribe to transmission changes
        const transmissionChannel = supabase
          .channel('dashboard_transmissions')
          .on('postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'transmissions',
              filter: userId ? `user_id=eq.${userId}` : undefined
            },
            () => {
              // Refetch stats when transmissions change
              fetch('/api/dashboard/stats')
                .then(res => res.json())
                .then(data => setStats(data.stats))
                .catch(console.error)
            }
          )
          .subscribe()

        channels = [invoiceChannel, transmissionChannel]

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    setupDashboard()

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }, [userId])

  return { stats, loading, error }
}