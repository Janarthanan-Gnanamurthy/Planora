'use client';
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';

const TaskBoard = ({ project, onTaskUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    if (draggedTask) {
      const updatedTask = { ...draggedTask, status };
      onTaskUpdate(updatedTask);
      setDraggedTask(null);
    }
  };

  const sections = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
    { id: 'doing', title: 'In Progress', color: 'bg-blue-50' },
    { id: 'done', title: 'Done', color: 'bg-green-50' },
  ];

  const getTasksByStatus = (status) => {
    return project.tasks.filter((task) => task.status === status);
  };

  return (
    <div className="flex-1 p-6 ml-64">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Task
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {sections.map((section) => (
          <div
            key={section.id}
            className={`${section.color} p-4 rounded-lg`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, section.id)}
          >
            <h2 className="font-semibold text-gray-700 mb-4">{section.title}</h2>
            <div className="space-y-3">
              {getTasksByStatus(section.id).map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                >
                  <TaskCard task={task} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={(taskData) => {
          const newTask = {
            ...taskData,
            id: Date.now().toString(),
            status: 'todo',
          };
          onTaskUpdate(newTask);
          setIsModalOpen(false);
        }}
        projectUsers={project.users || []}
      />
    </div>
  );
};

export default TaskBoard; 