import { Session } from 'next-auth'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth'

export type UserRole = 'admin' | 'user'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser | null, requiredRole: UserRole): boolean {
  if (!user) return false
  
  if (requiredRole === 'admin') {
    return user.role === 'admin'
  }
  
  return user.role === 'admin' || user.role === 'user'
}

/**
 * Check if user is admin
 */
export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, 'admin')
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(user: AuthUser | null): boolean {
  return user !== null
}

/**
 * Get user from session
 */
export function getUserFromSession(session: Session | null): AuthUser | null {
  if (!session?.user) return null
  
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as UserRole,
  }
}

/**
 * Server-side function to get current user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions)
  return getUserFromSession(session)
}

/**
 * Server-side function to require authentication
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * Server-side function to require admin role
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (!isAdmin(user)) {
    throw new Error('Admin access required')
  }
  return user
}

/**
 * Server-side function to require specific role
 */
export async function requireRole(requiredRole: UserRole): Promise<AuthUser> {
  const user = await requireAuth()
  if (!hasRole(user, requiredRole)) {
    throw new Error(`${requiredRole} access required`)
  }
  return user
}