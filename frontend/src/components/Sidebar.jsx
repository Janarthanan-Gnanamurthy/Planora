'use client';
import React, { useState } from 'react';
import { Plus } from 'lucide-react';

const Sidebar = ({ projects, onProjectSelect, onProjectAdd }) => {
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleAddProject = (e) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onProjectAdd(newProjectName);
      setNewProjectName('');
      setIsAddingProject(false);
    }
  };

  return (
    <div className="w-64 h-screen bg-gray-900 text-white p-4 fixed left-0 top-0">
      <h2 className="text-xl font-bold mb-6">Projects</h2>
      
      <div className="space-y-2">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => onProjectSelect(project)}
            className="p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
          >
            <h3 className="font-medium">{project.name}</h3>
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
  );
};

export default Sidebar; 