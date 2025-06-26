
import { useEffect, ReactNode, useState } from 'react';
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
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    console.log('🔄 RouteGuard: Checking permissions', { 
      user: !!user, 
      userProfile: !!userProfile, 
      isLoading, 
      requireAuth, 
      requireAdmin 
    });

    // Show loading while auth is checking, but with timeout
    if (isLoading) {
      setShouldRender(false);
      // Set a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.log('⏰ RouteGuard: Loading timeout - allowing render');
        setShouldRender(true);
      }, 2000);
      return () => clearTimeout(timeout);
    }

    // For routes that don't require auth, always render
    if (!requireAuth && !requireAdmin) {
      console.log('✅ RouteGuard: Public route - allowing access');
      setShouldRender(true);
      return;
    }

    // Check auth requirements
    if (requireAuth && !user) {
      console.log('🔄 RouteGuard: Redirecting to auth - no user');
      navigate(redirectTo, { replace: true });
      setShouldRender(false);
      return;
    }

    if (requireAdmin && (!user || !userProfile || userProfile.role !== 'admin')) {
      console.log('🔄 RouteGuard: Redirecting to home - not admin');
      navigate('/', { replace: true });
      setShouldRender(false);
      return;
    }

    console.log('✅ RouteGuard: Access granted');
    setShouldRender(true);
  }, [user, userProfile, isLoading, requireAuth, requireAdmin, navigate, redirectTo]);

  // Show loading while auth is checking (with shorter timeout)
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

  // Don't render anything if we're redirecting
  if (!shouldRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
