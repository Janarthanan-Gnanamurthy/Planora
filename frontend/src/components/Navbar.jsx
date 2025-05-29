"use client";
import { useState, useEffect } from "react";
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
import { getUserByClerkId, getProjects, getTasks } from "../services/api";

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

  // Replace this with your actual FastAPI backend URL
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  const quickActions = [
    {
      id: "summarize",
      icon: FileText,
      title: "Summarize a task",
      description: "Get a concise summary of any task description",
      placeholder: "Enter task description to summarize...",
      endpoint: `${API_BASE_URL}/ai/summarize_task`,
      requestKey: "description",
    },
    {
      id: "suggest",
      icon: Plus,
      title: "Suggest tasks for project",
      description: "Get AI-generated task suggestions based on your project",
      placeholder: "Describe your project to get task suggestions...",
      endpoint: `${API_BASE_URL}/ai/suggest_tasks`,
      requestKey: "project_description",
    },
    {
      id: "analyze",
      icon: Search,
      title: "Analyze comment tone",
      description: "Understand the sentiment and tone of comments",
      placeholder: "Enter comment to analyze...",
      endpoint: `${API_BASE_URL}/ai/analyze_comment`,
      requestKey: "comment_content",
    },
    {
      id: "assistant",
      icon: Sparkles,
      title: "Complex task assistant",
      description: "Get help with complex task-related queries",
      placeholder: "Ask me anything about your tasks...",
      endpoint: `${API_BASE_URL}/ai/complex_task_assistant`,
      requestKey: "query",
    },
  ];

  useEffect(() => {
    const fetchBackendUserId = async () => {
      if (user && user.id) {
        try {
          const dbUser = await getUserByClerkId(user.id);
          setBackendUserId(dbUser?.id || null);
        } catch (err) {
          setBackendUserId(null);
        }
      }
    };
    fetchBackendUserId();
  }, [user]);

  useEffect(() => {
    const fetchUserProjects = async () => {
      if (isOpen && backendUserId) {
        try {
          const allProjects = await getProjects();
          // Filter projects where user is a collaborator
          const userProjects = allProjects.filter(p => p.collaborators?.includes(backendUserId));
          setProjects(userProjects);
        } catch (err) {
          setProjects([]);
        }
      }
    };
    fetchUserProjects();
  }, [isOpen, backendUserId]);

  useEffect(() => {
    const fetchProjectTasks = async () => {
      if (selectedProjectId) {
        try {
          const projectTasks = await getTasks({ project_id: selectedProjectId });
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

  const handleActionSelect = (action) => {
    setSelectedAction(action);
    setInput("");
    setMessages([]);
  };

  const handleSubmit = async () => {
    if (!input.trim() || !selectedAction || isLoading) return;
    if (!backendUserId) {
      setMessages((prev) => [...prev, { type: "error", content: "User not found in backend. Please refresh or try again later." }]);
      return;
    }
    const userMessage = { type: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    try {
      const payload = {
        user_id: backendUserId,
        project_id: selectedProjectId || null,
        task_id: selectedTaskId || null,
        [selectedAction.requestKey]: input,
      };
      const response = await fetch(selectedAction.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch (e) {
          console.error("Error reading error response:", e);
        }
        throw new Error(`API Error: ${errorMessage}`);
      }

      // Try to parse as JSON first, then fall back to text
      let result;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const jsonResult = await response.json();
        console.log("JSON Response:", jsonResult);

        // Handle different possible JSON response formats for your FastAPI backend
        if (typeof jsonResult === "string") {
          result = jsonResult;
        } else if (jsonResult.summary) {
          // For summarize task endpoint
          result = jsonResult.summary;
        } else if (jsonResult.suggestions) {
          // For suggest tasks endpoint
          result = Array.isArray(jsonResult.suggestions)
            ? jsonResult.suggestions.join("\n• ")
            : jsonResult.suggestions;
        } else if (jsonResult.analysis) {
          // For analyze comment endpoint
          result = jsonResult.analysis;
        } else if (jsonResult.response) {
          // For complex assistant endpoint
          result = jsonResult.response;
        } else if (jsonResult.message) {
          result = jsonResult.message;
        } else if (jsonResult.result) {
          result = jsonResult.result;
        } else if (jsonResult.data) {
          result = jsonResult.data;
        } else {
          // If none of the expected keys are found, stringify the whole response
          result = JSON.stringify(jsonResult, null, 2);
        }
      } else {
        result = await response.text();
        console.log("Text Response:", result);
      }

      if (!result || result.trim() === "") {
        throw new Error("Empty response from AI service");
      }

      const aiMessage = { type: "ai", content: result };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      const errorMessage = {
        type: "error",
        content: `Error: ${error.message}. Please check the console for more details.`,
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
      setMessages([{ type: "error", content: "User not found in backend. Please refresh or try again later." }]);
      return;
    }
    const complexAction = quickActions[3];
    setSelectedAction(complexAction);
    const userMessage = { type: "user", content: input };
    setMessages([userMessage]);
    setIsLoading(true);
    try {
      const payload = {
        user_id: backendUserId,
        project_id: selectedProjectId || null,
        task_id: selectedTaskId || null,
        [complexAction.requestKey]: input,
      };
      const response = await fetch(complexAction.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch (e) {
          console.error("Error reading error response:", e);
        }
        throw new Error(`API Error: ${errorMessage}`);
      }

      let result;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const jsonResult = await response.json();
        console.log("JSON Response:", jsonResult);

        // Handle different possible JSON response formats for your FastAPI backend
        if (typeof jsonResult === "string") {
          result = jsonResult;
        } else if (jsonResult.summary) {
          // For summarize task endpoint
          result = jsonResult.summary;
        } else if (jsonResult.suggested_tasks) {
          // For suggest tasks endpoint
          result = Array.isArray(jsonResult.suggested_tasks)
            ? jsonResult.suggested_tasks.join("\n• ")
            : jsonResult.suggested_tasks;
        } else if (jsonResult.analysis) {
          // For analyze comment endpoint
          result = jsonResult.analysis;
        } else if (jsonResult.response) {
          // For complex assistant endpoint
          result = jsonResult.response;
        } else if (jsonResult.message) {
          result = jsonResult.message;
        } else if (jsonResult.result) {
          result = jsonResult.result;
        } else if (jsonResult.data) {
          result = jsonResult.data;
        } else {
          // If none of the expected keys are found, stringify the whole response
          result = JSON.stringify(jsonResult, null, 2);
        }
      } else {
        result = await response.text();
        console.log("Text Response:", result);
      }

      if (!result || result.trim() === "") {
        throw new Error("Empty response from AI service");
      }

      const aiMessage = { type: "ai", content: result };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      const errorMessage = {
        type: "error",
        content: `Error: ${error.message}. Please check the console for more details.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setInput("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Background overlay */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 pointer-events-auto ${
          isAnimating ? "opacity-30" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Modal positioned in bottom-right */}
      <div className="absolute bottom-4 right-4 pointer-events-auto">
        <div
          className={`bg-gray-900 rounded-lg shadow-2xl w-96 max-h-[600px] flex flex-col transform transition-all duration-300 ease-out origin-bottom-right ${
            isAnimating
              ? "scale-100 opacity-100 translate-y-0"
              : "scale-50 opacity-0 translate-y-4"
          }`}
        >
          {/* Header */}
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

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {!selectedAction ? (
              /* Quick Actions */
              <div className="p-4">
                <div className="text-sm text-gray-400 mb-4">For you</div>
                <div className="space-y-2">
                  {quickActions.map((action) => {
                    const IconComponent = action.icon;
                    return (
                      <button
                        key={action.id}
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
              /* Chat Interface */
              <div className="flex flex-col h-full">
                {/* Project/Task Dropdowns */}
                <div className="p-4 pb-0 flex flex-col gap-2">
                  <label className="text-xs text-gray-400 mb-1">Project</label>
                  <select
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">Select a project (optional)</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  {selectedProjectId && (
                    <>
                      <label className="text-xs text-gray-400 mb-1 mt-2">Task</label>
                      <select
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedTaskId}
                        onChange={e => setSelectedTaskId(e.target.value)}
                      >
                        <option value="">Select a task (optional)</option>
                        {tasks.map(task => (
                          <option key={task.id} value={task.id}>
                            {task.title}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[200px]">
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
                </div>

                {/* Input Area */}
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

          {/* General Input Area - Always visible at bottom */}
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
      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </>
  );
}
