'use client';
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Plus } from 'lucide-react';
import useStore from '../../store/useStore';
import { useRouter } from 'next/navigation';

export default function ProjectPage() {
  const { user } = useUser();
  const router = useRouter();
  const { projects } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      const newProject = {
        id: Date.now().toString(),
        name: newProjectName,
        tasks: [],
        createdBy: {
          id: user.id,
          name: user.fullName,
          email: user.primaryEmailAddress.emailAddress
        },
      };
      useStore.getState().addProject(newProject);
      setNewProjectName('');
      setIsCreating(false);
      router.push(`/project/${newProject.id}`);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Projects</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                className="w-full p-2 border rounded-md mb-4"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => router.push(`/project/${project.id}`)}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{project.name}</h3>
            <div className="flex items-center text-gray-600">
              <span className="text-sm">
                {project.tasks?.length || 0} tasks
              </span>
              <span className="mx-2">•</span>
              <span className="text-sm">
                {project.collaborators?.length || 0} members
              </span>
            </div>
            <div className="mt-4 flex -space-x-2">
              {project.collaborators?.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm border-2 border-white"
                  title={collaborator.name}
                >
                  {collaborator.name.charAt(0)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 