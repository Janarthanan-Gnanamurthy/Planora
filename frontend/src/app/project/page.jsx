"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Plus, Users, Calendar, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { createProject, getProjects, getUsers } from "../../services/api";
import { useToast } from "../../components/Toast";

export default function ProjectPage() {
  const { user } = useUser();
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const {addToast}=useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log(user);

        // Get the clerk user ID from useUser hook
        const clerkUserId = user.id;

        // Fetch all projects and users
        const [projectsList, usersList] = await Promise.all([
          getProjects(),
          getUsers(),
        ]);

        // Find the database user by matching clerkId
        const dbUser = usersList.find((u) => u.clerkId === clerkUserId);

        if (!dbUser) {
          console.error("User not found in database");
          setProjects([]); // Show no projects if user not found
          setUsers(usersList);
          return;
        }

        console.log("Found database user:", dbUser);
        console.log("Database user ID:", dbUser.id);

        // Filter projects where the user's database ID is in the collaborators array
        const userProjects = projectsList.filter((project) => {
          // Ensure collaborators exists and is an array
          if (!project.collaborators || !Array.isArray(project.collaborators)) {
            return false;
          }
          // Check if user's database ID is in the collaborators array
          return project.collaborators.includes(dbUser.id);
        });

        console.log("Filtered user projects:", userProjects);

        setProjects(userProjects);
        setUsers(usersList);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setProjects([]); // Show no projects on error
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      try {
        // Get the clerk user ID from useUser hook
        const clerkUserId = user.id;

        // Find the database user by matching clerkId from the users array we already have
        const dbUser = users.find((u) => u.clerkId === clerkUserId);

        if (!dbUser) {
          console.error("User not found in database");
          return;
        }

        console.log("Creating project with user:", dbUser);
        console.log("Owner ID:", dbUser.id);

        // Create new project with owner_id and add owner as collaborator
        const newProject = await createProject({
          name: newProjectName,
          description: newProjectDesc,
          owner_id: dbUser.id, // Set the owner as the current user's database ID
          collaborators: [dbUser.id], // Add the owner as the first collaborator
        });
        addToast("Success!", "Project Created", "success");

        console.log("Created project:", newProject);

        // Add the new project to the projects list
        setProjects([...projects, newProject]);
        setNewProjectName("");
        setNewProjectDesc("");
        setIsCreating(false);

        // Navigate to the new project
        router.push(`/project/${newProject.id.replace(/-/g, "_")}`);
      } catch (error) {
        addToast("Error!", "Error Creating Project", "error");

        console.error("Failed to create project:", error);
      }
    }
  };

  const getUserName = (userId) => {
    const user = users.find((u) => u.id === userId);
    return user?.username || "Unknown User";
  };

  const getUserInitials = (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user || !user.username) return "?";

    const names = user.username.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  const getInitialsColor = (userId) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-orange-500",
      "bg-teal-500",
      "bg-red-500",
    ];
    const index = userId ? userId.toString().charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-gray-600 font-medium">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-1">
              Manage and collaborate on your projects
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Plus size={20} />
            New Project
          </button>
        </div>

        {/* Create Project Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Create New Project
              </h2>
              <form onSubmit={handleAddProject} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="Enter project description (optional)"
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
                    rows={4}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewProjectName("");
                      setNewProjectDesc("");
                    }}
                    className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() =>
                router.push(`/project/${project.id.replace(/-/g, "_")}`)
              }
              className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-200 transform hover:-translate-y-1"
            >
              {/* Project Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Project Stats */}
              <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>Created recently</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{project.collaborators?.length || 1} members</span>
                </div>
              </div>

              {/* Owner and Collaborators */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Owner
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${getInitialsColor(
                        project.owner_id
                      )}`}
                    >
                      {getUserInitials(project.owner_id)}
                    </div>
                    <span className="text-sm text-gray-600">
                      {getUserName(project.owner_id)}
                    </span>
                  </div>
                </div>

                {project.collaborators && project.collaborators.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Team
                    </span>
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        {project.collaborators
                          .slice(0, 4)
                          .map((userId, index) => (
                            <div
                              key={userId}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white ${getInitialsColor(
                                userId
                              )}`}
                              title={getUserName(userId)}
                              style={{
                                zIndex: project.collaborators.length - index,
                              }}
                            >
                              {getUserInitials(userId)}
                            </div>
                          ))}
                        {project.collaborators.length > 4 && (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-600 text-xs font-bold border-2 border-white">
                            +{project.collaborators.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Project Footer */}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {projects.length === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus size={32} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No projects yet
              </h3>
              <p className="text-gray-600 mb-6">
                Get started by creating your first project and start
                collaborating with your team.
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Create Your First Project
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
