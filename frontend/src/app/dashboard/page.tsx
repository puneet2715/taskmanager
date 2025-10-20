import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Project } from '@/types/api';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard - TaskFlow',
  description: 'Your personal task management dashboard with real-time project updates and team collaboration.',
  robots: {
    index: false, // Dashboard should not be indexed
    follow: false,
  },
};

async function getProjects(accessToken: string): Promise<Project[]> {
  try {
    const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/projects`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Ensure fresh data on each request
    });

    if (!response.ok) {
      console.error('Failed to fetch projects:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
    
    console.error('Invalid response format:', data);
    return [];
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Fetch user projects on the server side using the access token
  const projects = session.accessToken ? await getProjects(session.accessToken) : [];

  return (
    <DashboardClient 
      user={session.user} 
      initialProjects={projects}
    />
  );
}