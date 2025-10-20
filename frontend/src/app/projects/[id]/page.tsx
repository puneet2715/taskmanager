import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import ProjectDetailClient from './ProjectDetailClient';

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Project - TaskFlow',
  description: 'Manage your project tasks with real-time collaboration.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <ProjectDetailClient 
      projectId={id}
      user={session.user}
    />
  );
}