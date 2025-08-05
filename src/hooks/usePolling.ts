import { useEffect, useRef, useCallback } from 'react'

interface UsePollingOptions {
  interval: number
  enabled?: boolean
  immediate?: boolean
}

export function usePolling(callback: () => void | Promise<void>, options: UsePollingOptions) {
  const { interval, enabled = true, immediate = true } = options
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const startPolling = useCallback(() => {
    if (intervalRef.current) return // Already polling

    if (immediate) {
      callbackRef.current()
    }

    intervalRef.current = setInterval(() => {
      callbackRef.current()
    }, interval)
  }, [interval, immediate])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      startPolling()
    } else {
      stopPolling()
    }

    return stopPolling
  }, [enabled, startPolling, stopPolling])

  useEffect(() => {
    return stopPolling
  }, [stopPolling])

  return { startPolling, stopPolling }
}