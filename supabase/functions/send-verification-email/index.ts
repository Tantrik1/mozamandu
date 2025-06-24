
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
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

    // Create user with email confirmation required
    console.log('Creating user account with email confirmation for:', email);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
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
        error: signUpError.message || "Failed to create user account"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('User created successfully, now generating confirmation token');

    // Generate email confirmation link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: email.toLowerCase().trim(),
    });

    if (linkError || !linkData.properties?.hashed_token) {
      console.error('Error generating confirmation link:', linkError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to generate confirmation link"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const confirmationToken = linkData.properties.hashed_token;
    console.log('Generated confirmation token for email verification');

    // Send custom confirmation email with the token
    const emailResponse = await resend.emails.send({
      from: "Mozamandu <onboarding@resend.dev>",
      to: [email.trim()],
      subject: "Confirm Your Email - Mozamandu",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">Mozamandu</h1>
            <p style="color: #666; margin: 5px 0;">Your premium gear destination</p>
          </div>
          
          <h2 style="color: #333; text-align: center;">Welcome ${name || 'there'}!</h2>
          
          <p style="color: #333; font-size: 16px;">
            Thank you for signing up! Please use the confirmation token below to activate your account:
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px dashed #dc2626;">
            <h1 style="color: #dc2626; font-size: 24px; margin: 0; letter-spacing: 2px; font-family: monospace; word-break: break-all;">${confirmationToken}</h1>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This token will expire in 24 hours for security reasons.
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

    console.log("Confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Account created! Please check your email for the confirmation token."
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
        error: "Failed to process request",
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
