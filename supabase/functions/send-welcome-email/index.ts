import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use Lovable Cloud Supabase URL and service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WelcomeEmailRequest {
  userId: string;
  email: string;
  fullName: string;
}

// Default welcome promo config - used if DB lookup fails
const DEFAULT_PROMO_CODE = 'WELCOME5';
const DEFAULT_DISCOUNT_PERCENT = 5;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, fullName }: WelcomeEmailRequest = await req.json();

    console.log('Welcome email request received:', { userId, email, fullName });

    // Try to get the welcome promocode from database
    let promoCode = DEFAULT_PROMO_CODE;
    let discountPercent = DEFAULT_DISCOUNT_PERCENT;
    
    try {
      const { data: promocode, error: promoError } = await supabase
        .from('promocodes')
        .select('code, discount_percentage')
        .eq('code', 'WELCOME5')
        .eq('is_active', true)
        .single();

      if (!promoError && promocode) {
        promoCode = promocode.code;
        discountPercent = promocode.discount_percentage;
        console.log('Found WELCOME5 promocode in database:', { promoCode, discountPercent });
      } else {
        console.warn('WELCOME5 promocode not found, using defaults:', promoError?.message);
      }
    } catch (dbError) {
      console.warn('Error fetching promocode, using defaults:', dbError);
    }

    const customerName = fullName || email.split('@')[0];

    // Send welcome email
    const emailResponse = await resend.emails.send({
      from: "Mozamandu <welcome@mozamandu.com>",
      to: [email],
      subject: "Welcome to Mozamandu! 🎉 Here's Your Exclusive Discount",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); padding: 48px 40px; text-align: center;">
                      <h1 style="color: #ffffff; font-size: 36px; font-weight: bold; margin: 0 0 8px 0;">Welcome to Mozamandu!</h1>
                      <p style="color: #fecaca; font-size: 18px; margin: 0;">Your premium gear destination</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 48px 40px;">
                      <p style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">
                        Hello ${customerName}! 👋
                      </p>
                      
                      <p style="font-size: 16px; color: #374151; line-height: 26px; margin: 0 0 24px 0;">
                        Thank you for joining the Mozamandu family! We're thrilled to have you with us. 
                        Get ready to explore our premium collection of socks, boxers, and caps.
                      </p>
                      
                      <!-- Promo Code Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%); border: 2px solid #fecaca; border-radius: 12px; margin: 32px 0;">
                        <tr>
                          <td style="padding: 32px; text-align: center;">
                            <p style="font-size: 14px; color: #dc2626; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">
                              🎁 Your Exclusive Welcome Gift
                            </p>
                            <p style="font-size: 28px; font-weight: bold; color: #111827; margin: 0 0 16px 0;">
                              ${discountPercent}% OFF Your First Order!
                            </p>
                            <div style="background-color: #dc2626; display: inline-block; padding: 16px 32px; border-radius: 8px; margin: 8px 0;">
                              <span style="font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: 4px; font-family: monospace;">
                                ${promoCode}
                              </span>
                            </div>
                            <p style="font-size: 14px; color: #6b7280; margin: 16px 0 0 0;">
                              Use this code at checkout to claim your discount
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 16px 0 32px 0;">
                            <a href="https://mozamandu.com" style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: #ffffff; font-size: 18px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 8px; display: inline-block;">
                              Start Shopping Now →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Features -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
                        <tr>
                          <td style="padding: 24px;">
                            <p style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">
                              Why Shop With Us?
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="padding: 8px 0;">
                                  <span style="color: #dc2626; font-size: 18px;">✓</span>
                                  <span style="color: #374151; font-size: 14px; margin-left: 12px;">Premium Quality Products</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0;">
                                  <span style="color: #dc2626; font-size: 18px;">✓</span>
                                  <span style="color: #374151; font-size: 14px; margin-left: 12px;">Fast Delivery Across Nepal</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0;">
                                  <span style="color: #dc2626; font-size: 18px;">✓</span>
                                  <span style="color: #374151; font-size: 14px; margin-left: 12px;">Easy Returns & Exchanges</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0;">
                                  <span style="color: #dc2626; font-size: 18px;">✓</span>
                                  <span style="color: #374151; font-size: 14px; margin-left: 12px;">Secure Payment Options</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="font-size: 16px; color: #374151; line-height: 26px; margin: 0;">
                        If you have any questions, feel free to reach out to us. We're here to help!
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0;">
                        Best regards,<br>
                        <strong style="color: #dc2626;">The Mozamandu Team</strong>
                      </p>
                      <p style="font-size: 12px; color: #9ca3af; margin: 16px 0 0 0;">
                        © ${new Date().getFullYear()} Mozamandu. All rights reserved.<br>
                        <a href="https://mozamandu.com" style="color: #dc2626; text-decoration: none;">mozamandu.com</a>
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      emailId: emailResponse.data?.id,
      message: "Welcome email sent successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Failed to send welcome email",
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
