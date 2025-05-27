'use client';
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white shadow-lg rounded-lg p-6",
            },
          }}
          routing="path"
          path="/sign-in"
          redirectUrl={window?.location?.href || '/dashboard'}
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
} 