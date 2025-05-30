"use client";
import React, { useState, useEffect } from "react";
import { Plus, Users } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import {
  createProject,
  getProjects,
  getUserByClerkId,
  getUsers,
} from "../services/api";
import { useToast } from "./Toast";

const Sidebar = () => {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");

  const { addToast } = useToast();

  const [projects, setProjects] = useState([]);
  const [users, setusers] = useState([]);
  const [collaborators, setCollaborators] = useState([]);

  // Get the current project ID from the URL and convert underscores back to hyphens
  const currentProjectId = pathname.startsWith("/project/")
    ? pathname.split("/")[2]?.replace(/_/g, "-")
    : null;

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Get the clerk user ID from useUser hook
        const clerkUserId = user.id;

        // Fetch all projects and users
        const projectsList = await getProjects();
        const usersList = await getUsers();

        // Find the database user by matching clerkId
        const dbUser = usersList.find((u) => u.clerkId === clerkUserId);

        if (!dbUser) {
          console.error("User not found in database");
          setProjects([]); // Show no projects if user not found
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
        console.log("All users:", usersList);

        setProjects(userProjects);
        setusers(usersList);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        setProjects([]); // Show no projects on error
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

  // Helper function to get user object by ID
  const getUserById = (userId) => {
    return users.find((user) => user.id === userId);
  };

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
          description: "",
          owner_id: dbUser.id, // Set the owner as the current user's database ID
          collaborators: [dbUser.id], // Add the owner as the first collaborator
        });
        addToast("Success!", "Project Created Successfully  ", "success");

        console.log("Created project:", newProject);

        // Add the new project to the projects list
        setProjects([...projects, newProject]);
        setNewProjectName("");
        setIsAddingProject(false);

        // Navigate to the new project
        router.push(`/project/${newProject.id.replace(/-/g, "_")}`);
      } catch (error) {
        console.error("Failed to create project:", error);
        addToast("Error!", "Error Creating Project", "error");
      }
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

  // Helper function to check if project is currently active
  const isProjectActive = (projectId) => {
    return currentProjectId === projectId;
  };

  return (
    <div className="w-64  h-screen bg-gray-900 text-white p-4 fixed left-0 top-0 overflow-y-auto">
      <div className="mb-8 ">
        <h2 className="text-xl font-bold">Projects</h2>
        <div className="mt-4 space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => {
                router.push(`/project/${project.id.replace(/-/g, "_")}`);
              }}
              className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                isProjectActive(project.id)
                  ? "bg-blue-600 shadow-lg border-l-4 border-blue-400"
                  : "hover:bg-gray-800 hover:shadow-md"
              }`}
            >
              <h3
                className={`font-medium ${
                  isProjectActive(project.id)
                    ? "text-white font-semibold"
                    : "text-gray-200"
                }`}
              >
                {project.name}
              </h3>
              <div className="mt-2 flex flex-wrap gap-1">
                {project.collaborators?.map((collaboratorId, index) => {
                  const collaboratorUser = getUserById(collaboratorId);
                  return (
                    <div
                      key={collaboratorId || `collaborator-${index}`}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        isProjectActive(project.id)
                          ? "bg-blue-500 text-white"
                          : "bg-gray-700 text-gray-300"
                      }`}
                      title={collaboratorUser?.username || "Unknown User"}
                    >
                      {getInitials(
                        collaboratorUser?.username || "Unknown User"
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {isAddingProject ? (
          <form onSubmit={handleAddProject} className="mt-4">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name"
              className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            <div className="mt-2 space-x-2">
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAddingProject(false)}
                className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingProject(true)}
            className="mt-4 w-full p-2 flex items-center justify-center gap-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={20} />
            Add Project
          </button>
        )}
      </div>

      {currentProjectId && (
        <div className="mt-auto pt-4 border-t border-gray-800">
          <button
            onClick={() => setShowInviteModal(true)}
            className="w-full p-2 flex items-center justify-center gap-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors "
          >
            <Users size={20} />
            Invite Collaborators
          </button>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Invite Collaborator
            </h3>
            <form onSubmit={handleInviteSubmit}>
              <div className="mb-4">
                <label className="block text-black mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none text-black"
                  placeholder="Enter email address"
                  required
                  disabled={inviteStatus === "sending"}
                />
              </div>
              {inviteStatus === "success" && (
                <div className="mb-4 text-green-600 font-medium">
                  Invitation sent successfully!
                </div>
              )}
              {inviteStatus === "error" && (
                <div className="mb-4 text-red-600 font-medium">
                  Failed to send invitation. Please try again.
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteStatus("");
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteStatus === "sending"}
                  className={`px-4 py-2 text-white rounded transition-colors ${
                    inviteStatus === "sending"
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
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
    </div>
  );
};

export default Sidebar;
