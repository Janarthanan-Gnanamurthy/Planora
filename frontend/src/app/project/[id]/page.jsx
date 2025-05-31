"use client";
import React, { useEffect, useState, use } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
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

export default function ProjectPage({ params }) {
  // Convert underscores back to hyphens for API calls
  const routeId = use(params).id;
  const projectId = routeId.replace(/_/g, "-");

  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("board");
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const { addToast } = useToast();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    const fetchProjectData = async () => {
      try {
        console.log("Fetching project data for ID:", projectId);
        const projectData = await getProject(projectId);
        console.log("Project data received:", projectData);
        const usersData = await getUsers();
        console.log("users data received:", usersData);
        const tasksList = await getTasks({ project_id: projectId });
        console.log("tasks data received:", tasksList);

        if (!projectData) {
          console.error("Project not found");
          setError("Project not found");
          setIsLoading(false);
          return;
        }

        // Get the owner's details first
        console.log("Fetching owner details for ID:", projectData.owner_id);
        const owner = await getUserByClerkId(projectData.owner_id);
        console.log("Owner data:", owner);

        if (!owner) {
          console.error("Project owner not found");
          setError("Project owner not found");
          setIsLoading(false);
          return;
        }

        // Filter collaborators from users data based on collaborator IDs
        let projectCollaborators = [];

        // Filter collaborators if they exist
        if (
          projectData.collaborators &&
          Array.isArray(projectData.collaborators)
        ) {
          projectCollaborators = usersData.filter((user) =>
            projectData.collaborators.includes(user.id)
          );
        }

        console.log("Final collaborators:", projectCollaborators);

        setProject(projectData);
        setUsers(usersData);
        setCollaborators(projectCollaborators);
        setTasks(
          tasksList.map((task) => ({
            ...task,
            assigneeName:
              projectCollaborators.find((u) => u.id === task.assigned_to)
                ?.username || "Unassigned",
          }))
        );
        setError(null);
      } catch (error) {
        console.error("Failed to fetch project data:", error);
        setError(error.message || "Failed to load project");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [isLoaded, isSignedIn, projectId, user]);

  // Add this function to handle task clicks in timeline view
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  // Add this function to handle task updates
  const handleTaskUpdate = async (updatedTask) => {
    try {
      const response = await updateTask(updatedTask.id, updatedTask);
      addToast("Success!", "Task updated  ", "success");

      const updatedTaskWithName = {
        ...response,
        assigneeName:
          collaborators.find((u) => u.id === response.assigned_to)?.username ||
          "Unassigned",
      };
      setTasks((prevTasks) =>
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
            {error ||
              "This project doesn't exist or you don't have access to it."}
          </p>
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
            tasks={tasks}
            onTasksChange={setTasks}
          />
        ) : (
          <TaskTimeline
            project={project}
            users={collaborators}
            tasks={tasks}
            onTasksChange={setTasks}
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
