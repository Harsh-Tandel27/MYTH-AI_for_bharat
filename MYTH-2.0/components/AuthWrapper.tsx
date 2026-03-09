import { useAuth, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';

interface AuthWrapperProps {
  children: React.ReactNode;
  pageName: string;
}

export default function AuthWrapper({ children, pageName }: AuthWrapperProps) {
  const { isLoaded, isSignedIn } = useAuth();

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Authentication Required
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please sign in to access {pageName}
            </p>
          </div>
          <div className="mt-8 space-y-4">
            <SignInButton mode="modal">
              <button className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Sign in to continue
              </button>
            </SignInButton>
            <div className="text-center">
              <Link href="/" className="text-sm text-blue-600 hover:text-blue-500">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
