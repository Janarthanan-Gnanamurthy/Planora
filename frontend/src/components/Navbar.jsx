"use client";
import { useState, useEffect, useRef } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  X,
  Clock,
  FileText,
  Plus,
  Search,
  Sparkles,
  Send,
  Loader2,
} from "lucide-react";
import {
  getUserByClerkId,
  getProjects,
  getTasks,
  getUsers,
} from "../services/api";
import { smartTaskCreation } from "../services/api";
import { marked } from "marked";

// AI Assistant Component
const AIAssistant = ({ isOpen, onClose }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const { user } = useUser();
  const [backendUserId, setBackendUserId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const messagesEndRef = useRef(null);
  const [hasAIResponse, setHasAIResponse] = useState(false);
  const [showTaskCreationConfirm, setShowTaskCreationConfirm] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState(null);

  // Replace this with your actual FastAPI backend URL
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  const quickActions = [
    {
      id: "project_insights",
      icon: FileText,
      title: "Project Insights",
      description: "Get AI-powered insights for your project",
      placeholder: "Select a project to get insights...",
      endpoint: `${API_BASE_URL}/ai/project_insights`, // Updated endpoint
      requestKey: "project_id",
      needsProject: true,
    },
    {
      id: "suggest_tasks",
      icon: Plus,
      title: "Create Tasks",
      description: "Get AI-generated task suggestions and create them",
      placeholder: "Describe what tasks you need...",
      endpoint: `${API_BASE_URL}/ai/smart_task_creation`, // Updated endpoint
      requestKey: "description",
      needsProject: true,
    },
    {
      id: "analyze_task",
      icon: Search,
      title: "Analyze Task",
      description: "Analyze a task for complexity and suggestions",
      placeholder: "Select a task to analyze...",
      endpoint: `${API_BASE_URL}/ai/optimize_task`, // Updated endpoint
      requestKey: "task_id",
      needsTask: true,
    },
    {
      id: "assistant",
      icon: Sparkles,
      title: "Smart Assistant",
      description: "Ask anything about your projects or tasks",
      placeholder: "Ask me anything...",
      endpoint: `${API_BASE_URL}/ai/smart_assistant`, // Updated endpoint
      requestKey: "query",
    },
  ];

  useEffect(() => {
    const fetchBackendUserId = async () => {
      if (user && user.id) {
        try {
          console.log(user.id);
          const usersList = await getUsers();
          const projectsList = await getProjects();
          const dbUser = usersList.find((u) => u.clerkId === user.id);
          console.log("ewsrdtfvygbhunjmk", dbUser);
          const userProjects = projectsList.filter((project) => {
            // Ensure collaborators exists and is an array
            if (
              !project.collaborators ||
              !Array.isArray(project.collaborators)
            ) {
              return false;
            }
            // Check if user's database ID is in the collaborators array
            return project.collaborators.includes(dbUser.id);
          });

          console.log("Filtered user projects:", userProjects);
          setProjects(userProjects);

          setBackendUserId(dbUser?.id || null);
        } catch (err) {
          setBackendUserId(null);
        }
      }
    };
    fetchBackendUserId();
  }, [user]);

  useEffect(() => {
    const fetchProjectTasks = async () => {
      if (selectedProjectId) {
        try {
          const projectTasks = await getTasks({
            project_id: selectedProjectId,
          });
          setTasks(projectTasks);
        } catch (err) {
          setTasks([]);
        }
      } else {
        setTasks([]);
      }
    };
    fetchProjectTasks();
  }, [selectedProjectId]);

  useEffect(() => {
    setSelectedTaskId("");
  }, [selectedProjectId]);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      // Reset state when closing
      setTimeout(() => {
        setSelectedAction(null);
        setMessages([]);
        setInput("");
      }, 300);
    }
  }, [isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Reset hasAIResponse when action changes or modal closes
  useEffect(() => {
    setHasAIResponse(false);
  }, [selectedAction, isOpen]);

  // Set hasAIResponse to true when an AI message is added
  useEffect(() => {
    if (selectedAction && messages.some((m) => m.type === "ai")) {
      setHasAIResponse(true);
    }
  }, [messages, selectedAction]);

  const handleActionSelect = (action) => {
    setSelectedAction(action);
    setInput("");
    setMessages([]);
  };

  const handleCreateTasks = async (suggestedTasks) => {
    if (!selectedProjectId || !backendUserId) return;

    setIsLoading(true);
    try {
      // Use the correct endpoint and payload structure
      const payload = {
        user_id: backendUserId,
        project_id: selectedProjectId,
        description: input,
        auto_create: true,
      };

      const response = await fetch(`${API_BASE_URL}/ai/smart_task_creation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.created_tasks && result.created_tasks.length > 0) {
        const message = {
          type: "ai",
          content: `✅ Successfully created ${
            result.created_tasks.length
          } tasks!\n\n${result.created_tasks
            .map((t, i) => `${i + 1}. ${t.title}`)
            .join("\n")}\n\nTasks are now available in your project board.`,
        };
        setMessages((prev) => [...prev, message]);

        // Refresh project tasks to show newly created tasks
        if (selectedProjectId) {
          try {
            const updatedTasks = await getTasks({
              project_id: selectedProjectId,
            });
            setTasks(updatedTasks);

            // // Call the callback to update parent component if provided
            // if (onTasksUpdated) {
            //   onTasksUpdated(selectedProjectId);
            // }
          } catch (err) {
            console.error("Failed to refresh tasks:", err);
          }
        }
      } else {
        const message = {
          type: "ai",
          content:
            result.message ||
            "Tasks were processed but may not have been created successfully.",
        };
        setMessages((prev) => [...prev, message]);
      }

      setSuggestedTasks(null);
      setShowTaskCreationConfirm(false);
    } catch (error) {
      const errorMessage = {
        type: "error",
        content: `Error: Failed to create tasks. ${error.message}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (
      !input.trim() &&
      !(
        selectedAction &&
        (selectedAction.needsProject || selectedAction.needsTask)
      )
    )
      return;
    if (!selectedAction || isLoading) return;
    if (!backendUserId) {
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          content:
            "User not found in backend. Please refresh or try again later.",
        },
      ]);
      return;
    }

    // Validation for project/task selection
    if (selectedAction.needsProject && !selectedProjectId) {
      setMessages((prev) => [
        ...prev,
        { type: "error", content: "Please select a project." },
      ]);
      return;
    }
    if (selectedAction.needsTask && !selectedTaskId) {
      setMessages((prev) => [
        ...prev,
        { type: "error", content: "Please select a task." },
      ]);
      return;
    }

    // Show user message
    let userMessage;
    if (
      selectedAction.requestKey === "description" ||
      selectedAction.requestKey === "query"
    ) {
      userMessage = { type: "user", content: input };
    } else if (selectedAction.requestKey === "project_id") {
      const project = projects.find((p) => p.id === selectedProjectId);
      userMessage = {
        type: "user",
        content: `Project: ${project ? project.name : selectedProjectId}`,
      };
    } else if (selectedAction.requestKey === "task_id") {
      const task = tasks.find((t) => t.id === selectedTaskId);
      userMessage = {
        type: "user",
        content: `Task: ${task ? task.title : selectedTaskId}`,
      };
    }
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Special handling for task suggestions/creation
      if (selectedAction.id === "suggest_tasks") {
        const payload = {
          user_id: backendUserId,
          project_id: selectedProjectId,
          description: input,
          auto_create: false,
        };

        const response = await fetch(selectedAction.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.suggested_tasks && result.suggested_tasks.length > 0) {
          setSuggestedTasks(result.suggested_tasks);
          setShowTaskCreationConfirm(true);
          const message = {
            type: "ai",
            content: `I can help you create the following tasks:\n\n${result.suggested_tasks
              .map(
                (t, i) =>
                  `${i + 1}. **${t.title}**\n   Priority: ${
                    t.priority
                  }\n   Estimated: ${t.estimated_days} days\n   ${
                    t.description
                  }\n`
              )
              .join("\n")}\nWould you like me to create these tasks for you?`,
          };
          setMessages((prev) => [...prev, message]);
        } else {
          const message = {
            type: "ai",
            content:
              result.message ||
              "I couldn't generate any task suggestions. Please try rephrasing your request.",
          };
          setMessages((prev) => [...prev, message]);
        }
      } else {
        // Handle other actions
        let payload = { user_id: backendUserId };

        if (selectedAction.requestKey === "project_id" && selectedProjectId) {
          payload.project_id = selectedProjectId;
        }
        if (selectedAction.requestKey === "task_id" && selectedTaskId) {
          payload.task_id = selectedTaskId;
        }
        if (selectedAction.requestKey === "description") {
          payload.description = input;
        }
        if (selectedAction.requestKey === "query") {
          payload.query = input;
          // Include project/task context for smart assistant
          if (selectedProjectId) payload.project_id = selectedProjectId;
          if (selectedTaskId) payload.task_id = selectedTaskId;
        }

        const response = await fetch(selectedAction.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch (e) {}
          throw new Error(`API Error: ${errorMessage}`);
        }

        const jsonResult = await response.json();
        let result;

        // Parse response based on backend structure
        if (jsonResult.response) {
          result = jsonResult.response;
        } else if (jsonResult.analysis) {
          result =
            typeof jsonResult.analysis === "string"
              ? jsonResult.analysis
              : JSON.stringify(jsonResult.analysis, null, 2);
        } else if (jsonResult.error) {
          result = `Error: ${jsonResult.error}`;
        } else if (jsonResult.message) {
          result = jsonResult.message;
        } else {
          result = JSON.stringify(jsonResult, null, 2);
        }

        if (!result || result.trim() === "") {
          throw new Error("Empty response from AI service");
        }

        const aiMessage = { type: "ai", content: result };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      const errorMessage = {
        type: "error",
        content: `Error: ${error.message}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setInput("");
    }
  };

  const handleBack = () => {
    setSelectedAction(null);
    setMessages([]);
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  const handleGeneralSubmit = async () => {
    if (!input.trim()) return;
    if (!backendUserId) {
      setMessages([
        {
          type: "error",
          content:
            "User not found in backend. Please refresh or try again later.",
        },
      ]);
      return;
    }

    const smartAssistantAction = quickActions.find((a) => a.id === "assistant");
    setSelectedAction(smartAssistantAction);
    const userMessage = { type: "user", content: input };
    setMessages([userMessage]);
    setIsLoading(true);

    try {
      let payload = {
        user_id: backendUserId,
        query: input,
      };

      // Include context if available
      if (selectedProjectId) payload.project_id = selectedProjectId;
      if (selectedTaskId) payload.task_id = selectedTaskId;

      const response = await fetch(smartAssistantAction.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const jsonResult = await response.json();
      let result;

      if (jsonResult.response) {
        result = jsonResult.response;
      } else if (jsonResult.error) {
        result = `Error: ${jsonResult.error}`;
      } else if (jsonResult.message) {
        result = jsonResult.message;
      } else {
        result = JSON.stringify(jsonResult, null, 2);
      }

      if (!result || result.trim() === "") {
        throw new Error("Empty response from AI service");
      }

      const aiMessage = { type: "ai", content: result };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        type: "error",
        content: `Error: ${error.message}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setInput("");
    }
  };
  const handleTouchStart = (e) => {
    // Prevent default to avoid double-firing on mobile
    e.preventDefault();
  };

  const handleTouchEnd = (callback) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };
  const TaskCreationConfirmation = () => {
    if (!showTaskCreationConfirm || !suggestedTasks) return null;

    return (
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex space-x-2">
          <button
            onClick={() => handleCreateTasks(suggestedTasks)}
            disabled={isLoading}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd(handleSubmit)}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {isLoading ? "Creating..." : "Yes, Create Tasks"}
          </button>
          <button
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd(handleSubmit)}
            onClick={() => {
              setShowTaskCreationConfirm(false);
              setSuggestedTasks(null);
            }}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            No, Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? "block" : "hidden"}`}>
      {/* Background overlay - MAKE SURE onClick doesn't prevent other events */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isAnimating ? "opacity-30" : "opacity-0"
        }`}
        onClick={(e) => {
          e.stopPropagation(); // Prevent event bubbling
          onClose();
        }}
      />

      {/* Modal positioned in bottom-right */}
      <div className="absolute bottom-4 right-4">
        <div
          className={`bg-gray-900 rounded-lg shadow-2xl w-96 max-h-[600px] flex flex-col transform transition-all duration-300 ease-out origin-bottom-right ${
            isAnimating
              ? "scale-100 opacity-100 translate-y-0"
              : "scale-50 opacity-0 translate-y-4"
          }`}
          onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
        >
          {/* Header - same as before */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              {selectedAction && (
                <button
                  onClick={handleBack}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <div className="w-4 h-4 border-l-2 border-t-2 border-gray-400 transform rotate-[-45deg]"></div>
                </button>
              )}
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-semibold">
                {selectedAction
                  ? selectedAction.title
                  : "Hi, how can I help you?"}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content - same structure but modified chat interface */}
          <div className="flex-1 overflow-hidden">
            {!selectedAction ? (
              /* Quick Actions - same as before */
              <div className="p-4">
                <div className="text-sm text-gray-400 mb-4">For you</div>
                <div className="space-y-2">
                  {quickActions.map((action) => {
                    const IconComponent = action.icon;
                    return (
                      <button
                        key={action.id}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd(() =>
                          handleActionSelect(action)
                        )}
                        onClick={() => handleActionSelect(action)}
                        className="w-full flex items-center space-x-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left"
                      >
                        <IconComponent className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-white font-medium">
                            {action.title}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {action.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Chat Interface - same structure */
              <div className="flex flex-col h-full">
                {/* Project/Task Dropdowns - same as before */}
                {!hasAIResponse && (
                  <div className="p-4 pb-0 flex flex-col gap-2">
                    <label className="text-xs text-gray-400 mb-1">
                      Project
                    </label>
                    <select
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                    >
                      <option value="">Select a project (optional)</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    {selectedProjectId && (
                      <>
                        <label className="text-xs text-gray-400 mb-1 mt-2">
                          Task
                        </label>
                        <select
                          className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={selectedTaskId}
                          onChange={(e) => setSelectedTaskId(e.target.value)}
                        >
                          <option value="">Select a task (optional)</option>
                          {tasks.map((task) => (
                            <option key={task.id} value={task.id}>
                              {task.title}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                )}

                {/* Messages area - same as before */}
                <div
                  className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[200px]"
                  style={{ maxHeight: 320 }}
                >
                  {messages.length === 0 && (
                    <div className="text-gray-400 text-center py-8">
                      {selectedAction.description}
                    </div>
                  )}
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.type === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {selectedAction &&
                        selectedAction.id === "project_insights" &&
                        message.type === "ai" ? (
                          <div
                            className={`max-w-[80%] p-3 rounded-lg whitespace-pre-wrap bg-gray-700 text-gray-100`}
                            dangerouslySetInnerHTML={{ __html: marked.parse(message.content) }}
                          />
                        ) : (
                          <div
                            className={`max-w-[80%] p-3 rounded-lg whitespace-pre-wrap ${
                              message.type === "user"
                                ? "bg-blue-600 text-white"
                                : message.type === "error"
                                ? "bg-red-600 text-white"
                                : "bg-gray-700 text-gray-100"
                            }`}
                          >
                            {message.content}
                          </div>
                        )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-700 text-gray-100 p-3 rounded-lg flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Task Creation Confirmation */}
                <TaskCreationConfirmation />

                {/* Input Area - same as before */}
                <div className="p-4 border-t border-gray-700">
                  <div className="flex items-end space-x-2">
                    <div className="flex-1">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={selectedAction.placeholder}
                        className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows="1"
                        disabled={isLoading}
                        style={{
                          minHeight: "44px",
                          maxHeight: "120px",
                        }}
                        onInput={(e) => {
                          e.target.style.height = "auto";
                          e.target.style.height =
                            Math.min(e.target.scrollHeight, 120) + "px";
                        }}
                      />
                    </div>
                    <button
                      onClick={handleSubmit}
                      disabled={!input.trim() || isLoading}
                      className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* General Input Area - same as before */}
          {!selectedAction && (
            <div className="p-4 border-t border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim()) {
                          handleGeneralSubmit();
                        }
                      }
                    }}
                    placeholder="Ask me anything"
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows="1"
                    style={{
                      minHeight: "44px",
                      maxHeight: "120px",
                    }}
                    onInput={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height =
                        Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                  />
                </div>
                <button
                  onClick={handleGeneralSubmit}
                  disabled={!input.trim()}
                  className="mb-[0.38rem] px-3 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Navbar Component
export default function Navbar() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleTasksUpdated = (projectId) => {
    // Trigger a refresh of the project board or task list
    setRefreshTrigger((prev) => prev + 1);

    // If you have a specific function to refresh tasks for a project, call it here
    // refreshProjectTasks(projectId);

    // Or if you need to refresh the entire page data
    window.location.reload(); // As a last resort
  };

  return (
    <>
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/" className="flex items-center">
                <span className="text-xl font-bold text-blue-600">Planora</span>
              </Link>
            </div>

            {/* Desktop menu */}
            <div className="hidden sm:flex sm:items-center sm:space-x-4">
              {isSignedIn ? (
                <>
                  <Link
                    href="/project"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Projects
                  </Link>

                  {/* AI Assistant Button */}
                  <button
                    onClick={() => setIsAIOpen(true)}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>AI Assistant</span>
                  </button>

                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8",
                      },
                    }}
                  />
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push("/sign-in")}
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => router.push("/sign-up")}
                    className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="sm:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {isSignedIn ? (
                <>
                  <Link
                    href="/project"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  >
                    Projects
                  </Link>

                  {/* Mobile AI Assistant Button */}
                  <button
                    onClick={() => {
                      setIsAIOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full text-left px-3 py-2 text-base font-medium bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>AI Assistant</span>
                  </button>

                  <div className="px-3 py-2">
                    <UserButton
                      afterSignOutUrl="/"
                      appearance={{
                        elements: {
                          avatarBox: "w-8 h-8",
                        },
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push("/sign-in")}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => router.push("/sign-up")}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* AI Assistant Modal */}

      <AIAssistant
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        // onTasksUpdated={handleTasksUpdated}
      />
    </>
  );
}
