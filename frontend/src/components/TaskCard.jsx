'use client';
import React from 'react';
import { User } from 'lucide-react';

const TaskCard = ({ task, draggable = true }) => {
  return (
    <div
      draggable={draggable}
      className="bg-white p-4 rounded-lg shadow-md cursor-grab active:cursor-grabbing hover:shadow-lg transition-shadow"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-800">{task.title}</h3>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center text-gray-600">
          <User size={16} className="mr-2 flex-shrink-0" />
          <span className="text-sm truncate" title={task.assigneeName}>
            {task.assigneeName}
          </span>
        </div>
        
        {task.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
        )}
      </div>
    </div>
  );
};

export default TaskCard; 