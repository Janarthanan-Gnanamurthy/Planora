"use client";
import React, { useState, useEffect } from "react";
import {
  Plus,
  Users,
  Home,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Settings,
  Search,
  X,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { createProject, getProjects, getUsers } from "../services/api";
import { useToast } from "./Toast";

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Sidebar state
  // const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [showAllProjects, setShowAllProjects] = useState(false);

  // Project management state
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { addToast } = useToast();

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  // Get the current project ID from the URL (keep underscores as they are)
  const currentProjectIdFromUrl = pathname.startsWith("/project/")
    ? pathname.split("/")[2]
    : null;

  // Convert underscores to hyphens for API calls (if needed)
  const currentProjectId = currentProjectIdFromUrl?.replace(/_/g, "-");

  const isHome = pathname === "/" || pathname === "/dashboard";

  // Check if we're on a specific project page (has an ID after /project/)
  const isOnSpecificProjectPage =
    pathname.startsWith("/project/") &&
    pathname.split("/").length === 3 &&
    pathname.split("/")[2] &&
    pathname.split("/")[2].length > 0;

  // NEW: Function to check if we should show the invite team button
  // Change this condition based on your routing structure
  const shouldShowInviteButton = () => {
    // If you're using /projects/{id} (plural):
    // return pathname.startsWith("/projects/") &&
    //        pathname.split("/").length === 3 &&
    //        pathname.split("/")[2] &&
    //        pathname.split("/")[2].length > 0;

    // If you're using /project/{id} (singular) - current structure:
    return (
      pathname.startsWith("/project/") &&
      pathname.split("/").length === 3 &&
      pathname.split("/")[2] &&
      pathname.split("/")[2].length > 0
    );
  };

  // Filter projects based on search term
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show limited projects or all based on toggle
  const displayedProjects = showAllProjects
    ? filteredProjects
    : filteredProjects.slice(0, 5);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const clerkUserId = user.id;
        const projectsList = await getProjects();
        const usersList = await getUsers();

        const dbUser = usersList.find((u) => u.clerkId === clerkUserId);

        if (!dbUser) {
          console.error("User not found in database");
          setProjects([]);
          return;
        }

        const userProjects = projectsList.filter((project) => {
          if (!project.collaborators || !Array.isArray(project.collaborators)) {
            return false;
          }
          return project.collaborators.includes(dbUser.id);
        });

        setProjects(userProjects);
        setUsers(usersList);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        setProjects([]);
      }
    };

    if (user) {
      fetchProjects();
    }
  }, [user]);

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

  const getUserById = (userId) => {
    return users.find((user) => user.id === userId);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      addToast("Error!", "Project name is required", "error");
      return;
    }

    try {
      const clerkUserId = user.id;
      const dbUser = users.find((u) => u.clerkId === clerkUserId);

      console.log("sjhsgvweff", dbUser);

      if (!dbUser) {
        console.error("User not found in database");
        addToast("Error!", "User not found in database", "error");
        return;
      }

      const projectData = {
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || "",
        owner_id: dbUser.id,
        collaborators: [dbUser.id],
      };

      console.log("Creating project with data:", projectData);

      const newProject = await createProject(projectData);

      console.log("Project created successfully:", newProject);

      addToast("Success!", "Project Created Successfully", "success");
      setProjects([...projects, newProject]);
      setNewProjectName("");
      setNewProjectDesc("");
      setShowCreateProject(false);

      // Navigate to the new project
      router.push(`/project/${newProject.id.replace(/-/g, "_")}`);
    } catch (error) {
      console.error("Failed to create project:", error);
      addToast(
        "Error!",
        `Error Creating Project: ${error.message || "Unknown error"}`,
        "error"
      );
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentProjectId) return;

    try {
      setInviteStatus("sending");
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
          projectId: currentProjectId,
          projectName: projects.find((p) => p.id === currentProjectId)?.name,
          inviterName: user.fullName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setInviteStatus("success");
        setTimeout(() => {
          setInviteEmail("");
          setShowInviteModal(false);
          setInviteStatus("");
        }, 2000);
      } else {
        setInviteStatus("error");
      }
    } catch (error) {
      console.error("Failed to send invitation:", error);
      setInviteStatus("error");
    }
  };

  const isProjectActive = (projectId) => {
    return currentProjectId === projectId;
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`${
          isCollapsed ? "w-19" : "w-72"
        } h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white fixed left-0 top-0 overflow-hidden transition-all duration-300 ease-in-out shadow-2xl border-r border-slate-700/50 z-40`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <FolderOpen size={18} className="text-white" />
                </div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Planora
                </h1>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors duration-200"
            >
              {isCollapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col h-full">
          {/* Home Section */}
          <div className="mb-6">
            <button
              onClick={() => router.push("/home")}
              className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200 group ${
                isHome
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg shadow-blue-500/25"
                  : "hover:bg-slate-700/50"
              }`}
            >
              <Home
                size={24}
                className={
                  isHome
                    ? "text-white"
                    : "text-slate-400 group-hover:text-white"
                }
              />
              {!isCollapsed && (
                <span
                  className={`font-medium ${
                    isHome
                      ? "text-white"
                      : "text-slate-300 group-hover:text-white"
                  }`}
                >
                  Home
                </span>
              )}
            </button>
          </div>

          {/* Projects Section */}
          <div className="flex-1 overflow-hidden">
            <div className="mb-4">
              <button
                onClick={() =>
                  !isCollapsed && setIsProjectsExpanded(!isProjectsExpanded)
                }
                className="w-full flex items-center justify-between p-2 hover:bg-slate-700/50 rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen size={24} className="text-slate-400" />
                  {!isCollapsed && (
                    <span className="font-medium text-slate-300">Projects</span>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded-full text-slate-300">
                      {projects.length}
                    </span>
                    {isProjectsExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>
                )}
              </button>
            </div>

            {/* Search Bar */}
            {!isCollapsed && isProjectsExpanded && projects.length > 3 && (
              <div className="mb-4">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-400 focus:border-blue-500/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Projects List */}
            {(!isCollapsed && isProjectsExpanded) || isCollapsed ? (
              <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar h-[300px]">
                {displayedProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => {
                      router.push(`/project/${project.id.replace(/-/g, "_")}`);
                    }}
                    className={`group cursor-pointer transition-all duration-200 ${
                      isProjectActive(project.id)
                        ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-l-4 border-blue-500"
                        : "hover:bg-slate-700/30"
                    } rounded-lg ${isCollapsed ? "p-2" : "p-3"}`}
                  >
                    {isCollapsed ? (
                      <div
                        className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        title={project.name}
                      >
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {project.name.charAt(0).toUpperCase()}
                          </div>
                          <h3
                            className={`font-medium truncate flex-1 ${
                              isProjectActive(project.id)
                                ? "text-white"
                                : "text-slate-200 group-hover:text-white"
                            }`}
                          >
                            {project.name}
                          </h3>
                        </div>

                        {/* Collaborators */}
                        <div className="flex items-center gap-2 ml-11">
                          <div className="flex -space-x-2">
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
                                    className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-slate-800"
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
                              <div className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-xs font-medium border-2 border-slate-800">
                                +{project.collaborators.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* Show more/less toggle */}
                {!isCollapsed && filteredProjects.length > 5 && (
                  <button
                    onClick={() => setShowAllProjects(!showAllProjects)}
                    className="w-full p-2 text-sm text-slate-400 hover:text-white transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {showAllProjects ? (
                      <>
                        <ChevronUp size={16} />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        Show {filteredProjects.length - 5} More
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : null}

            {/* Add Project and Conditional Invite Team */}
            {!isCollapsed && isProjectsExpanded && (
              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCreateProject(true)}
                    className="w-full p-3 flex items-center justify-center gap-2 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-all duration-200 border border-slate-700/50 hover:border-slate-600/50 group"
                  >
                    <Plus
                      size={18}
                      className="text-slate-400 group-hover:text-white transition-colors"
                    />
                    <span className="text-slate-400 group-hover:text-white transition-colors font-medium">
                      New Project
                    </span>
                  </button>

                  {/* MODIFIED: Conditionally render Invite Team button */}
                  {shouldShowInviteButton() && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="w-full p-3 flex items-center justify-center gap-2 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-all duration-200 border border-slate-700/50 hover:border-slate-600/50 group"
                    >
                      <Users
                        size={18}
                        className="text-slate-400 group-hover:text-white transition-colors"
                      />
                      <span className="text-slate-400 group-hover:text-white transition-colors font-medium">
                        Invite Team
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
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
                disabled={!newProjectName.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Invite Collaborator
            </h3>
            <form onSubmit={handleInviteSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800 transition-colors"
                  placeholder="Enter email address"
                  required
                  disabled={inviteStatus === "sending"}
                />
              </div>
              {inviteStatus === "success" && (
                <div className="mb-4 text-green-600 font-medium bg-green-50 p-3 rounded-lg">
                  Invitation sent successfully!
                </div>
              )}
              {inviteStatus === "error" && (
                <div className="mb-4 text-red-600 font-medium bg-red-50 p-3 rounded-lg">
                  Failed to send invitation. Please try again.
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteStatus("");
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteStatus === "sending"}
                  className={`px-6 py-2 text-white rounded-lg transition-colors ${
                    inviteStatus === "sending"
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  }`}
                >
                  {inviteStatus === "sending"
                    ? "Sending..."
                    : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(51, 65, 85, 0.1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
      `}</style>
    </>
  );
};

export const SidebarLayout = ({ children }) => {
  return (
    <div className="flex">
      <Sidebar />
      <main
        className="flex-1 transition-all duration-300 ease-in-out"
        style={{ marginLeft: "var(--sidebar-width, 18rem)" }}
      >
        {children}
      </main>
    </div>
  );
};

export default Sidebar;
