'use client'

import { ReactNode, useState } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from './Sidebar'
import Header from './Header'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import AsyncErrorBoundary from '@/components/common/AsyncErrorBoundary'
import ConnectionStatusWrapper from '@/components/common/ConnectionStatusWrapper'

interface LayoutProps {
  children: ReactNode
  className?: string
}

export default function Layout({ children, className = '' }: LayoutProps) {
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!session) {
    return (
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </div>
        )}

        {/* Sidebar */}
        <ErrorBoundary>
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />
        </ErrorBoundary>

        {/* Main content */}
        <div className="lg:pl-64 flex flex-col flex-1">
          <ErrorBoundary>
            <Header onMenuClick={() => setSidebarOpen(true)} />
          </ErrorBoundary>
          
          <main className="flex-1">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Connection status indicator */}
                <div className="mb-4">
                  <ConnectionStatusWrapper className="w-fit" />
                </div>
                
                {/* Main content with async error boundary */}
                <AsyncErrorBoundary>
                  {children}
                </AsyncErrorBoundary>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}