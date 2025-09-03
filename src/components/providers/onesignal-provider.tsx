'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Only initialize OneSignal for authenticated users and after auth is complete
    if (!loading && user && !initialized) {
      // Lazy load OneSignal service
      import('@/lib/onesignal').then(({ oneSignalService }) => {
        oneSignalService.initialize()
        setInitialized(true)
      }).catch(error => {
        console.warn('Failed to load OneSignal:', error)
      })
    }
  }, [user, loading, initialized])

  return <>{children}</>
}