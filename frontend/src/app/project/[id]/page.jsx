"use client";
import React, { useEffect, useState, use } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import TaskBoard from "../../../components/TaskBoard";
import {
  getProject,
  getUserByClerkId,
  getUsers,
  getTasks,
  addProjectCollaborator,
  removeProjectCollaborator,
} from "../../../services/api";
import CreateTaskModal from "../../../components/CreateTaskModal";
import { Plus, UserPlus, X } from "lucide-react";

export default function ProjectPage() {
  const { id } = useParams();
  const { user } = useUser();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [error, setError] = useState(null);

  // Convert URL-friendly ID back to API format
  const projectId = id.replace(/_/g, "-");

  useEffect(() => {
    if (!user.isLoaded) return;

    if (!user.isSignedIn) {
      router.push("/sign-in");
      return;
    }

    const fetchData = async () => {
      try {
        console.log("Fetching project data for ID:", projectId);
        const [projectData, tasksList] = await Promise.all([
          getProject(projectId),
          getTasks({ project_id: projectId }),
        ]);

        console.log("Project data received:", projectData);
        console.log("Tasks data received:", tasksList);
        console.log("Users data received:", usersList);

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

        setProject({
          ...projectData,
          owner,
        });
        setTasks(tasksList);
        setUsers(usersList);
        setCurrentUser(dbUser);
        setError(null);
      } catch (error) {
        console.error("Failed to fetch project data:", error);
        setError(error.message || "Failed to load project");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user.isLoaded, user.isSignedIn, projectId]);

  // const handleAddCollaborator = async (selectedUserId) => {
  //   try {
  //     await addProjectCollaborator(projectId, selectedUserId);
  //     // Refresh project data to get updated collaborators list
  //     const updatedProject = await getProject(projectId);
  //     setProject(updatedProject);
  //     setShowAddCollaborator(false);
  //   } catch (error) {
  //     console.error("Failed to add collaborator:", error);
  //     setError("Failed to add collaborator");
  //   }
  // };

  // const handleRemoveCollaborator = async (userId) => {
  //   try {
  //     await removeProjectCollaborator(projectId, userId);
  //     // Refresh project data to get updated collaborators list
  //     const updatedProject = await getProject(projectId);
  //     setProject(updatedProject);
  //   } catch (error) {
  //     console.error("Failed to remove collaborator:", error);
  //     setError("Failed to remove collaborator");
  //   }
  // };

  const getUserName = (userId) => {
    const user = users.find((u) => u.id === userId);
    return user?.username || "Unknown User";
  };

  if (!user.isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user.isSignedIn) {
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

  const isOwner = currentUser?.id === project.owner_id;
  const availableUsers = users.filter(
    (u) => !project.collaborators.includes(u.id) && u.id !== project.owner_id
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {project.name}
              </h1>
              <p className="text-gray-600">{project.description}</p>
            </div>
            <button
              onClick={() => setShowCreateTask(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              New Task
            </button>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-700">Team</h2>
              {isOwner && (
                <button
                  onClick={() => setShowAddCollaborator(true)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <UserPlus size={16} />
                  Add Collaborator
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="bg-blue-100 px-3 py-1 rounded-full text-sm text-blue-800">
                👑 {getUserName(project.owner_id)} (Owner)
              </div>
              {project.collaborators.map((userId) => (
                <div
                  key={userId}
                  className="group flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700"
                >
                  {getUserName(userId)}
                  {/* {isOwner && (
                    <button
                      onClick={() => handleRemoveCollaborator(userId)}
                      className="opacity-0 group-hover:opacity-100 ml-1 text-red-500 hover:text-red-700"
                    >
                      <X size={14} />
                    </button>
                  )} */}
                </div>
              ))}
            </div>
          </div>
        </div>
        <TaskBoard tasks={tasks} setTasks={setTasks} users={users} />
      </div>

      {showCreateTask && (
        <CreateTaskModal
          projectId={projectId}
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={(newTask) => {
            setTasks([...tasks, newTask]);
            setShowCreateTask(false);
          }}
          users={[...project.collaborators, project.owner_id]}
        />
      )}

      {showAddCollaborator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Add Collaborator
              </h2>
              <button
                onClick={() => setShowAddCollaborator(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {availableUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No users available to add as collaborators
              </p>
            ) : (
              <div className="space-y-2">
                {/* {availableUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleAddCollaborator(user.id)}
                    className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>{user.username}</span>
                    <UserPlus size={16} className="text-blue-600" />
                  </button>
                ))} */}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
