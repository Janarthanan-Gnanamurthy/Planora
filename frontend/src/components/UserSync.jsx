"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createUser, getUserByClerkId } from "../services/api";

export default function UserSync() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    const syncUser = async () => {
      console.log("UserSync: syncUser called", { isSignedIn, user });
      
      if (!isSignedIn || !user) {
        console.log("UserSync: No signed-in user, skipping");
        return;
      }

      console.log("UserSync: Checking if user exists in backend", { clerkId: user.id });

      try {
        // First check if user already exists
        const existingUser = await getUserByClerkId(user.id);
        
        if (existingUser) {
          console.log("UserSync: User already exists in backend", existingUser);
          return;
        }

        console.log("UserSync: User not found, creating new user in backend", {
          username: user.fullName || user.username || user.primaryEmailAddress?.emailAddress,
          clerkId: user.id,
        });

        // Only create user if they don't exist
        await createUser({
          username:
            user.fullName ||
            user.username ||
            user.primaryEmailAddress?.emailAddress,
          clerkId: user.id,
        });
        console.log("UserSync: User created successfully");
      } catch (error) {
        console.error("UserSync: Failed to sync user", error);
      }
    };

    syncUser();
  }, [isSignedIn, user]);

  return null;
}
