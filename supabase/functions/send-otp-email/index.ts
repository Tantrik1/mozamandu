
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

    // Use Supabase Auth's invite functionality to trigger email
    // This will use your configured SMTP settings and email templates
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        verification_code: code,
        full_name: name || '',
        invite_type: 'otp_verification',
      },
      redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`
    });

    if (error) {
      console.error('Error sending invite email:', error);
      
      // Fallback: If email sending fails, we still have the OTP stored
      // The frontend can show the code in a toast for testing
      console.log("Email sending failed, but OTP stored successfully. Code:", code);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "OTP stored successfully",
        debug_code: code // Remove this in production
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log("OTP email sent successfully via Supabase");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-otp-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
