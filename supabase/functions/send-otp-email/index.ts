
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPEmailRequest {
  email: string;
  code: string;
  name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, name }: OTPEmailRequest = await req.json();

    console.log("Sending OTP email to:", email, "with code:", code);

    // Store the OTP in the database for verification
    const { error: insertError } = await supabase
      .from('email_verification_codes')
      .insert({
        email,
        code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

    if (insertError) {
      console.error('Error storing OTP:', insertError);
      throw new Error('Failed to store verification code');
    }

    // Send email using Supabase's built-in email functionality
    // This will use your configured SMTP settings
    try {
      // Create a temporary user to send the email, then delete it
      const tempPassword = Math.random().toString(36).substring(2, 15);
      
      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: false,
        user_metadata: {
          full_name: name || '',
          verification_code: code,
          temp_signup: true,
        }
      });

      if (signUpError) {
        console.error('Error creating temp user:', signUpError);
        throw signUpError;
      }

      // Send password reset email which will use your custom template
      const { error: emailError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          data: {
            verification_code: code,
            full_name: name || '',
            email_type: 'otp_verification',
          }
        }
      });

      // Delete the temporary user
      if (signUpData.user) {
        await supabase.auth.admin.deleteUser(signUpData.user.id);
      }

      if (emailError) {
        console.error('Error sending email:', emailError);
        throw emailError;
      }

      console.log("OTP email sent successfully");
      
      return new Response(JSON.stringify({ 
        success: true,
        message: "Verification code sent to your email"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });

    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      // If the above approach fails, try direct email sending
      try {
        // Use Supabase's direct email sending capability
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/send_email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          },
          body: JSON.stringify({
            to: email,
            subject: 'Your Verification Code - Mozamandu',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Welcome to Mozamandu!</h2>
                <p>Hi ${name || 'there'},</p>
                <p>Thank you for signing up! Your verification code is:</p>
                <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                  <h1 style="color: #333; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h1>
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px; text-align: center;">
                  This email was sent by Mozamandu. Please do not reply to this email.
                </p>
              </div>
            `
          })
        });

        if (!response.ok) {
          throw new Error(`Email API failed: ${response.status}`);
        }

        console.log("OTP email sent via direct API");
        
        return new Response(JSON.stringify({ 
          success: true,
          message: "Verification code sent to your email"
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });

      } catch (directEmailError) {
        console.error('Direct email sending also failed:', directEmailError);
        throw new Error('Failed to send verification email');
      }
    }

  } catch (error: any) {
    console.error("Error in send-otp-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send verification code. Please try again.",
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
