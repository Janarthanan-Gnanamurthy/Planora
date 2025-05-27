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
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <div
      draggable={draggable}
      className="bg-white p-4 rounded-lg shadow-md cursor-grab active:cursor-grabbing hover:shadow-lg transition-shadow"
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
          <User size={16} className="mr-2 flex-shrink-0" />
          <span className="text-sm truncate" title={task.assigneeName}>
            {task.assigneeName}
          </span>
        </div>
        
        <div className="flex items-center text-gray-600">
          <Calendar size={16} className="mr-2 flex-shrink-0" />
          <span className="text-sm">
            {formatDate(task.deadline)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TaskCard; 