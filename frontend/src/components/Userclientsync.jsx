// components/ClientUserSync.jsx
"use client";
import { useUser } from "@clerk/nextjs";
import UserSync from "./UserSync";

export default function ClientUserSync() {
  const { user } = useUser();
  return !user ? <UserSync /> : null;
}
