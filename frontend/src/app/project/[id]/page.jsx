"use client";
import React, { useEffect, useState, use } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import TaskBoard from "../../../components/TaskBoard";
import { getProject, getUserByClerkId, getUsers } from "../../../services/api";

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
          <h1 className="text-3xl font-bold text-gray-800">{project.name}</h1>
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
        <TaskBoard project={project} users={collaborators} />
      </div>
    </div>
  );
}
