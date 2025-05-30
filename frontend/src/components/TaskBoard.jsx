"use client";
import React, { useState, useCallback, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import TaskCard from "./TaskCard";
import CreateTaskModal from "./CreateTaskModal";
import EditTaskModal from "./EditTaskModal";
import { createTask, updateTask, deleteTask } from "../services/api";
import { useToast } from "../hooks/useToast";

// Debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const TaskBoard = ({ project, users, tasks, onTasksChange }) => {
  const { addToast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false);

  // Keep track of pending updates to send to server
  const pendingUpdatesRef = useRef(new Map());
  const pendingDeletesRef = useRef(new Set());

  // Debounced function to sync pending changes with server
  const debouncedSync = useCallback(
    debounce(async () => {
      // Process pending updates
      const updates = Array.from(pendingUpdatesRef.current.entries());
      if (updates.length > 0) {
        try {
          await Promise.all(
            updates.map(([taskId, taskData]) => updateTask(taskId, taskData))
          );
          pendingUpdatesRef.current.clear();
          addToast("Success!", "Task updated  ", "success");
        } catch (error) {
          console.error("Failed to sync task updates:", error);
          // Optionally revert optimistic updates or show error
        }
      }

      // Process pending deletes
      const deletes = Array.from(pendingDeletesRef.current);
      if (deletes.length > 0) {
        try {
          await Promise.all(deletes.map((taskId) => deleteTask(taskId)));
          pendingDeletesRef.current.clear();
          addToast("Success", "Task Deleted  ", "success");
        } catch (error) {
          addToast("Error!", "Error Deleting Task", "error");
          console.error("Failed to delete tasks:", error);
          // Optionally restore deleted tasks or show error
        }
      }
    }, 500), // Wait 500ms after user stops interacting
    []
  );

  // Optimistic update function for status changes
  const optimisticStatusUpdate = useCallback(
    (taskId, newStatus) => {
      onTasksChange((prevTasks) => {
        const updatedTasks = prevTasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        );

        // Queue for server update
        const taskToUpdate = updatedTasks.find((t) => t.id === taskId);
        if (taskToUpdate) {
          pendingUpdatesRef.current.set(taskId, taskToUpdate);
          debouncedSync();
        }

        return updatedTasks;
      });
    },
    [debouncedSync, onTasksChange]
  );

  // Optimistic delete function
  const optimisticTaskDelete = useCallback(
    (taskId) => {
      onTasksChange((prevTasks) => {
        const filteredTasks = prevTasks.filter((t) => t.id !== taskId);

        // Queue for server delete
        pendingDeletesRef.current.add(taskId);
        debouncedSync();

        return filteredTasks;
      });
    },
    [debouncedSync, onTasksChange]
  );

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    if (draggedTask && !isOverDeleteZone) {
      // Optimistically update UI immediately
      optimisticStatusUpdate(draggedTask.id, status);
      setDraggedTask(null);
    }
  };

  // Delete zone handlers
  const handleDeleteZoneDragOver = useCallback((e) => {
    e.preventDefault();
    setIsOverDeleteZone(true);
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDeleteZoneDragLeave = useCallback((e) => {
    // Only hide if actually leaving the delete zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsOverDeleteZone(false);
    }
  }, []);

  const handleDeleteZoneDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (draggedTask) {
        optimisticTaskDelete(draggedTask.id);
        setDraggedTask(null);
      }
      setIsOverDeleteZone(false);
    },
    [draggedTask, optimisticTaskDelete]
  );

  const handleTaskUpdate = async (updatedTask) => {
    try {
      const response = await updateTask(updatedTask.id, updatedTask);
      const updatedTaskWithName = {
        ...response,
        assigneeName:
          users.find((u) => u.id === response.assigned_to)?.username ||
          "Unassigned",
      };
      onTasksChange((prevTasks) =>
        prevTasks.map((task) =>
          task.id === response.id ? updatedTaskWithName : task
        )
      );
      setIsEditModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const newTask = await createTask({
        ...taskData,
        project_id: project.id,
        status: "todo",
      });
      const newTaskWithName = {
        ...newTask,
        assigneeName:
          users.find((u) => u.id === newTask.assigned_to)?.username ||
          "Unassigned",
      };
      onTasksChange((prevTasks) => [...prevTasks, newTaskWithName]);
      setIsCreateModalOpen(false);
      addToast("Success!", "Task Created  ", "success");
    } catch (error) {
      addToast("Error!", "Error Creating Task  ", "error");
      console.error("Failed to create task:", error);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const sections = [
    { id: "todo", title: "To Do", color: "bg-gray-100" },
    { id: "in_progress", title: "In Progress", color: "bg-blue-50" },
    { id: "done", title: "Done", color: "bg-green-50" },
  ];

  const getTasksByStatus = (status) => {
    return tasks.filter((task) => task.status === status) || [];
  };

  // Get summary stats for the dashboard
  const getTaskStats = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (task) => task.status === "done"
    ).length;
    const overdueTasks = tasks.filter((task) => {
      if (!task.deadline) return false;
      return new Date(task.deadline) < new Date();
    }).length;

    return { totalTasks, completedTasks, overdueTasks };
  };

  const { totalTasks, completedTasks, overdueTasks } = getTaskStats();

  return (
    <div className="flex-1">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>
              {totalTasks} total task{totalTasks !== 1 ? "s" : ""}
            </span>
            <span className="text-green-600">{completedTasks} completed</span>
            {overdueTasks > 0 && (
              <span className="text-red-600">{overdueTasks} overdue</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Task
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {sections.map((section) => (
          <div
            key={section.id}
            className={`${section.color} p-4 rounded-lg min-h-[400px]`}
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
                  className="cursor-move hover:scale-105 transition-transform duration-200"
                >
                  <TaskCard task={task} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Zone */}
      <div
        className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
          draggedTask
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div
          className={`flex items-center gap-3 px-6 py-4 rounded-full shadow-lg transition-all duration-200 ${
            isOverDeleteZone
              ? "bg-red-500 text-white scale-110"
              : "bg-red-100 text-red-600 border-2 border-red-300 border-dashed"
          }`}
          onDragOver={handleDeleteZoneDragOver}
          onDragLeave={handleDeleteZoneDragLeave}
          onDrop={handleDeleteZoneDrop}
        >
          <Trash2 size={20} />
          <span className="font-medium">
            {isOverDeleteZone ? "Release to delete" : "Drop here to delete"}
          </span>
        </div>
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
