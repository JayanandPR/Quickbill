import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[]; // if omitted, any logged-in user can access
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        You don't have access to this page.
      </div>
    );
  }

  return <>{children}</>;
}