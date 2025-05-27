'use client';
import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from 'next/navigation';

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/project';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white shadow-lg rounded-lg p-6",
            },
          }}
          routing="path"
          path="/sign-up"
          redirectUrl={redirectUrl}
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
} 