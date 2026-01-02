
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hardcoded external Supabase URL for consistent connection
const EXTERNAL_SUPABASE_URL = 'https://huwhbxjlyucamitwwhyg.supabase.co';

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  EXTERNAL_SUPABASE_URL,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface VerificationRequest {
  email: string;
  name?: string;
  password?: string;
  token?: string;
  verify?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, password, token, verify }: VerificationRequest = await req.json();

    console.log('Request received:', { email, verify, hasToken: !!token, hasName: !!name, hasPassword: !!password });

    // If this is a verification request with token
    if (verify && token) {
      console.log('Verifying email confirmation token for:', email);
      
      // Verify the email confirmation token using Supabase auth
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: token.trim(),
        type: 'signup'
      });

      console.log('Token verification result:', { success: !!verifyData.user, error: verifyError });

      if (verifyError || !verifyData.user) {
        console.log('Token verification failed:', verifyError);
        return new Response(JSON.stringify({ 
          success: false,
          error: "Invalid or expired verification token. Please try requesting a new one."
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      console.log('Email verified successfully for user:', verifyData.user.email);

      return new Response(JSON.stringify({ 
        success: true,
        message: "Email verified successfully",
        user: verifyData.user,
        session: verifyData.session
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Handle signup flow
    const emailAddress = email.toLowerCase().trim();
    console.log('Processing signup for:', emailAddress);

    // Check if user already exists
    const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserByEmail(emailAddress);
    
    if (existingUser && existingUser.user && existingUser.user.email_confirmed_at) {
      console.log('User already exists and is confirmed:', emailAddress);
      return new Response(JSON.stringify({ 
        success: false,
        error: "An account with this email already exists and is verified. Please sign in instead."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // If user exists but is not confirmed, delete the old user first
    if (existingUser && existingUser.user && !existingUser.user.email_confirmed_at) {
      console.log('Deleting unconfirmed user before creating new one:', emailAddress);
      await supabase.auth.admin.deleteUser(existingUser.user.id);
    }

    // Create new user with email confirmation required
    console.log('Creating new user account for:', emailAddress);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email: emailAddress,
      password: password,
      email_confirm: false, // Require email confirmation
      user_metadata: {
        full_name: name || '',
        role: 'customer',
      }
    });

    if (signUpError) {
      console.error('Error creating user:', signUpError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to create user account. Please try again."
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('User created successfully, generating confirmation link');

    // Generate email confirmation link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: emailAddress,
    });

    if (linkError || !linkData.properties?.action_link) {
      console.error('Error generating confirmation link:', linkError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to generate confirmation link"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const confirmationUrl = linkData.properties.action_link;
    console.log('Generated confirmation URL for email verification');

    // Send custom confirmation email
    const emailResponse = await resend.emails.send({
      from: "Mozamandu <onboarding@resend.dev>",
      to: [emailAddress],
      subject: "Confirm Your Email - Mozamandu",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">Mozamandu</h1>
            <p style="color: #666; margin: 5px 0;">Your premium gear destination</p>
          </div>
          
          <h2 style="color: #333; text-align: center;">Welcome ${name || 'there'}!</h2>
          
          <p style="color: #333; font-size: 16px;">
            Thank you for signing up! Please click the button below to verify your email address and activate your account:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" 
               style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, you can also copy and paste this link into your browser:
          </p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; word-break: break-all;">
            <a href="${confirmationUrl}" style="color: #dc2626; text-decoration: none;">${confirmationUrl}</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This link will expire in 24 hours for security reasons.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            If you didn't request this account creation, please ignore this email.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent by Mozamandu. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    if (emailResponse.error) {
      console.error("Error sending confirmation email:", emailResponse.error);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Account created but failed to send verification email. Please contact support."
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Confirmation email sent successfully:", emailResponse.data?.id);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Account created successfully! Please check your email for the verification link."
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-verification-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "An unexpected error occurred. Please try again.",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
