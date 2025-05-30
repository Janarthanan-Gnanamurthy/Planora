"use client";
import React, { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Users,
  CheckCircle,
  Clock,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

// You'll need to import these from your actual API service
import {
  getProjects,
  getTasks,
  getUsers,
  createProject,
} from "../../services/api";
import { useUser } from "@clerk/nextjs";
import { useToast } from "../../components/Toast";

const Dashboard = () => {
  const user = useUser();
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbUser, setDbUser] = useState(null);
  const [taskFilter, setTaskFilter] = useState("upcoming");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const { addToast } = useToast();

  // Toast notification function (you'll need to implement this)

  // Get current date and time
  const getCurrentDateTime = () => {
    const now = new Date();
    const options = {
      weekday: "long",
      month: "long",
      day: "numeric",
    };
    return now.toLocaleDateString("en-US", options);
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Filter tasks based on current filter
  const getFilteredTasks = () => {
    switch (taskFilter) {
      case "overdue":
        return tasks.filter(
          (task) =>
            new Date(task.deadline) < new Date() && task.status !== "completed"
        );
      case "completed":
        return tasks.filter((task) => task.status === "completed");
      case "upcoming":
      default:
        return tasks.filter(
          (task) =>
            new Date(task.deadline) >= new Date() && task.status !== "completed"
        );
    }
  };

  // Handle project creation
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      addToast("Error", "Project name is required", "error");
      return;
    }

    setIsCreatingProject(true);
    try {
      const newProject = await createProject({
        name: newProjectName,
        description: newProjectDesc,
        owner_id: dbUser.id,
        collaborators: [dbUser.id],
      });

      addToast("Success!", "Project Created", "success");
      console.log("Created project:", newProject);

      setProjects([...projects, newProject]);
      setNewProjectName("");
      setNewProjectDesc("");
      setShowCreateProject(false);
    } catch (error) {
      console.error("Failed to create project:", error);
      addToast("Error", "Failed to create project", "error");
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Handle project click
  const handleProjectClick = (project) => {
    const urlId = dbUser.id.replace(/-/g, "_");
    router.push(`/project/${urlId}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user.isLoaded) {
          return;
        }

        if (!user.user) {
          console.log("User not authenticated");
          setIsLoading(false);
          return;
        }

        const clerkUserId = user.user.id;
        const [projectsList, usersList] = await Promise.all([
          getProjects(),
          getUsers(),
        ]);

        const foundDbUser = usersList.find((u) => u.clerkId === clerkUserId);

        if (!foundDbUser) {
          console.error("User not found in database");
          setProjects([]);
          setUsers(usersList);
          setTasks([]);
          setIsLoading(false);
          return;
        }

        setDbUser(foundDbUser);
        console.log("Database user found:", foundDbUser);

        const tasksList = await getTasks({ assignedTo: foundDbUser.id });
        const userProjects = projectsList.filter((project) => {
          if (!project.collaborators || !Array.isArray(project.collaborators)) {
            return false;
          }
          return project.collaborators.includes(foundDbUser.id);
        });

        console.log("Filtered user projects:", userProjects);
        console.log("User tasks:", tasksList);

        setProjects(userProjects);
        setUsers(usersList.filter((u) => u.id !== foundDbUser.id));
        setTasks(tasksList);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setProjects([]);
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user.isLoaded, user.user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  const filteredTasks = getFilteredTasks();
  const overdueTasks = tasks.filter(
    (task) =>
      new Date(task.deadline) < new Date() && task.status !== "completed"
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="text-sm text-gray-500 mb-2">{getCurrentDateTime()}</div>
        <h1 className="text-3xl font-light text-gray-800">
          {getTimeOfDay()}, {user?.user?.fullName || "User"}
        </h1>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <span>My week</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>
              {tasks.filter((task) => task.status === "completed").length} tasks
              completed
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Users className="w-4 h-4 text-blue-600" />
            <span>
              {users.length} collaborator{users.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="ml-auto">
            <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
              🇮🇳 Customize
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    My tasks
                  </h2>
                  <div className="flex gap-6 text-sm mt-2">
                    <button
                      onClick={() => setTaskFilter("upcoming")}
                      className={`pb-1 border-b-2 transition-colors ${
                        taskFilter === "upcoming"
                          ? "text-blue-600 border-blue-600"
                          : "text-gray-500 border-transparent hover:text-gray-700"
                      }`}
                    >
                      Upcoming
                    </button>
                    <button
                      onClick={() => setTaskFilter("overdue")}
                      className={`pb-1 border-b-2 transition-colors ${
                        taskFilter === "overdue"
                          ? "text-red-600 border-red-600"
                          : "text-gray-500 border-transparent hover:text-gray-700"
                      }`}
                    >
                      Overdue ({overdueTasks.length})
                    </button>
                    <button
                      onClick={() => setTaskFilter("completed")}
                      className={`pb-1 border-b-2 transition-colors ${
                        taskFilter === "completed"
                          ? "text-green-600 border-green-600"
                          : "text-gray-500 border-transparent hover:text-gray-700"
                      }`}
                    >
                      Completed
                    </button>
                  </div>
                </div>
              </div>
              <MoreHorizontal className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" />
            </div>

            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No {taskFilter} tasks
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 rounded-lg px-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 border-2 rounded ${
                          task.status === "completed"
                            ? "bg-green-500 border-green-500"
                            : "border-gray-300 hover:border-gray-400"
                        } cursor-pointer transition-colors`}
                      >
                        {task.status === "completed" && (
                          <CheckCircle className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <span
                        className={`${
                          task.status === "completed"
                            ? "line-through text-gray-400"
                            : "text-gray-800"
                        } font-medium`}
                      >
                        {task.title}
                      </span>
                      {task.priority === "high" && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                          High Priority
                        </span>
                      )}
                      {task.status === "in_progress" && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                          In Progress
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm ${
                          new Date(task.deadline) < new Date() &&
                          task.status !== "completed"
                            ? "text-red-500 font-medium"
                            : "text-gray-500"
                        }`}
                      >
                        {formatDate(task.deadline)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Projects
                </h2>
                <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <span>Recents</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              <MoreHorizontal className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" />
            </div>

            <div className="space-y-4">
              {/* Create project button */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all"
                onClick={() => setShowCreateProject(true)}
              >
                <Plus className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <div className="text-sm text-gray-500 font-medium">
                  Create project
                </div>
              </div>

              {/* Project items */}
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                  onClick={() => handleProjectClick(project)}
                >
                  <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-sm"></div>
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-800 text-sm font-medium">
                      {project.name}
                    </div>
                    {project.tasksDue && (
                      <div className="text-xs text-gray-500">
                        {project.tasksDue}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Create New Project
              </h3>
              <button
                onClick={() => setShowCreateProject(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project description"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateProject(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={isCreatingProject || !newProjectName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingProject ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
