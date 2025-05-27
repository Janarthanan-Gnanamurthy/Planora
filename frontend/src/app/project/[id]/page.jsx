'use client';
import React, { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import useStore from '@/store/useStore';
import TaskBoard from '@/components/TaskBoard';

export default function ProjectPage({ params }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const { setSelectedProject, getSelectedProject } = useStore();
  const project = getSelectedProject();
  const projectId = React.use(params).id;

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    setSelectedProject(projectId);
  }, [isLoaded, isSignedIn, projectId, setSelectedProject]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null; // Router will handle redirect
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Project Not Found</h1>
          <p className="text-gray-600">This project doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">{project.name}</h1>
          <div className="mt-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Team Members</h2>
            <div className="flex flex-wrap gap-2">
              {project.collaborators?.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center bg-white px-3 py-2 rounded-full shadow-sm"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                    {collaborator.name?.charAt(0) || '?'}
                  </div>
                  <span className="ml-2 text-gray-700">{collaborator.email || 'Unknown User'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <TaskBoard project={project} />
      </div>
    </div>
  );
} 