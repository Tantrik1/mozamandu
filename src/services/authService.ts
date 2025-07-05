import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

        // Handle specific error cases
        if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          return { error: { message: 'Please verify your email before signing in. Check your inbox for the verification link.' } };
        }

        if (error.message.includes('Invalid login credentials')) {
          return { error: { message: 'Invalid email or password. Please check your credentials and try again.' } };
        }

        return { error };
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
      console.log('🔄 AuthService: Starting sign up via Supabase native auth');
      // Use Supabase's built-in signup method
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: 'customer'
          }
        }
      });

      if (error) {
        console.error('❌ AuthService: Sign up error:', error);
        return { error: { message: error.message || 'Failed to create account. Please try again.' } };
      }

      console.log('✅ AuthService: Sign up successful via Supabase native auth');
      toast({
        title: "Account Created!",
        description: "We've sent you a verification email. Please check your inbox and verify your account before signing in.",
      });
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
