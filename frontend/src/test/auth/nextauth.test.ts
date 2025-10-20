import { authOptions } from '@/lib/auth'

describe('NextAuth Configuration', () => {
  it('should have correct providers configured', () => {
    expect(authOptions.providers).toHaveLength(3)
    
    const providerIds = authOptions.providers.map(provider => provider.id)
    expect(providerIds).toContain('credentials')
    expect(providerIds).toContain('github')
    expect(providerIds).toContain('google')
  })

  it('should use JWT strategy', () => {
    expect(authOptions.session?.strategy).toBe('jwt')
  })

  it('should have custom pages configured', () => {
    expect(authOptions.pages?.signIn).toBe('/auth/signin')
    expect(authOptions.pages?.signUp).toBe('/auth/signup')
    expect(authOptions.pages?.error).toBe('/auth/error')
  })

  it('should have JWT and session max age configured', () => {
    expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60) // 30 days
    expect(authOptions.jwt?.maxAge).toBe(30 * 24 * 60 * 60) // 30 days
  })
})