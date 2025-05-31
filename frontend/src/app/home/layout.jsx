"use client";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useState } from "react";

export default function HomeLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  // Handle loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect if not signed in
  if (!isSignedIn) {
    router.push("/sign-in");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <main
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isCollapsed ? "ml-16" : "ml-72"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
