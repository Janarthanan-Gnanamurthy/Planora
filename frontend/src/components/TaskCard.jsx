'use client';
import React from 'react';
import { Calendar, User } from 'lucide-react';

const getPriorityColor = (priority) => {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

const TaskCard = ({ task, draggable = true }) => {
  return (
    <div
      draggable={draggable}
      className="bg-white p-4 rounded-lg shadow-md cursor-grab active:cursor-grabbing"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-800">{task.name}</h3>
        <span
          className={`${getPriorityColor(
            task.priority
          )} px-2 py-1 text-xs text-white rounded-full`}
        >
          {task.priority}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center text-gray-600">
          <User size={16} className="mr-2" />
          <span className="text-sm">{task.assignee}</span>
        </div>
        
        <div className="flex items-center text-gray-600">
          <Calendar size={16} className="mr-2" />
          <span className="text-sm">
            {new Date(task.deadline).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TaskCard; 