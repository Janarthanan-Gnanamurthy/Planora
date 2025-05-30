"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

// Toast Context
const ToastContext = createContext();

// Toast types
const TOAST_TYPES = {
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconColor: "text-green-600",
    titleColor: "text-green-900",
    descColor: "text-green-700",
  },
  error: {
    icon: AlertCircle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-600",
    titleColor: "text-red-900",
    descColor: "text-red-700",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    iconColor: "text-yellow-600",
    titleColor: "text-yellow-900",
    descColor: "text-yellow-700",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
    titleColor: "text-blue-900",
    descColor: "text-blue-700",
  },
};

// Individual Toast Component
const Toast = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const toastConfig = TOAST_TYPES[toast.type] || TOAST_TYPES.info;
  const IconComponent = toastConfig.icon;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    const removeTimer = setTimeout(() => {
      handleRemove();
    }, toast.duration || 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, []);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300);
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out mb-3
        ${
          isVisible && !isLeaving
            ? "translate-x-0 opacity-100 scale-100"
            : "translate-x-full opacity-0 scale-95"
        }
      `}
    >
      <div
        className={`
        ${toastConfig.bgColor} ${toastConfig.borderColor}
        border rounded-xl shadow-lg backdrop-blur-sm
        p-4 pr-12 max-w-md w-full relative overflow-hidden
      `}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent pointer-events-none" />

        <div className="flex items-start gap-3 relative">
          <div className={`${toastConfig.iconColor} flex-shrink-0 mt-0.5`}>
            <IconComponent size={20} />
          </div>

          <div className="flex-1 min-w-0">
            <h4
              className={`${toastConfig.titleColor} font-semibold text-sm leading-tight`}
            >
              {toast.title}
            </h4>
            {toast.description && (
              <p
                className={`${toastConfig.descColor} text-sm mt-1 leading-relaxed`}
              >
                {toast.description}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleRemove}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-lg hover:bg-white/50"
        >
          <X size={16} />
        </button>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 overflow-hidden">
          <div
            className={`h-full ${toastConfig.iconColor.replace(
              "text-",
              "bg-"
            )} opacity-60 animate-shrink`}
            style={{
              animationDuration: `${toast.duration || 5000}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Toast Container
const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <>
      <div className="fixed top-4 right-4 z-50 space-y-0">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>

      <style jsx global>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .animate-shrink {
          animation: shrink linear forwards;
        }
      `}</style>
    </>
  );
};

// Toast Provider Component
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (title, description, type = "info", duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      title,
      description,
      type,
      duration,
    };

    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

// Custom hook export
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
