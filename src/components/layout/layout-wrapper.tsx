'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { usePathname } from 'next/navigation'
import { Suspense, lazy } from 'react'

// Lazy load the layout component
const Layout = lazy(() => import('./layout').then(module => ({ default: module.Layout })))

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  // Don't show navigation on auth pages
  const isAuthPage = pathname === '/auth/login' || pathname === '/auth/register'
  
  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Show children without layout for auth pages or when not authenticated
  if (isAuthPage || !user) {
    return <>{children}</>
  }

  // Show full layout for authenticated pages with suspense boundary
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <Layout>{children}</Layout>
    </Suspense>
  )
}