"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createUser } from "../services/api";

export default function UserSync() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    const syncUser = async () => {
      if (!isSignedIn || !user) return;

      try {
        await createUser({
          username: user.fullName || user.username || user.primaryEmailAddress?.emailAddress,
          clerkId: user.id,
        });
      } catch (err) {
        console.error("Failed to sync user with FastAPI:", err);
      }
    };

    syncUser();
  }, [isSignedIn, user]);

  return null;
}
