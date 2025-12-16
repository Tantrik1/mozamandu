import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewNotificationRequest {
  productName: string;
  reviewerName: string;
  rating: number;
  reviewText?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, reviewerName, rating, reviewText }: ReviewNotificationRequest = await req.json();

    console.log("Sending review notification for product:", productName);

    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

    const emailResponse = await resend.emails.send({
      from: "Reviews <onboarding@resend.dev>",
      to: ["info@mozamandu.com"], // Replace with actual admin email or fetch from DB
      subject: `New Review Pending Approval - ${productName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">
            📝 New Product Review Submitted
          </h2>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Product:</strong> ${productName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Reviewer:</strong> ${reviewerName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Rating:</strong> <span style="color: #fbbf24; font-size: 18px;">${stars}</span> (${rating}/5)</p>
            ${reviewText ? `<p style="margin: 0;"><strong>Review:</strong></p><p style="background: white; padding: 15px; border-radius: 4px; border-left: 3px solid #3b82f6; margin-top: 5px;">${reviewText}</p>` : '<p style="color: #666; font-style: italic;">No written review provided</p>'}
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              ⚠️ This review is pending approval. Please log in to the admin panel to review and approve/reject it.
            </p>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated notification from your store's review system.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending review notification:", error);
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
