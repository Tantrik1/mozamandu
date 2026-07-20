import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

// Hardcoded external Supabase URL for consistent connection
const EXTERNAL_SUPABASE_URL = 'https://huwhbxjlyucamitwwhyg.supabase.co';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  resetLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Password reset function environment check - RESEND_API_KEY exists:', !!Deno.env.get("RESEND_API_KEY"));
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { email, resetLink }: PasswordResetRequest = await req.json();
    
    console.log('Password reset request received for:', email);
    console.log('Reset link:', resetLink);

    if (!email || !resetLink) {
      return new Response(
        JSON.stringify({ error: "Email and reset link are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('Attempting to send password reset email to:', email);

    const emailResponse = await resend.emails.send({
      from: "Mozamandu <noreply@mozamandu.com>",
      to: [email],
      subject: "Reset Your Mozamandu Password",
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;">
          <div style="background: linear-gradient(135deg, #dc2626, #ea580c); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Reset Your Password</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hello,
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              We received a request to reset your password for your Mozamandu account. Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetLink}" style="background: linear-gradient(135deg, #dc2626, #ea580c); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                Reset My Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; padding: 20px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #fbbf24;">
              <strong>Security Notice:</strong><br>
              • This link will expire in 1 hour for security reasons<br>
              • If you didn't request this reset, you can safely ignore this email<br>
              • Your password won't change until you create a new one using the link above
            </p>
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="word-break: break-all; color: #6b7280;">${resetLink}</span>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © 2025 Mozamandu. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      throw new Error(emailResponse.error.message || "Failed to send email");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset email sent successfully",
        emailId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to send password reset email", 
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