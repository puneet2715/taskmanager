'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useProjects } from '@/hooks/useProjects'
import { 
  HomeIcon, 
  FolderIcon, 
  PlusIcon,
  ChevronRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import Image from 'next/image'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  current?: boolean
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { data: projects = [], isLoading: projectsLoading } = useProjects()

  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      current: pathname === '/dashboard'
    },
  ]

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    lg:translate-x-0 lg:static lg:inset-0
  `

  return (
    <div className={sidebarClasses}>
      <div className="flex flex-col h-full">
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TM</span>
              </div>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-gray-900">Task Manager</h1>
            </div>
          </div>
          
          {/* Close button for mobile */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            onClick={onClose}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                ${item.current
                  ? 'bg-indigo-100 text-indigo-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
              onClick={onClose}
            >
              <item.icon
                className={`
                  mr-3 h-6 w-6 flex-shrink-0
                  ${item.current ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
                `}
              />
              {item.name}
            </Link>
          ))}

          {/* Projects section */}
          <div className="pt-6">
            <div className="flex items-center justify-between px-2 mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Projects
              </h3>
              <Link
                href="/projects/new"
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                title="Create new project"
              >
                <PlusIcon className="h-4 w-4" />
              </Link>
            </div>

            {projectsLoading ? (
              <div className="px-2 py-2">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ) : projects.length > 0 ? (
              <div className="space-y-1">
                {projects.map((project) => (
                  <Link
                    key={project._id}
                    href={`/projects/${project._id}`}
                    className={`
                      group flex items-center px-2 py-2 text-sm rounded-md transition-colors
                      ${pathname === `/projects/${project._id}`
                        ? 'bg-indigo-100 text-indigo-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                    onClick={onClose}
                  >
                    <FolderIcon
                      className={`
                        mr-3 h-5 w-5 flex-shrink-0
                        ${pathname === `/projects/${project._id}` 
                          ? 'text-indigo-500' 
                          : 'text-gray-400 group-hover:text-gray-500'
                        }
                      `}
                    />
                    <span className="truncate">{project.name}</span>
                    <ChevronRightIcon className="ml-auto h-4 w-4 text-gray-400" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-2 py-4 text-sm text-gray-500">
                <p>No projects yet.</p>
                <Link
                  href="/projects/new"
                  className="text-indigo-600 hover:text-indigo-500 font-medium"
                  onClick={onClose}
                >
                  Create your first project
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* User info */}
        {session?.user && (
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {(session.user as any)?.image ? (
                  <Image
                    className="h-8 w-8 rounded-full"
                    src={(session.user as any).image}
                    alt={session.user.name || 'User avatar'}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {session.user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}