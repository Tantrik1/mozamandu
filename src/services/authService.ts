
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Helper function to translate technical errors into user-friendly messages
const translateErrorMessage = (error: any): string => {
  const message = error.message || error.toString();
  
  // Password validation errors
  if (message.includes('Password should contain at least one character of each')) {
    return 'Password must contain at least 8 characters including uppercase, lowercase, numbers, and special characters (!@#$%^&*).';
  }
  
  if (message.includes('Password is too weak')) {
    return 'Please create a stronger password with at least 8 characters including uppercase, lowercase, numbers, and special characters.';
  }
  
  if (message.includes('Password must be at least')) {
    return 'Password must be at least 8 characters long.';
  }
  
  // Email validation errors
  if (message.includes('Invalid email')) {
    return 'Please enter a valid email address.';
  }
  
  // Network/connection errors
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Connection error. Please check your internet connection and try again.';
  }
  
  // Rate limiting
  if (message.includes('rate limit')) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }
  
  // Default fallback for other errors
  if (message.includes('User already registered')) {
    return 'An account with this email already exists. Please try signing in instead.';
  }
  
  if (message.includes('Email not confirmed')) {
    return 'Please verify your email before signing in. Check your inbox for the verification link.';
  }
  
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  
  // Return original message if no translation found
  return message;
};

export const authService = {
  async signIn(email: string, password: string) {
    try {
      console.log('🔄 AuthService: Starting sign in');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      if (error) {
        console.error('❌ AuthService: Sign in error:', error);
        return { error: { message: translateErrorMessage(error) } };
      }
      
      // Check if email is confirmed
      if (data.user && !data.user.email_confirmed_at) {
        console.warn('⚠️ AuthService: User email not confirmed');
        await supabase.auth.signOut();
        return { error: { message: 'Please verify your email before signing in. Check your inbox for the verification link.' } };
      }
      
      console.log('✅ AuthService: Sign in successful');
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      
      return { error: null };
    } catch (error) {
      console.error('❌ AuthService: Sign in exception:', error);
      return { error };
    }
  },

  async signUp(email: string, password: string, fullName: string) {
    try {
      console.log('🔄 AuthService: Starting sign up');
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?confirmed=true`,
          data: {
            full_name: fullName.trim(),
          }
        }
      });

      if (error) {
        console.error('❌ AuthService: Sign up error:', error);
        return { error: { message: translateErrorMessage(error) } };
      }

      if (data.user && !data.user.identities?.length) {
        console.warn('⚠️ AuthService: User already exists');
        return { error: { message: 'An account with this email already exists. Please try signing in instead.' } };
      }

      console.log('✅ AuthService: Sign up successful');
      
      return { error: null };
    } catch (error) {
      console.error('❌ AuthService: Sign up exception:', error);
      return { error: { message: 'Failed to create account. Please try again.' } };
    }
  },

  async signOut() {
    try {
      console.log('🔄 AuthService: Starting sign out');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({
        scope: 'local' // Only sign out locally, not from all sessions
      });
      
      if (error) {
        console.error('❌ AuthService: Sign out error:', error);
      } else {
        console.log('✅ AuthService: Sign out successful');
      }
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('❌ AuthService: Sign out exception:', error);
    }
  },

  async signInWithGoogle() {
    try {
      console.log('🔄 AuthService: Starting Google sign in');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth?confirmed=true`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('❌ AuthService: Google sign in error:', error);
        return { error: { message: error.message } };
      }
      
      console.log('✅ AuthService: Google sign in initiated');
      return { error: null };
    } catch (error) {
      console.error('❌ AuthService: Google sign in exception:', error);
      return { error: { message: 'Failed to sign in with Google. Please try again.' } };
    }
  },

  async fetchUserProfile(userId: string) {
    try {
      console.log('🔄 AuthService: Fetching user profile for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ AuthService: Error fetching user profile:', error);
        return null;
      }

      console.log('✅ AuthService: User profile fetched:', data);
      return data;
    } catch (error) {
      console.error('❌ AuthService: Profile fetch error:', error);
      return null;
    }
  }
};
