
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

interface SignUpRequest {
  email: string;
  password: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, fullName }: SignUpRequest = await req.json();

    console.log('Creating user with Supabase auth:', email);

    // Create user with Supabase's built-in email confirmation
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: false, // This will trigger email confirmation
      user_metadata: {
        full_name: fullName,
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

    console.log('User created successfully, sending confirmation email');

    // Get the confirmation token from the one_time_tokens table
    const { data: tokenData, error: tokenError } = await supabase
      .from('auth.one_time_tokens')
      .select('token_hash')
      .eq('user_id', signUpData.user.id)
      .eq('token_type', 'confirmation_token')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError) {
      console.error('Error getting token:', tokenError);
      // Continue without custom email since Supabase will send default confirmation
    }

    // Send custom confirmation email
    const confirmationUrl = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${tokenData?.token_hash}&type=signup&redirect_to=${encodeURIComponent('http://localhost:3000/')}`;

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
          
          <h2 style="color: #333; text-align: center;">Welcome ${fullName}!</h2>
          
          <p style="color: #333; font-size: 16px;">
            Thank you for signing up! Please confirm your email address by clicking the button below:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Confirm Email Address
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">
            ${confirmationUrl}
          </p>
          
          <p style="color: #666; font-size: 14px;">
            If you didn't request this, please ignore this email.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent by Mozamandu. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    console.log("Custom confirmation email sent:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      message: "User created successfully. Please check your email to confirm your account."
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
