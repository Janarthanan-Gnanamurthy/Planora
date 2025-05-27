'use client';
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import EditTaskModal from './EditTaskModal';
import useStore from '../store/useStore';

const TaskBoard = ({ project }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  
  const { addTask, updateTask } = useStore();

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
      handleTaskUpdate(updatedTask);
      setDraggedTask(null);
    }
  };

  const handleTaskUpdate = (updatedTask) => {
    updateTask(project.id, updatedTask);
  };

  const handleCreateTask = (taskData) => {
    const newTask = {
      ...taskData,
      status: 'todo',
    };
    addTask(project.id, newTask);
    setIsCreateModalOpen(false);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const sections = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
    { id: 'doing', title: 'In Progress', color: 'bg-blue-50' },
    { id: 'done', title: 'Done', color: 'bg-green-50' },
  ];

  const getTasksByStatus = (status) => {
    return project.tasks?.filter((task) => task.status === status) || [];
  };

  const getAssigneeName = (assigneeId) => {
    const collaborator = project.collaborators?.find(c => c.id === assigneeId);
    return collaborator?.name || 'Unassigned';
  };

  return (
    <div className="flex-1 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-gray-600 mt-1">
            {project.collaborators?.length || 0} team member{project.collaborators?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
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
            <h2 className="font-semibold text-gray-700 mb-4">
              {section.title}
              <span className="ml-2 text-sm text-gray-500">
                ({getTasksByStatus(section.id).length})
              </span>
            </h2>
            <div className="space-y-3">
              {getTasksByStatus(section.id).map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onClick={() => handleTaskClick(task)}
                >
                  <TaskCard 
                    task={{
                      ...task,
                      assigneeName: getAssigneeName(task.assignee)
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
        projectUsers={project.collaborators || []}
      />

      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        onSubmit={handleTaskUpdate}
        task={selectedTask}
        projectUsers={project.collaborators || []}
      />
    </div>
  );
};

export default TaskBoard; 