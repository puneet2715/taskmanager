'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { UserRole, hasRole, getUserFromSession } from '@/lib/auth-utils'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: UserRole
  fallbackUrl?: string
  loadingComponent?: ReactNode
}

export default function ProtectedRoute({
  children,
  requiredRole,
  fallbackUrl = '/auth/signin',
  loadingComponent = <div>Loading...</div>,
}: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (status === 'unauthenticated') {
      router.push(fallbackUrl)
      return
    }

    if (requiredRole && session) {
      const user = getUserFromSession(session)
      if (!hasRole(user, requiredRole)) {
        router.push('/dashboard') // Redirect to dashboard if insufficient permissions
        return
      }
    }
  }, [session, status, router, requiredRole, fallbackUrl])

  if (status === 'loading') {
    return <>{loadingComponent}</>
  }

  if (status === 'unauthenticated') {
    return null // Will redirect
  }

  if (requiredRole && session) {
    const user = getUserFromSession(session)
    if (!hasRole(user, requiredRole)) {
      return null // Will redirect
    }
  }

  return <>{children}</>
}