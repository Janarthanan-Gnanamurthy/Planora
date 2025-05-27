"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export default function UserSync() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    const syncUser = async () => {
      if (!isSignedIn || !user) return;

      try {
        // Directly POST to FastAPI backend
        await fetch("http://127.0.0.1:8000/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username:
              user.fullName ||
              user.username ||
              user.primaryEmailAddress?.emailAddress,
          }),
        });
      } catch (err) {
        console.error("Failed to sync user with FastAPI:", err);
      }
    };

    syncUser();
  }, [isSignedIn, user]);

  return null;
}
