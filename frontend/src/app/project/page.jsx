"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createProject,
  getProjects,
  getUserByClerkId,
  getUsers,
} from "../../services/api";

export default function ProjectPage() {
  const { user } = useUser();
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsList, usersList] = await Promise.all([
          getProjects(),
          getUsers(),
        ]);
        setProjects(projectsList);
        setUsers(usersList);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      try {
        // First get the database user ID using clerkId
        const dbUser = await getUserByClerkId(user.id);
        if (!dbUser) {
          console.error("User not found in database");
          return;
        }

        const newProject = await createProject({
          name: newProjectName,
          description: newProjectDesc,
          owner_id: dbUser.id,
          collaborator_ids: [], // Owner will be added automatically by backend
        });

        setProjects([...projects, newProject]);
        setNewProjectName("");
        setNewProjectDesc("");
        setIsCreating(false);
        router.push(`/project/${newProject.id.replace(/-/g, "_")}`);
      } catch (error) {
        console.error("Failed to create project:", error);
      }
    }
  };

  const getUserName = (userId) => {
    const user = users.find((u) => u.id === userId);
    return user?.username || "Unknown User";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">All Projects</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Create New Project
            </h2>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className="w-full p-2 border rounded-md"
                  autoFocus
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Enter project description"
                  className="w-full p-2 border rounded-md"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() =>
              router.push(`/project/${project.id.replace(/-/g, "_")}`)
            }
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {project.description}
              </p>
            )}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center text-gray-600">
                <span className="text-sm font-medium">
                  Owner: {getUserName(project.owner_id)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {project.collaborators?.map((userId) => (
                  <div
                    key={userId}
                    className="bg-gray-100 px-2 py-1 rounded-full text-xs text-gray-600"
                  >
                    {getUserName(userId)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-500">
            No projects found. Create a new project to get started!
          </div>
        )}
      </div>
    </div>
  );
}
