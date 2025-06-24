
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    const emailResponse = await resend.emails.send({
      from: "Mozamandu <onboarding@resend.dev>",
      to: [email],
      subject: "Your Verification Code - Mozamandu",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Welcome to Mozamandu!</h1>
          ${name ? `<p>Hi ${name},</p>` : '<p>Hello,</p>'}
          <p>Thank you for signing up! Please use the verification code below to complete your account setup:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h2 style="color: #2563eb; font-size: 32px; letter-spacing: 8px; margin: 0;">${code}</h2>
          </div>
          <p>This code will expire in 10 minutes for security reasons.</p>
          <p>If you didn't create an account with us, please ignore this email.</p>
          <p>Best regards,<br>The Mozamandu Team</p>
        </div>
      `,
    });

    console.log("OTP email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.data?.id }), {
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
