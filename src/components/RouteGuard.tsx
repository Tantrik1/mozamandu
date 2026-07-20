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
    // Only redirect after auth has finished loading
    if (isLoading) return;

    if (requireAuth && !user) {
      navigate(redirectTo, { replace: true });
      return;
    }

    if (requireAdmin && (!user || !userProfile || userProfile.role !== 'admin')) {
      navigate('/', { replace: true });
    }
  }, [user, userProfile, isLoading, requireAuth, requireAdmin, navigate, redirectTo]);

  // Show minimal loader only while auth is initializing (max ~500ms)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Don't render if redirecting
  if (requireAuth && !user) return null;
  if (requireAdmin && (!user || !userProfile || userProfile.role !== 'admin')) return null;

  return <>{children}</>;
}
