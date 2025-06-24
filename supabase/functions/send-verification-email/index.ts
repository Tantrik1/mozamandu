
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Store OTP codes in memory (in production, use Redis or database)
const otpStore = new Map<string, { code: string; expires: number }>();

interface VerificationEmailRequest {
  email: string;
  name?: string;
  otp?: string;
  verify?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, otp, verify }: VerificationEmailRequest = await req.json();

    // If this is a verification request
    if (verify && otp) {
      const stored = otpStore.get(email);
      if (!stored || stored.expires < Date.now() || stored.code !== otp) {
        return new Response(JSON.stringify({ 
          success: false,
          error: "Invalid or expired verification code"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Remove the OTP after successful verification
      otpStore.delete(email);
      
      return new Response(JSON.stringify({ 
        success: true,
        message: "OTP verified successfully"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate and send OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 10-minute expiry
    otpStore.set(email, {
      code: otpCode,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    console.log("Sending verification email to:", email);

    const emailResponse = await resend.emails.send({
      from: "Mozamandu <onboarding@resend.dev>",
      to: [email],
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
