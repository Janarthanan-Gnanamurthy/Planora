'use client';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import useStore from '@/store/useStore';
import { SignIn } from "@clerk/nextjs";

export default function AcceptInvite({ params }) {
  const [status, setStatus] = useState('loading');
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const { addCollaborator } = useStore();
  const token = params?.token;

  // Store the token in sessionStorage when the component mounts
  useEffect(() => {
    if (token) {
      sessionStorage.setItem('inviteToken', token);
    }
  }, [token]);

  useEffect(() => {
    const processInvitation = async () => {
      if (!isLoaded) return;

      if (!isSignedIn) {
        // Don't redirect here, we'll show the sign-in form
        return;
      }

      // Get the token from sessionStorage
      const storedToken = sessionStorage.getItem('inviteToken');
      if (!storedToken) {
        setStatus('error');
        return;
      }

      try {
        // Decode the invitation token
        const decodedToken = Buffer.from(storedToken, 'base64').toString();
        const [email, projectId] = decodedToken.split(':');

        // Verify that the signed-in user's email matches the invitation
        if (user.emailAddresses.some(e => e.emailAddress === email)) {
          // Add user as collaborator
          addCollaborator(projectId, {
            id: user.id,
            name: user.fullName || 'Unknown User',
            email: email
          });
          setStatus('success');
          
          // Clear the stored token
          sessionStorage.removeItem('inviteToken');
          
          // Redirect to the project after a short delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Failed to process invitation:', error);
        setStatus('error');
      }
    };

    processInvitation();
  }, [isLoaded, isSignedIn, user, router, addCollaborator]);

  // If not signed in, show the sign-in form
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Accept Invitation</h1>
            <p className="text-gray-600 mt-2">Please sign in or sign up to accept the invitation</p>
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
            redirectUrl={window?.location?.href}
            signUpUrl="/sign-up"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Processing invitation...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Invitation Accepted!
            </h1>
            <p className="text-gray-600">
              You have been successfully added to the project. Redirecting to dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">×</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Invalid Invitation
            </h1>
            <p className="text-gray-600">
              This invitation link is invalid or has expired. Please request a new invitation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 