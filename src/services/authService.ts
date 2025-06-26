
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const authService = {
  async signIn(email: string, password: string) {
    try {
      console.log('🔄 AuthService: Starting sign in');
      
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      if (error) {
        console.error('❌ AuthService: Sign in error:', error);
        return { error };
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
      
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: 'customer'
          },
          emailRedirectTo: `${window.location.origin}/auth?confirmed=true`
        }
      });

      if (error) {
        console.error('❌ AuthService: Sign up error:', error);
        return { error };
      }

      console.log('✅ AuthService: Sign up successful');
      return { error: null };
    } catch (error) {
      console.error('❌ AuthService: Sign up exception:', error);
      return { error };
    }
  },

  async signOut() {
    try {
      console.log('🔄 AuthService: Starting sign out');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ AuthService: Sign out error:', error);
      } else {
        console.log('✅ AuthService: Sign out successful');
      }
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      
      // Force redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('❌ AuthService: Sign out exception:', error);
    }
  }
};
