"use client";
import React from 'react';
import { useUser } from '@clerk/nextjs';
import useStore from '@/store/useStore';
import TaskBoard from '@/components/TaskBoard';
import { Calendar } from 'lucide-react';

export default function Dashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { selectedProjectId, getSelectedProject } = useStore();
  const selectedProject = getSelectedProject();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Please sign in to continue</h2>
          <p className="mt-2 text-gray-600">You need to be signed in to access this page</p>
        </div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Good {getTimeOfDay()}, {user.fullName}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {getGreeting()}
          </p>
          <div className="flex items-center justify-center space-x-4 text-gray-500">
            <Calendar size={24} />
            <span>{new Date().toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>
          <div className="mt-12 p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Get Started
            </h2>
            <p className="text-gray-600">
              Create your first project by clicking the "Add Project" button in the sidebar.
              You can then:
            </p>
            <ul className="mt-4 text-left text-gray-600 space-y-2">
              <li>• Create and manage tasks</li>
              <li>• Organize tasks by status</li>
              <li>• Invite collaborators</li>
              <li>• Track progress</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return <TaskBoard project={selectedProject} />;
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getGreeting() {
  const greetings = [
    'Ready to tackle your projects?',
    'Let\'s make progress today!',
    'What would you like to achieve today?',
    'Time to turn ideas into reality!',
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}
