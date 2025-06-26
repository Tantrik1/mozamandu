
import { ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useAuthState } from '@/hooks/useAuthState';
import { authService } from '@/services/authService';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, session, userProfile, isLoading } = useAuthState();

  const signIn = async (email: string, password: string) => {
    return authService.signIn(email, password);
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    return authService.signUp(email, password, fullName);
  };

  const signOut = async () => {
    return authService.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userProfile,
      isLoading,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
