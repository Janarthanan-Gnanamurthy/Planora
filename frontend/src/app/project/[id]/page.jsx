"use client";
import React, { useEffect, useState, use, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import TaskBoard from "../../../components/TaskBoard";
import TaskTimeline from "../../../components/TaskTimeline";
import EditTaskModal from "../../../components/EditTaskModal";
import { useToast } from "../../../hooks/useToast";
import {
  getProject,
  getUserByClerkId,
  getUsers,
  updateTask,
  getTasks,
} from "../../../services/api";
import { LayoutGrid } from "lucide-react";

// SWR fetcher functions using your API service
const fetchProject = async (projectId) => {
  return await getProject(projectId);
};

const fetchUsers = async () => {
  return await getUsers();
};

const fetchTasks = async (projectId) => {
  return await getTasks({ project_id: projectId });
};

const fetchUserByClerkId = async (clerkId) => {
  return await getUserByClerkId(clerkId);
};

export default function ProjectPage({ params }) {
  // Convert underscores back to hyphens for API calls
  const routeId = use(params).id;
  const projectId = routeId.replace(/_/g, "-");

  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [viewMode, setViewMode] = useState("board");
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { addToast } = useToast();

  // SWR hooks for data fetching with auto-refresh
  const { 
    data: project, 
    error: projectError, 
    isLoading: projectLoading 
  } = useSWR(
    isLoaded && isSignedIn && projectId ? `project-${projectId}` : null,
    () => fetchProject(projectId),
    {
      refreshInterval: 5000, // Auto-refresh every 5 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );

  const { 
    data: users = [], 
    error: usersError, 
    isLoading: usersLoading 
  } = useSWR(
    isLoaded && isSignedIn ? 'users' : null,
    fetchUsers,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );

  const { 
    data: tasks = [], 
    error: tasksError, 
    isLoading: tasksLoading 
  } = useSWR(
    isLoaded && isSignedIn && projectId ? `tasks-${projectId}` : null,
    () => fetchTasks(projectId),
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );

  const { 
    data: owner, 
    error: ownerError, 
    isLoading: ownerLoading 
  } = useSWR(
    project?.owner_id ? `owner-${project.owner_id}` : null,
    () => fetchUserByClerkId(project.owner_id),
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );

  // Combined loading and error states
  const isLoading = projectLoading || usersLoading || tasksLoading || ownerLoading;
  const error = projectError || usersError || tasksError || ownerError;

  // Memoize collaborators to prevent unnecessary recalculations
  const collaborators = useMemo(() => {
    if (!project || !users || !Array.isArray(users)) return [];
    
    if (project.collaborators && Array.isArray(project.collaborators)) {
      return users.filter((user) =>
        project.collaborators.includes(user.id)
      );
    }
    return [];
  }, [project, users]);

  // Memoize tasks with names to prevent unnecessary recalculations
  const tasksWithNames = useMemo(() => {
    if (!Array.isArray(tasks) || !Array.isArray(collaborators)) return [];
    
    return tasks.map((task) => ({
      ...task,
      assigneeName:
        collaborators.find((u) => u.id === task.assigned_to)
          ?.username || "Unassigned",
    }));
  }, [tasks, collaborators]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
  }, [isLoaded, isSignedIn, router]);

  // Add this function to handle task clicks in timeline view
  const handleTaskClick = useCallback((task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  }, []);

  // Add this function to handle task updates with SWR
  const handleTaskUpdate = useCallback(async (updatedTask) => {
    try {
      const response = await updateTask(updatedTask.id, updatedTask);
      addToast("Success!", "Task updated", "success");

      // Optimistically update the tasks cache
      mutate(
        `tasks-${projectId}`,
        tasks.map((task) => (task.id === response.id ? response : task)),
        false
      );

      // Revalidate to ensure consistency
      mutate(`tasks-${projectId}`);

      setIsEditModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error("Failed to update task:", error);
      addToast("Error", "Failed to update task", "error");
      
      // Revalidate on error to restore correct state
      mutate(`tasks-${projectId}`);
    }
  }, [addToast, projectId, tasks]);

  // Memoized callback for tasks change to prevent unnecessary re-renders in child components
  const handleTasksChange = useCallback((newTasks) => {
    // If using this callback, make sure to mutate SWR cache instead of local state
    mutate(`tasks-${projectId}`, newTasks, false);
  }, [projectId]);

  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null; // Router will handle redirect
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Project Not Found
          </h1>
          <p className="text-gray-600">
            {error?.message ||
              "This project doesn't exist or you don't have access to it."}
          </p>
        </div>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Loading Project Owner...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <h1 className="text-3xl font-bold text-gray-800">{project.name}</h1>
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm ">
              <button
                onClick={() => setViewMode("board")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === "board"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <LayoutGrid size={18} />
                <span className="text-sm font-medium">Board</span>
              </button>
              <button
                onClick={() => setViewMode("timeline")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === "timeline"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="text-sm font-medium">Timeline</span>
              </button>
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Team Members
            </h2>
            <div className="flex flex-wrap gap-2">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center bg-white px-3 py-2 rounded-full shadow-sm"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                    {(collaborator.username || collaborator.name)?.charAt(0) ||
                      "?"}
                  </div>
                  <span className="ml-2 text-gray-700">
                    {collaborator.username ||
                      collaborator.name ||
                      "Unknown User"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {viewMode === "board" ? (
          <TaskBoard
            project={project}
            users={collaborators}
            tasks={tasksWithNames}
            onTasksChange={handleTasksChange}
          />
        ) : (
          <TaskTimeline
            project={project}
            users={collaborators}
            tasks={tasksWithNames}
            onTasksChange={handleTasksChange}
            onTaskClick={handleTaskClick}
          />
        )}

        <EditTaskModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTask(null);
          }}
          onSubmit={handleTaskUpdate}
          task={selectedTask}
          projectUsers={collaborators}
        />
      </div>
    </div>
  );
}