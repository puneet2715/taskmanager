'use client'

import { useSession } from 'next-auth/react'
import { ReactNode } from 'react'
import { UserRole, hasRole, getUserFromSession } from '@/lib/auth-utils'

interface RoleGuardProps {
  children: ReactNode
  requiredRole: UserRole
  fallback?: ReactNode
}

export default function RoleGuard({
  children,
  requiredRole,
  fallback = null,
}: RoleGuardProps) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <>{fallback}</>
  }

  if (status === 'unauthenticated') {
    return <>{fallback}</>
  }

  const user = getUserFromSession(session)
  if (!hasRole(user, requiredRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}