import { useEffect, useState } from 'react'
import { oneSignalService } from '@/lib/onesignal'

export function useOneSignal() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const initializeOneSignal = async () => {
      try {
        await oneSignalService.initialize()
        setIsInitialized(true)

        // Check if permission already granted
        if ('Notification' in window) {
          setPermissionGranted(Notification.permission === 'granted')
        }

        // Get user ID if available
        const id = await oneSignalService.getUserId()
        setUserId(id)
      } catch (error) {
        console.error('Failed to initialize OneSignal:', error)
      }
    }

    initializeOneSignal()
  }, [])

  const requestPermission = async (): Promise<boolean> => {
    try {
      const granted = await oneSignalService.requestPermission()
      setPermissionGranted(granted)
      
      if (granted) {
        const id = await oneSignalService.getUserId()
        setUserId(id)
      }
      
      return granted
    } catch (error) {
      console.error('Failed to request permission:', error)
      return false
    }
  }

  const sendNotification = async (payload: Record<string, string | number | boolean | object>): Promise<boolean> => {
    return oneSignalService.sendNotification(payload)
  }

  return {
    isInitialized,
    permissionGranted,
    userId,
    requestPermission,
    sendNotification,
    oneSignalService,
  }
}