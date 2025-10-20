'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode, ComponentType } from 'react'

interface AuthGuardProps {
  children: ReactNode
  fallbackUrl?: string
  loadingComponent?: ReactNode
  unauthorizedComponent?: ReactNode
}

// interface WithAuthGuardProps {}

// HOC version for wrapping components
// export function withAuthGuard<P extends WithAuthGuardProps>(
export function withAuthGuard<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: {
    fallbackUrl?: string
    loadingComponent?: ReactNode
    unauthorizedComponent?: ReactNode
  } = {}
) {
  const {
    fallbackUrl = '/auth/signin',
    loadingComponent = (
      <div className="min-h-screen flex items-center justify-center" data-testid="auth-loading">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    ),
    unauthorizedComponent = null
  } = options

  return function AuthGuardedComponent(props: P) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
      if (status === 'loading') return // Still loading

      if (status === 'unauthenticated') {
        router.push(fallbackUrl)
        return
      }
    }, [session, status, router])

    if (status === 'loading') {
      return <>{loadingComponent}</>
    }

    if (status === 'unauthenticated') {
      return <>{unauthorizedComponent}</>
    }

    return <WrappedComponent {...props} />
  }
}

// Component version for wrapping JSX
export default function AuthGuard({
  children,
  fallbackUrl = '/auth/signin',
  loadingComponent = (
    <div className="min-h-screen flex items-center justify-center" data-testid="auth-loading">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
    </div>
  ),
  unauthorizedComponent = null
}: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (status === 'unauthenticated') {
      router.push(fallbackUrl)
      return
    }
  }, [session, status, router, fallbackUrl])

  if (status === 'loading') {
    return <>{loadingComponent}</>
  }

  if (status === 'unauthenticated') {
    return <>{unauthorizedComponent}</>
  }

  return <>{children}</>
}