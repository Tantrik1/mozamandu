# Google Sign-Up Implementation Guide for Mozamandu

This document provides a comprehensive guide to implementing Google OAuth sign-up for customers in the Mozamandu gear shop application.

---

## Current Authentication Architecture

### Overview

The application uses **Supabase Auth** for authentication with the following components:

| Component | File | Purpose |
|-----------|------|---------|
| Supabase Client | `src/integrations/supabase/client.ts` | Supabase connection |
| Auth Context | `src/contexts/AuthContext.tsx` | React context for auth state |
| Auth Provider | `src/components/auth/AuthProvider.tsx` | Manages auth state & session |
| Auth Service | `src/services/authService.ts` | Sign in/up/out logic |
| Sign Up Form | `src/components/auth/SignUpForm.tsx` | Email signup UI |
| Auth Page | `src/pages/Auth.tsx` | Main authentication page |

### Current Email Sign-Up Flow

1. User fills out `SignUpForm` with: **Full Name**, **Email**, **Password**
2. `signUp()` from `authService.ts` calls `supabase.auth.signUp()` with:
   - Email & password
   - `emailRedirectTo` for confirmation
   - `data: { full_name }` in user metadata
3. Supabase sends verification email
4. User clicks verification link → redirected to `/auth?confirmed=true`
5. On successful auth, a **database trigger** (`on_auth_user_created`) automatically creates a profile in `public.profiles`

### Database Schema

**`profiles` table** (linked to `auth.users`):

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'customer',  -- 'admin' | 'customer'
  contact_number TEXT,
  whatsapp_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Trigger for new users:**

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

This trigger **automatically works for Google OAuth** users too - it will create a profile when they sign up.

---

## Implementation Steps for Google Sign-Up

### Step 1: Configure Google OAuth in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Configure:
   - **Name**: `Mozamandu Auth`
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173` (development)
     - `https://your-production-domain.com` (production)
   - **Authorized redirect URIs**:
     - `https://huwhbxjlyucamitwwhyg.supabase.co/auth/v1/callback`
7. Copy the **Client ID** and **Client Secret**

### Step 2: Configure Google Provider in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `huwhbxjlyucamitwwhyg`
3. Navigate to **Authentication** → **Providers**
4. Find **Google** and enable it
5. Enter:
   - **Client ID**: (from Google Cloud Console)
   - **Client Secret**: (from Google Cloud Console)
6. Save changes

### Step 3: Update Auth Types

Update `src/types/auth.ts`:

```typescript
import { User, Session } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: any;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;  // ADD THIS
  signOut: () => Promise<void>;
}
```

### Step 4: Update Auth Service

Add Google sign-in method to `src/services/authService.ts`:

```typescript
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
```

### Step 5: Update Auth Provider

Update `src/components/auth/AuthProvider.tsx`:

```typescript
// Add to imports if not present
import { authService } from '@/services/authService';

// Add new callback
const signInWithGoogle = useCallback(async () => {
  return authService.signInWithGoogle();
}, []);

// Update the provider value
return (
  <AuthContext.Provider value={{
    user,
    session,
    userProfile,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,  // ADD THIS
    signOut,
  }}>
    {children}
  </AuthContext.Provider>
);
```

### Step 6: Create Google Sign-In Button Component

Create `src/components/auth/GoogleSignInButton.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

export function GoogleSignInButton() {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithGoogle();
    
    if (error) {
      toast({
        title: "Google Sign-In Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
    // Note: No need to setIsLoading(false) on success as page will redirect
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-11 border-2 hover:bg-gray-50 font-medium"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          Connecting...
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </div>
      )}
    </Button>
  );
}
```

### Step 7: Update Auth Page UI

Update `src/pages/Auth.tsx` to include the Google button:

Add import at top:
```typescript
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
```

Add the button in both Sign In and Sign Up tabs, after the form and before the footer. Example for Sign In tab:

```tsx
{/* After the sign-in form, add: */}
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-white px-2 text-muted-foreground">
      Or continue with
    </span>
  </div>
</div>

<GoogleSignInButton />
```

### Step 8: Handle Google User Profile Data

The existing `handle_new_user()` trigger will automatically create a profile. However, Google provides the user's name in a different metadata field. Update the trigger to handle this:

```sql
-- Run this migration in Supabase SQL Editor
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_full_name TEXT;
BEGIN
  -- Handle both email signup (full_name) and Google OAuth (name or full_name)
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    'customer'  -- Google users are always customers
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name),
    updated_at = NOW();
    
  RETURN NEW;
END;
$$;
```

---

## Complete File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/auth.ts` | Modify | Add `signInWithGoogle` to interface |
| `src/services/authService.ts` | Modify | Add `signInWithGoogle()` method |
| `src/components/auth/AuthProvider.tsx` | Modify | Add `signInWithGoogle` callback |
| `src/components/auth/GoogleSignInButton.tsx` | Create | New Google button component |
| `src/pages/Auth.tsx` | Modify | Add Google button to UI |
| Supabase SQL | Run | Update `handle_new_user()` trigger |

---

## Testing Checklist

- [ ] Google OAuth configured in Google Cloud Console
- [ ] Google provider enabled in Supabase Dashboard
- [ ] Redirect URIs match exactly
- [ ] Google button appears on Auth page
- [ ] Clicking button redirects to Google consent screen
- [ ] After Google auth, user is redirected back to app
- [ ] Profile is created in `profiles` table with correct data
- [ ] User can access customer dashboard
- [ ] Existing email users can still sign in normally

---

## Troubleshooting

### "redirect_uri_mismatch" Error
- Ensure the redirect URI in Google Cloud Console exactly matches: `https://huwhbxjlyucamitwwhyg.supabase.co/auth/v1/callback`

### Profile Not Created
- Check if the `on_auth_user_created` trigger exists
- Verify the trigger function handles Google metadata fields

### User Stuck on Loading
- Check browser console for errors
- Verify Supabase project URL and anon key are correct

---

## Security Considerations

1. **Role Assignment**: Google users are always assigned `customer` role - never `admin`
2. **Email Verification**: Google-authenticated emails are pre-verified by Google
3. **Profile Linking**: If a user signs up with email first, then tries Google with same email, Supabase will link the accounts

---

## Production Deployment Notes

1. Update Google Cloud Console with production domain
2. Add production URL to authorized origins
3. Ensure Supabase redirect URL is configured for production
4. Test the complete flow in production environment
