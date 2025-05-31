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
  Folder,
  AlertCircle,
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

  const getInitials = (name) => {
    if (!name || typeof name !== "string") {
      return "?";
    }

    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  // Get project by ID
  const getProjectById = (projectId) => {
    return projects.find((project) => project.id === projectId);
  };

  // Get user by ID
  const getUserById = (userId) => {
    return users.find((user) => user.id === userId);
  };

  // Filter tasks based on current filter - FIXED VERSION
  const getFilteredTasks = () => {
    // Only show tasks assigned to current user
    const userTasks = tasks.filter((task) => task.assigned_to === dbUser?.id);

    switch (taskFilter) {
      case "overdue":
        return userTasks.filter(
          (task) =>
            new Date(task.deadline) < new Date() && task.status !== "done"
        );
      case "done":
        return userTasks.filter((task) => task.status === "done");
      case "all":
        return userTasks;
      case "upcoming":
      default:
        return userTasks.filter(
          (task) =>
            new Date(task.deadline) >= new Date() && task.status !== "done"
        );
    }
  };

  // Calculate task stats
  const getTaskStats = () => {
    const userTasks = tasks.filter((task) => task.assigned_to === dbUser?.id);
    const overdue = userTasks.filter(
      (task) => new Date(task.deadline) < new Date() && task.status !== "done"
    );
    const completed = userTasks.filter((task) => task.status === "done");
    const inProgress = userTasks.filter(
      (task) => task.status === "in_progress"
    );

    return {
      total: userTasks.length,
      overdue: overdue.length,
      completed: completed.length,
      inProgress: inProgress.length,
    };
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

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "from-red-100 to-red-200 text-red-700";
      case "medium":
        return "from-yellow-100 to-yellow-200 text-yellow-700";
      case "low":
        return "from-green-100 to-green-200 text-green-700";
      default:
        return "from-gray-100 to-gray-200 text-gray-700";
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "from-green-100 to-green-200 text-green-700";
      case "in_progress":
        return "from-blue-100 to-blue-200 text-blue-700";
      case "todo":
        return "from-purple-100 to-purple-200 text-purple-700";
      default:
        return "from-gray-100 to-gray-200 text-gray-700";
    }
  };

  const filteredTasks = getFilteredTasks();
  const taskStats = getTaskStats();

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

        // Get ALL tasks, we'll filter them in the component
        const tasksList = await getTasks();

        // Filter projects where user is a collaborator
        const userProjects = projectsList.filter((project) => {
          if (!project.collaborators || !Array.isArray(project.collaborators)) {
            return false;
          }
          return project.collaborators.includes(foundDbUser.id);
        });

        console.log("Filtered user projects:", userProjects);
        console.log("All tasks:", tasksList);

        setProjects(userProjects);
        setUsers(usersList);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 mb-2 font-medium">
                {getCurrentDateTime()}
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent mb-4">
                {getTimeOfDay()}, {user.user?.fullName}
              </h1>

              {/* Enhanced Stats Cards */}
              <div className="flex flex-wrap gap-6 mt-6">
                <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white/90">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">
                        {taskStats.completed}
                      </div>
                      <div className="text-sm text-slate-600">
                        Tasks completed
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white/90">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Folder className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">
                        {
                          projects.filter((p) => p.status !== "completed")
                            .length
                        }
                      </div>
                      <div className="text-sm text-slate-600">
                        Active projects
                      </div>
                    </div>
                  </div>
                </div>

                {taskStats.overdue > 0 && (
                  <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white/90">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-800">
                          {taskStats.overdue}
                        </div>
                        <div className="text-sm text-slate-600">
                          Overdue tasks
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Tasks Section - Takes 2 columns on xl screens */}
          <div className="xl:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8 hover:shadow-2xl transition-all duration-500">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-4">
                    My Tasks
                  </h2>
                  <div className="flex gap-8">
                    {[
                      { key: "upcoming", label: "Upcoming", color: "blue" },
                      {
                        key: "overdue",
                        label: `Overdue (${taskStats.overdue})`,
                        color: "red",
                      },
                      {
                        key: "completed",
                        label: `Completed (${taskStats.completed})`,
                        color: "green",
                      },
                      { key: "all", label: "All Tasks", color: "amber" },
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => setTaskFilter(filter.key)}
                        className={`relative py-2 px-1 text-sm font-medium transition-all duration-300 group ${
                          taskFilter === filter.key
                            ? `text-${filter.color}-700`
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {filter.label}
                        <div
                          className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r transition-all duration-300 ${
                            taskFilter === filter.key
                              ? `from-${filter.color}-400 to-${filter.color}-600 scale-x-100`
                              : "from-slate-300 to-slate-500 scale-x-0 group-hover:scale-x-100"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="group cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-all duration-300">
                  <MoreHorizontal className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:scale-110 transition-all duration-300" />
                </div>
              </div>

              <div className="space-y-4">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-slate-400" />
                    </div>
                    <div className="text-slate-500 font-medium">
                      No {taskFilter} tasks
                    </div>
                  </div>
                ) : (
                  filteredTasks.map((task, index) => {
                    const project = getProjectById(task.project_id);
                    const isOverdue =
                      new Date(task.deadline) < new Date() &&
                      task.status !== "done";

                    return (
                      <div
                        key={task.id}
                        className="group flex items-start justify-between p-5 rounded-2xl hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-transparent hover:border-blue-100"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-start gap-4 flex-1">
                          <div
                            className={`w-6 h-6 border-2 rounded-lg transition-all duration-300 cursor-pointer hover:scale-110 mt-1 ${
                              task.status === "done"
                                ? "bg-gradient-to-br from-green-400 to-green-500 border-green-500"
                                : "border-slate-300 hover:border-blue-400 group-hover:border-blue-500"
                            }`}
                          >
                            {task.status === "done" && (
                              <CheckCircle className="w-6 h-6 text-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={`font-semibold text-lg transition-all duration-300 ${
                                  task.status === "completed"
                                    ? "line-through text-slate-400"
                                    : "text-slate-800 group-hover:text-slate-900"
                                }`}
                              >
                                {task.title}
                              </div>
                              {isOverdue && (
                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                              )}
                            </div>

                            {task.description && (
                              <div className="text-slate-600 text-sm mb-3 line-clamp-2">
                                {task.description}
                              </div>
                            )}

                            {/* Project info */}
                            {project && (
                              <div className="flex items-center gap-2 mb-3">
                                <Folder className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600">
                                  {project.name}
                                </span>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              {/* Priority badge */}
                              <span
                                className={`px-2 py-1 bg-gradient-to-r ${getPriorityColor(
                                  task.priority
                                )} text-xs rounded-full font-medium`}
                              >
                                {task.priority?.charAt(0).toUpperCase() +
                                  task.priority?.slice(1)}{" "}
                                Priority
                              </span>

                              {/* Status badge */}
                              <span
                                className={`px-2 py-1 bg-gradient-to-r ${getStatusColor(
                                  task.status
                                )} text-xs rounded-full font-medium`}
                              >
                                {task.status === "in_progress"
                                  ? "In Progress"
                                  : task.status === "todo"
                                  ? "To Do"
                                  : task.status === "done"
                                  ? "Done"
                                  : task.status?.charAt(0).toUpperCase() +
                                    task.status?.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 ml-4">
                          <span
                            className={`text-sm font-medium transition-all duration-300 ${
                              isOverdue
                                ? "text-red-500 font-semibold"
                                : "text-slate-500 group-hover:text-slate-700"
                            }`}
                          >
                            <Clock className="w-4 h-4 inline mr-1" />
                            {formatDate(task.deadline)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Projects Section - Takes 1 column on xl screens */}
          <div className="xl:col-span-1">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    Projects
                  </h2>
                  <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    {projects.filter((p) => p.status !== "done").length} active,{" "}
                    {projects.filter((p) => p.status === "done ").length}{" "}
                    completed
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Create Project Card */}
                <div
                  className="group border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-500 hover:shadow-lg hover:scale-105 min-h-[140px] flex flex-col items-center justify-center"
                  onClick={() => setShowCreateProject(true)}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:from-blue-400 group-hover:to-blue-500 transition-all duration-500">
                    <Plus className="w-6 h-6 text-slate-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="text-sm text-slate-600 font-medium group-hover:text-blue-600 transition-colors duration-300">
                    Create new project
                  </div>
                </div>

                {/* Active Projects */}
                {projects
                  .filter((project) => project.status !== "completed")
                  .map((project, index) => (
                    <div
                      key={project.id}
                      className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-500 border border-white/50 hover:border-blue-200 hover:scale-105 hover:bg-white/95 min-h-[140px] flex flex-col"
                      style={{ animationDelay: `${index * 150}ms` }}
                      onClick={() => {
                        const urlId = project.id.replace(/-/g, "_");
                        router.push(`/project/${urlId}`);
                      }}
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div
                          className={`w-12 h-12 ${
                            project.color ||
                            "bg-gradient-to-br from-blue-400 to-blue-500"
                          } rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                        >
                          <div className="grid grid-cols-2 gap-1">
                            {[...Array(4)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 bg-white rounded-sm opacity-90"
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-800 font-bold text-lg truncate group-hover:text-slate-900 transition-colors duration-300">
                            {project.name}
                          </div>
                          <div className="text-slate-500 text-sm mt-1 line-clamp-2">
                            {project.description}
                          </div>
                          {/* Project Status Badge */}
                          {project.status && project.status !== "active" && (
                            <div className="mt-2">
                              <span
                                className={`px-2 py-1 text-xs rounded-full font-medium ${
                                  project.status === "in_progress"
                                    ? "bg-blue-100 text-blue-700"
                                    : project.status === "on_hold"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {project.status === "in_progress"
                                  ? "In Progress"
                                  : project.status === "on_hold"
                                  ? "On Hold"
                                  : project.status?.charAt(0).toUpperCase() +
                                    project.status?.slice(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <div className="flex flex-wrap gap-1">
                            {project.collaborators
                              ?.slice(0, 3)
                              .map((collaboratorId, index) => {
                                const collaboratorUser =
                                  getUserById(collaboratorId);
                                return (
                                  <div
                                    key={
                                      collaboratorId || `collaborator-${index}`
                                    }
                                    className="px-2 py-1 rounded text-xs transition-colors bg-blue-500 text-white"
                                    title={
                                      collaboratorUser?.username ||
                                      "Unknown User"
                                    }
                                  >
                                    {getInitials(
                                      collaboratorUser?.username ||
                                        "Unknown User"
                                    )}
                                  </div>
                                );
                              })}
                            {project.collaborators?.length > 3 && (
                              <div className="px-2 py-1 rounded text-xs bg-slate-300 text-slate-700">
                                +{project.collaborators.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                        {project.deadline && (
                          <div className="text-xs text-slate-600 bg-gradient-to-r from-slate-100 to-slate-200 px-3 py-1.5 rounded-full font-medium group-hover:from-blue-100 group-hover:to-blue-200 group-hover:text-blue-700 transition-all duration-300">
                            {formatDate(project.deadline)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                {/* Completed Projects Section */}
                {projects.filter((project) => project.status === "done")
                  .length > 0 && (
                  <>
                    <div className="pt-6 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent flex-1"></div>
                        <div className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                          Completed Projects
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent flex-1"></div>
                      </div>
                    </div>

                    {projects
                      .filter((project) => project.status === "completed")
                      .map((project, index) => (
                        <div
                          key={project.id}
                          className="group bg-gradient-to-br from-green-50/50 to-emerald-50/50 backdrop-blur-sm rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-all duration-500 border border-green-200/50 hover:border-green-300/70 hover:scale-102 min-h-[140px] flex flex-col opacity-80 hover:opacity-100"
                          style={{ animationDelay: `${index * 150}ms` }}
                          onClick={() => {
                            const urlId = project.id.replace(/-/g, "_");
                            router.push(`/project/${urlId}`);
                          }}
                        >
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                              <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-slate-700 font-bold text-lg truncate group-hover:text-slate-800 transition-colors duration-300">
                                {project.name}
                              </div>
                              <div className="text-slate-500 text-sm mt-1 line-clamp-2">
                                {project.description}
                              </div>
                              <div className="mt-2">
                                <span className="px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-700">
                                  Completed
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-auto flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-slate-400" />
                              <div className="flex flex-wrap gap-1">
                                {project.collaborators
                                  ?.slice(0, 3)
                                  .map((collaboratorId, index) => {
                                    const collaboratorUser =
                                      getUserById(collaboratorId);
                                    return (
                                      <div
                                        key={
                                          collaboratorId ||
                                          `collaborator-${index}`
                                        }
                                        className="px-2 py-1 rounded text-xs transition-colors bg-green-500 text-white"
                                        title={
                                          collaboratorUser?.username ||
                                          "Unknown User"
                                        }
                                      >
                                        {getInitials(
                                          collaboratorUser?.username ||
                                            "Unknown User"
                                        )}
                                      </div>
                                    );
                                  })}
                                {project.collaborators?.length > 3 && (
                                  <div className="px-2 py-1 rounded text-xs bg-slate-300 text-slate-700">
                                    +{project.collaborators.length - 3}
                                  </div>
                                )}
                              </div>
                            </div>
                            {project.completed_at && (
                              <div className="text-xs text-green-600 bg-gradient-to-r from-green-100 to-green-200 px-3 py-1.5 rounded-full font-medium">
                                Completed {formatDate(project.completed_at)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Project Modal */}
        {showCreateProject && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl border border-white/50 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-800">
                  Create New Project
                </h3>
                <button
                  onClick={() => setShowCreateProject(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-all duration-300 hover:scale-110"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full text-black px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:border-slate-300"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full text-black px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:border-slate-300 resize-none"
                    placeholder="Enter project description"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowCreateProject(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 transition-all duration-300 font-medium hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || isCreatingProject}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  {isCreatingProject ? "Creating..." : "Create Project"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
