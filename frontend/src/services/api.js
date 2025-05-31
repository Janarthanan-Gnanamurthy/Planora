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
  console.log('got users')
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

  if (!response.ok) {
    throw new Error(`Failed to delete task: ${response.status}`);
  }

  // DELETE operations often return empty responses (204 No Content)
  // Don't try to parse JSON if response is empty
  if (response.status === 204 || !response.headers.get("content-length")) {
    return { success: true };
  }

  return handleResponse(response);
};

// AI API calls
export const summarizeTask = async (description) => {
  const response = await fetch(`${API_BASE_URL}/ai/summarize_task`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description }),
  });
  return handleResponse(response);
};

export const suggestTasks = async (projectDescription) => {
  const response = await fetch(`${API_BASE_URL}/ai/suggest_tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ project_description: projectDescription }),
  });
  return handleResponse(response);
};

export const analyzeComment = async (commentContent) => {
  const response = await fetch(`${API_BASE_URL}/ai/analyze_comment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment_content: commentContent }),
  });
  return handleResponse(response);
};

export const complexTaskAssistant = async (query) => {
  const response = await fetch(`${API_BASE_URL}/ai/complex_task_assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  return handleResponse(response);
};



// Add this function to your API utilities file (where getTasks, getProjects are defined)

export const smartTaskCreation = async (userId, projectId, description, autoCreate = false) => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  
  const response = await fetch(`${API_BASE_URL}/ai/smart-task-creation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      project_id: projectId,
      description: description,
      auto_create: autoCreate
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
};