'use client';
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import EditTaskModal from './EditTaskModal';
import { createTask, getTasks, updateTask } from '../services/api';

const TaskBoard = ({ project, users }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasksList = await getTasks({ project_id: project.id });
        setTasks(tasksList);
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      }
    };

    fetchTasks();
  }, [project.id]);

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, status) => {
    e.preventDefault();
    if (draggedTask) {
      const updatedTask = { ...draggedTask, status };
      await handleTaskUpdate(updatedTask);
      setDraggedTask(null);
    }
  };

  const handleTaskUpdate = async (updatedTask) => {
    try {
      const response = await updateTask(updatedTask.id, updatedTask);
      setTasks(tasks.map(task => task.id === response.id ? response : task));
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const newTask = await createTask({
        ...taskData,
        project_id: project.id,
        status: 'todo',
      });
      setTasks([...tasks, newTask]);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const sections = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50' },
    { id: 'done', title: 'Done', color: 'bg-green-50' },
  ];

  const getTasksByStatus = (status) => {
    return tasks.filter((task) => task.status === status) || [];
  };

  const getAssigneeName = (assigneeId) => {
    const assignee = users.find(u => u.id === assigneeId);
    return assignee?.username || 'Unassigned';
  };

  return (
    <div className="flex-1 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tasks</h1>
          <p className="text-gray-600 mt-1">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
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
                      assigneeName: getAssigneeName(task.assigned_to)
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
        projectUsers={users}
      />

      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        onSubmit={handleTaskUpdate}
        task={selectedTask}
        projectUsers={users}
      />
    </div>
  );
};

export default TaskBoard; 