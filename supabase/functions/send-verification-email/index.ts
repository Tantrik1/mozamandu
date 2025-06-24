
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
  otp?: string;
  verify?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, password, otp, verify }: VerificationRequest = await req.json();

    console.log('Request received:', { email, verify, otp: otp ? `${otp.substring(0, 2)}****` : 'none', hasName: !!name, hasPassword: !!password });

    // If this is a verification request
    if (verify && otp) {
      console.log('Verifying OTP for email:', email);
      
      // Get the stored OTP from database - make sure to trim and compare properly
      const { data: storedOTP, error: fetchError } = await supabase
        .from('email_verification_codes')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('code', otp.trim())
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      console.log('Database query result:', { found: !!storedOTP, error: fetchError });

      if (fetchError || !storedOTP) {
        console.log('No valid OTP found for email:', email, 'Error:', fetchError);
        return new Response(JSON.stringify({ 
          success: false,
          error: "Invalid or expired verification code. Please try requesting a new code."
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      console.log('OTP verified successfully for email:', email);

      // Mark the OTP as verified
      const { error: updateError } = await supabase
        .from('email_verification_codes')
        .update({ verified: true })
        .eq('id', storedOTP.id);

      if (updateError) {
        console.error('Error updating OTP status:', updateError);
      }

      // Get user data from stored OTP
      const userData = storedOTP.user_data || {};
      
      console.log('Creating user with verified email...');
      
      // Create user with email_confirm: true to bypass email verification
      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: userData.password || password,
        email_confirm: true, // This bypasses email verification
        user_metadata: {
          full_name: userData.name || name,
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

      return new Response(JSON.stringify({ 
        success: true,
        message: "Email verified and account created successfully",
        user: signUpData.user
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate and send OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP:', otpCode, 'for email:', email);
    
    // Store OTP in database with 10-minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    // First, clean up any existing unverified codes for this email
    await supabase
      .from('email_verification_codes')
      .delete()
      .eq('email', email.toLowerCase().trim())
      .eq('verified', false);

    // Store new OTP in database
    const { error: insertError } = await supabase
      .from('email_verification_codes')
      .insert({
        email: email.toLowerCase().trim(),
        code: otpCode.trim(),
        expires_at: expiresAt,
        user_data: { name, password }
      });

    if (insertError) {
      console.error('Error storing OTP:', insertError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to generate verification code"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Sending verification email to:", email, "with OTP:", otpCode);

    const emailResponse = await resend.emails.send({
      from: "Mozamandu <onboarding@resend.dev>",
      to: [email.trim()],
      subject: "Verify Your Email - Mozamandu",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">Mozamandu</h1>
            <p style="color: #666; margin: 5px 0;">Your premium gear destination</p>
          </div>
          
          <h2 style="color: #333; text-align: center;">Welcome ${name || 'there'}!</h2>
          
          <p style="color: #333; font-size: 16px;">
            Thank you for signing up! Please use the verification code below to complete your registration:
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px dashed #dc2626;">
            <h1 style="color: #dc2626; font-size: 32px; margin: 0; letter-spacing: 8px; font-family: monospace;">${otpCode}</h1>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This code will expire in 10 minutes for security reasons.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            If you didn't request this verification, please ignore this email.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent by Mozamandu. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Verification email sent successfully"
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
