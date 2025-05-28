"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { getUserByClerkId } from "../../../services/api";

export default function AcceptInvite({ params }) {
  const [status, setStatus] = useState("loading");
  const [token, setToken] = useState(null);
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  // Resolve params and extract token
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      const extractedToken = resolvedParams?.token;
      setToken(extractedToken);

      // Store the token in sessionStorage when available
      if (extractedToken && typeof window !== "undefined") {
        sessionStorage.setItem("inviteToken", extractedToken);
      }
    };

    resolveParams();
  }, [params]);

  useEffect(() => {
    const processInvitation = async () => {
      if (!isLoaded || !token) return;

      if (!isSignedIn) {
        // Don't redirect here, we'll show the sign-in form
        return;
      }

      // Get the token from sessionStorage (with window check)
      const storedToken =
        typeof window !== "undefined"
          ? sessionStorage.getItem("inviteToken")
          : token;

      if (!storedToken) {
        setStatus("error");
        return;
      }

      try {
        // Decode the invitation token
        console.log("Original token:", storedToken);
        // Clean the token by removing any URL-safe characters that might have been added
        const cleanToken = storedToken.replace(/-/g, "+").replace(/_/g, "/");
        console.log("Cleaned token:", cleanToken);
        const decodedToken = Buffer.from(cleanToken, "base64").toString();
        console.log("Decoded token:", decodedToken);
        const [email, projectId] = decodedToken.trim().split(":");
        console.log("Split values - Email:", email, "ProjectId:", projectId);

        // Verify that the signed-in user's email matches the invitation
        if (user.emailAddresses.some((e) => e.emailAddress === email)) {
          // Get the user's database ID using their Clerk ID
          const dbUser = await getUserByClerkId(user.id);

          if (!dbUser) {
            console.error("User not found in database");
            setStatus("error");
            return;
          }

          console.log(dbUser, projectId); // Add user as collaborator using the API endpoint
          const response = await fetch("/api/projects/add-collaborators", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              project_id: projectId,
              collaborator_ids: [dbUser.id],
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to add collaborator");
          }

          setStatus("success");

          // Clear the stored token
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("inviteToken");
          }

          // Redirect to the project after a short delay
          setTimeout(() => {
            router.push(`/project/${projectId.replace(/-/g, "_")}`);
          }, 2000);
        } else {
          setStatus("error");
        }
      } catch (error) {
        console.error("Failed to process invitation:", error);
        setStatus("error");
      }
    };

    processInvitation();
  }, [isLoaded, isSignedIn, user, router, token]);

  // If not signed in, show the sign-in form
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">
              Accept Invitation
            </h1>
            <p className="text-gray-600 mt-2">
              Please sign in or sign up to accept the invitation
            </p>
          </div>
          <SignIn
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-white shadow-lg rounded-lg p-6",
              },
            }}
            routing="path"
            path="/sign-in"
            redirectUrl={
              typeof window !== "undefined" ? window.location.href : undefined
            }
            signUpUrl="/sign-up"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        {status === "loading" && (
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Processing Invitation
            </h1>
            <p className="text-gray-600">
              Please wait while we process your invitation...
            </p>
          </div>
        )}
        {status === "success" && (
          <div>
            <h1 className="text-2xl font-bold text-green-600 mb-4">
              Invitation Accepted!
            </h1>
            <p className="text-gray-600">
              You have been successfully added to the project.
            </p>
            <p className="text-gray-600 mt-2">
              Redirecting you to the project page...
            </p>
          </div>
        )}
        {status === "error" && (
          <div>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600">
              Failed to process the invitation. Please try again or contact
              support.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
