const API_BASE_URL = "http://127.0.0.1:8000";

// Helper function to handle API responses
const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "API request failed");
  }
  return data;
};

// User API calls
export const createUser = async (userData) => {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });
  return handleResponse(response);
};

export const getUser = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`);
  return handleResponse(response);
};

export const getUserByClerkId = async (clerkId) => {
  const response = await fetch(`${API_BASE_URL}/users?clerkId=${clerkId}`);
  const data = await handleResponse(response);
  return Array.isArray(data) ? data[0] : null;
};

export const getUsers = async (skip = 0, limit = 100) => {
  const response = await fetch(
    `${API_BASE_URL}/users?skip=${skip}&limit=${limit}`
  );
  return handleResponse(response);
};

// Project API calls
export const createProject = async (projectData) => {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(projectData),
  });
  return handleResponse(response);
};

export const getProjects = async (skip = 0, limit = 100) => {
  const response = await fetch(
    `${API_BASE_URL}/projects?skip=${skip}&limit=${limit}`
  );
  return handleResponse(response);
};

export const getProject = async (projectId) => {
  try {
    console.log("API call with ID:", projectId);
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`);
    return handleResponse(response);
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
};

// Project collaborators
// export const getProjectCollaborators = async (projectId) => {
//   try {
//     const response = await fetch(`${API_BASE_URL}/projects/${projectId}/collaborators`);
//     return handleResponse(response);
//   } catch (error) {
//     console.error('Error fetching collaborators:', error);
//     return [];
//   }
// };

// export const addProjectCollaborator = async (projectId, userId) => {
//   const response = await fetch(`${API_BASE_URL}/projects/${projectId}/collaborators`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({ user_id: userId }),
//   });
//   return handleResponse(response);
// };

// Task API calls
export const createTask = async (taskData) => {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(taskData),
  });
  return handleResponse(response);
};

export const getTasks = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.project_id) queryParams.append("project_id", filters.project_id);
  if (filters.assigned_to_id)
    queryParams.append("assigned_to_id", filters.assigned_to_id);
  if (filters.status) queryParams.append("status", filters.status);
  if (filters.skip) queryParams.append("skip", filters.skip);
  if (filters.limit) queryParams.append("limit", filters.limit);

  const response = await fetch(
    `${API_BASE_URL}/tasks?${queryParams.toString()}`
  );
  return handleResponse(response);
};

export const getTask = async (taskId) => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`);
  return handleResponse(response);
};

export const updateTask = async (taskId, taskData) => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(taskData),
  });
  return handleResponse(response);
};

export const deleteTask = async (taskId) => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: "DELETE",
  });
  return handleResponse(response);
};
