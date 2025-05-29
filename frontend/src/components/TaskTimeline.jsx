"use client";
import React, { useState, useCallback, useRef } from "react";
import {
  Calendar,
  Clock,
  User,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import CreateTaskModal from "./CreateTaskModal";
import EditTaskModal from "./EditTaskModal";
import { createTask, updateTask, deleteTask } from "../services/api";

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

const TaskTimeline = ({ project, users, tasks, onTasksChange }) => {
  const [collapsedSections, setCollapsedSections] = useState({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false);
  const [timelineRange, setTimelineRange] = useState(90); // Default 90 days
  const [viewMode, setViewMode] = useState("weeks"); // 'weeks', 'days', 'months'

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
        } catch (error) {
          console.error("Failed to sync task updates:", error);
        }
      }

      // Process pending deletes
      const deletes = Array.from(pendingDeletesRef.current);
      if (deletes.length > 0) {
        try {
          await Promise.all(deletes.map((taskId) => deleteTask(taskId)));
          pendingDeletesRef.current.clear();
        } catch (error) {
          console.error("Failed to delete tasks:", error);
        }
      }
    }, 500),
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

  // Generate timeline dates based on range
  const generateTimelineDates = () => {
    const dates = [];
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);

    for (let i = 0; i < timelineRange; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const timelineDates = generateTimelineDates();

  // Group tasks by status
  const tasksByStatus = tasks.reduce((acc, task) => {
    const status = task.status || "todo";
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(task);
    return acc;
  }, {});

  const statusConfig = {
    todo: {
      label: "To Do",
      icon: "○",
      color: "text-slate-600",
      bgColor: "bg-slate-50",
    },
    in_progress: {
      label: "In Progress",
      icon: "◐",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    done: {
      label: "Done",
      icon: "●",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  };

  // Calculate task position and width on timeline
  const getTaskTimelineProps = (task) => {
    if (!task.deadline) return null;

    const today = new Date();
    const deadline = new Date(task.deadline);
    const createdAt = new Date(task.created_at);

    // Calculate start position (days from timeline start)
    const timelineStart = timelineDates[0];
    const startDays = Math.max(
      0,
      Math.floor((createdAt - timelineStart) / (1000 * 60 * 60 * 24))
    );
    const endDays = Math.floor(
      (deadline - timelineStart) / (1000 * 60 * 60 * 24)
    );

    if (endDays < 0 || startDays >= timelineDates.length) return null;

    const duration = Math.max(1, endDays - startDays);
    const leftPercent = (startDays / timelineDates.length) * 100;
    const widthPercent = (duration / timelineDates.length) * 100;

    return {
      left: `${leftPercent}%`,
      width: `${Math.min(widthPercent, 100 - leftPercent)}%`,
      duration,
    };
  };

  const getTaskColor = (task) => {
    const isOverdue = task.deadline && new Date(task.deadline) < new Date();

    if (isOverdue && task.status !== "done") {
      return "bg-gradient-to-r from-red-500 to-red-600 shadow-sm";
    }

    switch (task.priority?.toLowerCase()) {
      case "high":
        return "bg-gradient-to-r from-red-400 to-red-500 shadow-sm";
      case "medium":
        return "bg-gradient-to-r from-amber-400 to-yellow-500 shadow-sm";
      case "low":
        return "bg-gradient-to-r from-emerald-400 to-green-500 shadow-sm";
      default:
        switch (task.status) {
          case "done":
            return "bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm";
          case "in_progress":
            return "bg-gradient-to-r from-purple-400 to-purple-500 shadow-sm";
          default:
            return "bg-gradient-to-r from-slate-400 to-slate-500 shadow-sm";
        }
    }
  };

  const toggleSection = (status) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("default", {
      month: "short",
      day: "numeric",
    });
  };

  // Generate headers based on view mode
  const getTimelineHeaders = () => {
    if (viewMode === "days") {
      return timelineDates.map((date, index) => ({
        key: date.toISOString().split("T")[0],
        start: index,
        end: index,
        label: date.getDate().toString(),
        sublabel:
          date.getDate() === 1
            ? date.toLocaleDateString("default", { month: "short" })
            : "",
        width: (1 / timelineDates.length) * 100,
      }));
    }

    if (viewMode === "months") {
      const months = [];
      let currentMonth = null;

      timelineDates.forEach((date, index) => {
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

        if (!currentMonth || currentMonth.key !== monthKey) {
          currentMonth = {
            key: monthKey,
            start: index,
            end: index,
            label: date.toLocaleDateString("default", { month: "long" }),
            sublabel: date.getFullYear().toString(),
          };
          months.push(currentMonth);
        } else {
          currentMonth.end = index;
        }
      });

      return months.map((month) => ({
        ...month,
        width: ((month.end - month.start + 1) / timelineDates.length) * 100,
      }));
    }

    // Default weeks view
    const weeks = [];
    let currentWeek = null;

    timelineDates.forEach((date, index) => {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!currentWeek || currentWeek.key !== weekKey) {
        currentWeek = {
          key: weekKey,
          start: index,
          end: index,
          label: `${date.getDate()} - ${Math.min(
            date.getDate() + 6,
            new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
          )}`,
          sublabel: date.toLocaleDateString("default", { month: "short" }),
        };
        weeks.push(currentWeek);
      } else {
        currentWeek.end = index;
      }
    });

    return weeks.map((week) => ({
      ...week,
      width: ((week.end - week.start + 1) / timelineDates.length) * 100,
    }));
  };

  const timelineHeaders = getTimelineHeaders();

  // Drag and drop handlers
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

  // Task CRUD handlers
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
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  // Get summary stats
  const getTaskStats = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (task) => task.status === "done"
    ).length;
    const overdueTasks = tasks.filter((task) => {
      if (!task.deadline) return false;
      return new Date(task.deadline) < new Date() && task.status !== "done";
    }).length;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { totalTasks, completedTasks, overdueTasks, completionRate };
  };

  const { totalTasks, completedTasks, overdueTasks, completionRate } =
    getTaskStats();

  return (
    <div className="flex-1 space-y-4 md:space-y-6 p-4 md:p-6 overflow-x-hidden">
      {/* Enhanced Header with stats and controls */}
      <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex flex-col gap-4">
          {/* Stats Section */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="md:w-5 md:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg md:text-2xl font-bold text-gray-900 truncate">
                  {totalTasks}
                </p>
                <p className="text-xs md:text-sm text-gray-600">Total Tasks</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-green-600 rounded-full"></div>
              </div>
              <div className="min-w-0">
                <p className="text-lg md:text-2xl font-bold text-green-600 truncate">
                  {completionRate}%
                </p>
                <p className="text-xs md:text-sm text-gray-600">Completed</p>
              </div>
            </div>

            {overdueTasks > 0 && (
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className="md:w-5 md:h-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-bold text-red-600 truncate">
                    {overdueTasks}
                  </p>
                  <p className="text-xs md:text-sm text-gray-600">Overdue</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls Section */}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-4 border-t border-gray-100">
            {/* Timeline Range Control */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 flex-1 sm:flex-none">
              <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">
                Range:
              </label>
              <select
                value={timelineRange}
                onChange={(e) => setTimelineRange(Number(e.target.value))}
                className="bg-white border border-gray-300 rounded-md px-2 md:px-3 py-1 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1 sm:flex-none"
              >
                <option value={30}>1 Month</option>
                <option value={60}>2 Months</option>
                <option value={90}>3 Months</option>
                <option value={120}>4 Months</option>
                <option value={180}>6 Months</option>
              </select>
            </div>

            {/* View Mode Control */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 flex-1 sm:flex-none">
              <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">
                View:
              </label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="bg-white border border-gray-300 rounded-md px-2 md:px-3 py-1 text-xs md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1 sm:flex-none"
              >
                <option value="weeks">Weeks</option>
                <option value="days">Days</option>
                <option value="months">Months</option>
              </select>
            </div>

            {/* Add Task Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm hover:shadow-md text-sm md:text-base"
            >
              <Plus size={16} className="md:w-[18px] md:h-[18px]" />
              <span className="font-medium">Add Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Timeline Component */}
      <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Timeline Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex">
            {/* Left section for task names */}
            <div className="w-48 sm:w-64 lg:w-80 p-3 md:p-4 border-r border-gray-200 flex-shrink-0">
              <h3 className="font-semibold text-gray-800 text-sm md:text-base">
                Tasks
              </h3>
            </div>

            {/* Timeline dates header */}
            <div className="flex-1 overflow-x-auto">
              <div
                className="flex bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200"
                style={{ minWidth: "600px" }}
              >
                {timelineHeaders.map((header) => (
                  <div
                    key={header.key}
                    className="border-r border-gray-200 text-center py-2 md:py-3 text-xs md:text-sm font-medium text-gray-700 bg-white/50 flex-shrink-0"
                    style={{
                      width: `${header.width}%`,
                      minWidth: viewMode === "days" ? "25px" : "50px",
                    }}
                  >
                    <div className="font-semibold truncate px-1">
                      {header.label}
                    </div>
                    {header.sublabel && (
                      <div className="text-xs text-gray-500 mt-1 truncate px-1">
                        {header.sublabel}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="max-h-[400px] md:max-h-[600px] overflow-y-auto">
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
            <div
              key={status}
              className="border-b border-gray-100 last:border-b-0"
            >
              {/* Enhanced Section Header */}
              <div
                className={`flex items-center px-3 md:px-4 py-3 md:py-4 ${statusConfig[status]?.bgColor} hover:bg-opacity-80 cursor-pointer border-b border-gray-200 transition-colors duration-200`}
                onClick={() => toggleSection(status)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className="w-48 sm:w-64 lg:w-80 flex-shrink-0">
                  <div className="flex items-center">
                    {collapsedSections[status] ? (
                      <ChevronRight
                        size={14}
                        className="md:w-4 md:h-4 mr-2 md:mr-3 text-gray-500 flex-shrink-0"
                      />
                    ) : (
                      <ChevronDown
                        size={14}
                        className="md:w-4 md:h-4 mr-2 md:mr-3 text-gray-500 flex-shrink-0"
                      />
                    )}
                    <span
                      className={`text-lg md:text-xl mr-2 ${statusConfig[status]?.color} flex-shrink-0`}
                    >
                      {statusConfig[status]?.icon}
                    </span>
                    <span
                      className={`font-semibold text-sm md:text-base ${statusConfig[status]?.color} truncate`}
                    >
                      {statusConfig[status]?.label || status}
                    </span>
                    <span className="ml-2 md:ml-3 px-2 py-1 text-xs bg-white/60 text-gray-600 rounded-full font-medium flex-shrink-0">
                      {statusTasks.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Enhanced Tasks */}
              {!collapsedSections[status] &&
                statusTasks.map((task) => {
                  const timelineProps = getTaskTimelineProps(task);
                  const assignedUser = users.find(
                    (u) => u.id === task.assigned_to
                  );
                  const isOverdue =
                    task.deadline &&
                    new Date(task.deadline) < new Date() &&
                    task.status !== "done";

                  return (
                    <div
                      key={task.id}
                      className="flex border-b border-gray-50 hover:bg-gray-50/50 transition-colors duration-200 group"
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                    >
                      {/* Enhanced Task Info */}
                      <div className="w-48 sm:w-64 lg:w-80 p-3 md:p-4 border-r border-gray-200 flex-shrink-0">
                        <div
                          className="cursor-pointer"
                          onClick={() => handleTaskClick(task)}
                        >
                          <h4
                            className={`font-medium text-xs md:text-sm mb-2 line-clamp-2 transition-colors ${
                              isOverdue ? "text-red-700" : "text-gray-800"
                            } group-hover:text-blue-700`}
                          >
                            {task.title}
                          </h4>

                          <div className="flex flex-col gap-1 md:gap-2">
                            <div className="flex items-center bg-gray-100 rounded-full px-2 py-1 w-fit">
                              <User
                                size={10}
                                className="md:w-3 md:h-3 mr-1 flex-shrink-0"
                              />
                              <span className="truncate text-xs font-medium max-w-20 md:max-w-24">
                                {assignedUser?.username ||
                                  task.assigneeName ||
                                  "Unassigned"}
                              </span>
                            </div>
                            {task.deadline && (
                              <div
                                className={`flex items-center rounded-full px-2 py-1 w-fit ${
                                  isOverdue
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                <Calendar
                                  size={10}
                                  className="md:w-3 md:h-3 mr-1 flex-shrink-0"
                                />
                                <span className="font-medium text-xs">
                                  {formatDate(task.deadline)}
                                </span>
                              </div>
                            )}
                          </div>

                          {task.priority && (
                            <span
                              className={`inline-block px-2 py-1 text-xs rounded-full font-medium mt-2 ${
                                task.priority === "high"
                                  ? "bg-red-100 text-red-700"
                                  : task.priority === "medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {task.priority}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Enhanced Timeline Bar */}
                      <div className="flex-1 relative p-3 md:p-4 overflow-hidden">
                        <div
                          className="relative h-6 md:h-8 bg-gray-100 rounded-lg overflow-hidden"
                          style={{ minWidth: "600px" }}
                        >
                          {/* Grid lines */}
                          <div className="absolute inset-0 flex">
                            {timelineHeaders.map((header) => (
                              <div
                                key={header.key}
                                className="border-r border-gray-200 h-full flex-shrink-0"
                                style={{ width: `${header.width}%` }}
                              />
                            ))}
                          </div>

                          {/* Enhanced Task Bar */}
                          {timelineProps && (
                            <div
                              className={`absolute top-0.5 md:top-1 bottom-0.5 md:bottom-1 rounded-md ${getTaskColor(
                                task
                              )} hover:scale-105 cursor-pointer transition-all duration-200 group-hover:shadow-md z-10`}
                              style={{
                                left: timelineProps.left,
                                width: timelineProps.width,
                              }}
                              onClick={() => handleTaskClick(task)}
                              title={`${task.title} - ${
                                task.deadline
                                  ? formatDate(task.deadline)
                                  : "No deadline"
                              }`}
                            >
                              <div className="px-2 md:px-3 py-0.5 md:py-1 text-xs text-white font-medium truncate">
                                {task.title}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Delete Zone */}
      <div
        className={`fixed bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 z-[60] transition-all duration-300 ${
          draggedTask
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div
          className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl shadow-2xl transition-all duration-200 ${
            isOverDeleteZone
              ? "bg-red-500 text-white scale-110 shadow-red-500/25"
              : "bg-white text-red-600 border-2 border-red-300 border-dashed shadow-lg"
          }`}
          onDragOver={handleDeleteZoneDragOver}
          onDragLeave={handleDeleteZoneDragLeave}
          onDrop={handleDeleteZoneDrop}
        >
          <Trash2 size={18} className="md:w-5 md:h-5 flex-shrink-0" />
          <span className="font-semibold text-sm md:text-base whitespace-nowrap">
            {isOverDeleteZone ? "Release to delete" : "Drop here to delete"}
          </span>
        </div>
      </div>

      {/* Modals */}
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

export default TaskTimeline;
