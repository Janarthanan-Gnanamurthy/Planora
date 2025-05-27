'use client';
import React, { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import useStore from '../store/useStore';
import { useRouter } from 'next/navigation';

const Sidebar = () => {
  const { user } = useUser();
  const router = useRouter();
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  
  const { projects, addProject, setSelectedProject, selectedProjectId, getSelectedProject } = useStore();
  const selectedProject = getSelectedProject();

  const getInitials = (name) => {
    // Handle undefined, null, or empty name
    if (!name || typeof name !== 'string') {
      return '?'; // Return a fallback character
    }
    
    return name.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const handleAddProject = (e) => {
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
      addProject(newProject);
      setNewProjectName('');
      setIsAddingProject(false);
      router.push(`/project/${newProject.id}`);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedProjectId) return;

    try {
      setInviteStatus('sending');
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          projectId: selectedProjectId,
          projectName: selectedProject.name,
          inviterName: user.fullName,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setInviteStatus('success');
        setTimeout(() => {
          setInviteEmail('');
          setShowInviteModal(false);
          setInviteStatus('');
        }, 2000);
      } else {
        setInviteStatus('error');
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      setInviteStatus('error');
    }
  };

  return (
    <div className="w-64 h-screen bg-gray-900 text-white p-4 fixed left-0 top-0 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-xl font-bold">Projects</h2>
        <div className="mt-4 space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => {
                setSelectedProject(project.id);
                router.push(`/project/${project.id}`);
              }}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedProjectId === project.id
                  ? 'bg-blue-600'
                  : 'hover:bg-gray-800'
              }`}
            >
              <h3 className="font-medium">{project.name}</h3>
              <div className="mt-2 flex flex-wrap gap-1">
              {project.collaborators?.map((collaborator, index) => (
  <div
    key={collaborator.id || `collaborator-${index}`}
    className="bg-gray-700 px-2 py-1 rounded text-xs"
    title={collaborator.name || 'Unknown User'}
  >
    {getInitials(collaborator.name || 'Unknown User')}
  </div>
))}
                
              </div>
            </div>
          ))}
        </div>

        {isAddingProject ? (
          <form onSubmit={handleAddProject} className="mt-4">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name"
              className="w-full p-2 rounded bg-gray-800 text-white"
              autoFocus
            />
            <div className="mt-2 space-x-2">
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAddingProject(false)}
                className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingProject(true)}
            className="mt-4 w-full p-2 flex items-center justify-center gap-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={20} />
            Add Project
          </button>
        )}
      </div>

      {selectedProjectId && (
        <div className="mt-auto pt-4 border-t border-gray-800">
          <button
            onClick={() => setShowInviteModal(true)}
            className="w-full p-2 flex items-center justify-center gap-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Users size={20} />
            Invite Collaborators
          </button>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Invite Collaborator
            </h3>
            <form onSubmit={handleInviteSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Enter email address"
                  required
                  disabled={inviteStatus === 'sending'}
                />
              </div>
              {inviteStatus === 'success' && (
                <div className="mb-4 text-green-600">
                  Invitation sent successfully!
                </div>
              )}
              {inviteStatus === 'error' && (
                <div className="mb-4 text-red-600">
                  Failed to send invitation. Please try again.
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteStatus('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteStatus === 'sending'}
                  className={`px-4 py-2 text-white rounded ${
                    inviteStatus === 'sending'
                      ? 'bg-blue-400'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {inviteStatus === 'sending' ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar; 