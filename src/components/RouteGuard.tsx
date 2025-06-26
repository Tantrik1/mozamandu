
import { useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export function RouteGuard({ 
  children, 
  requireAuth = false, 
  requireAdmin = false,
  redirectTo = '/auth' 
}: RouteGuardProps) {
  const { user, userProfile, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect after loading is complete
    if (isLoading) return;

    if (requireAuth && !user) {
      console.log('Redirecting unauthenticated user to:', redirectTo);
      navigate(redirectTo, { replace: true });
      return;
    }

    if (requireAdmin && (!user || !userProfile || userProfile.role !== 'admin')) {
      console.log('Redirecting non-admin user to home');
      navigate('/', { replace: true });
      return;
    }
  }, [user, userProfile, isLoading, requireAuth, requireAdmin, navigate, redirectTo]);

  // Show loading while authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if user should be redirected
  if (requireAuth && !user) return null;
  if (requireAdmin && (!user || !userProfile || userProfile.role !== 'admin')) return null;

  return <>{children}</>;
}
