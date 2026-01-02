
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

interface OTPRequest {
  email: string;
  name?: string;
  password?: string;
  type: 'signup' | 'resend';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, password, type }: OTPRequest = await req.json();

    console.log('OTP request received:', { email, type, hasName: !!name, hasPassword: !!password });

    const emailAddress = email.toLowerCase().trim();

    if (type === 'signup') {
      // First, create the user account with Supabase
      console.log('Creating user account for:', emailAddress);
      
      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: emailAddress,
        password: password,
        email_confirm: false, // We'll handle email confirmation via OTP
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

      console.log('User created successfully:', signUpData.user?.email);
    }

    // Generate OTP using Supabase's built-in method
    console.log('Generating OTP for:', emailAddress);
    
    const { data: otpData, error: otpError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: emailAddress,
    });

    if (otpError || !otpData.properties?.email_otp) {
      console.error('Error generating OTP:', otpError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to generate verification code"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const otpCode = otpData.properties.email_otp;
    console.log('Generated OTP code for email verification');

    // Send custom email with the OTP code
    const emailResponse = await resend.emails.send({
      from: "Mozamandu <onboarding@resend.dev>",
      to: [emailAddress],
      subject: "Your Verification Code - Mozamandu",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">Mozamandu</h1>
            <p style="color: #666; margin: 5px 0;">Your premium gear destination</p>
          </div>
          
          <h2 style="color: #333; text-align: center;">
            ${type === 'signup' ? `Welcome ${name || 'there'}!` : 'Verification Code'}
          </h2>
          
          <p style="color: #333; font-size: 16px;">
            ${type === 'signup' 
              ? 'Thank you for signing up! Please use the verification code below to activate your account:' 
              : 'Here is your new verification code:'
            }
          </p>
          
          <div style="background: #f8f9fa; padding: 30px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px solid #dc2626;">
            <h1 style="color: #dc2626; font-size: 36px; margin: 0; letter-spacing: 8px; font-family: monospace;">${otpCode}</h1>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center;">
            This code will expire in 10 minutes for security reasons.
          </p>
          
          <p style="color: #666; font-size: 14px; text-align: center;">
            If you didn't request this verification code, please ignore this email.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent by Mozamandu. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    console.log("OTP email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      message: type === 'signup' 
        ? "Account created! Please check your email for the verification code." 
        : "New verification code sent to your email."
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-otp-email function:", error);
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
