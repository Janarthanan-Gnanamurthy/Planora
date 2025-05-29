"use client";
import React from "react";
import { User, Calendar } from "lucide-react";

const TaskCard = ({ task, draggable = true }) => {
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return null;

    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });

    let urgencyClass = "";
    if (diffDays < 0) {
      urgencyClass = "text-red-600"; // Overdue
    } else if (diffDays <= 2) {
      urgencyClass = "text-orange-600"; // Due soon
    } else {
      urgencyClass = "text-gray-600"; // Normal
    }

    return { formattedDate, urgencyClass, diffDays };
  };

  const deadlineInfo = formatDeadline(task.deadline);

  return (
    <div
      draggable={draggable}
      className="bg-white p-4 rounded-lg shadow-md cursor-grab active:cursor-grabbing hover:shadow-lg transition-shadow"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-800 flex-1 mr-2">
          {task.title}
        </h3>
        {task.priority && (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(
              task.priority
            )}`}
          >
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-gray-600">
          <User size={16} className="mr-2 flex-shrink-0" />
          <span className="text-sm truncate" title={task.assigneeName}>
            {task.assigneeName}
          </span>
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {task.description}
          </p>
        )}

        {deadlineInfo && (
          <div className={`flex items-center ${deadlineInfo.urgencyClass}`}>
            <Calendar size={16} className="mr-2 flex-shrink-0" />
            <span className="text-sm">
              {deadlineInfo.formattedDate}
              {deadlineInfo.diffDays < 0 && " (Overdue)"}
              {deadlineInfo.diffDays === 0 && " (Today)"}
              {deadlineInfo.diffDays === 1 && " (Tomorrow)"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
