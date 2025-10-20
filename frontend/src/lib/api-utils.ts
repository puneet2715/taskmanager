/**
 * Get the appropriate API URL for server-side requests
 * Uses internal Docker network URL when available, falls back to public URL
 */
export function getInternalApiUrl(): string {
  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
}

/**
 * Get the public API URL for client-side requests
 */
export function getPublicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
}