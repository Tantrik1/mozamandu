
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from 'npm:@react-email/render@0.0.17'
import React from 'npm:react@18.3.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { OrderCreatedEmail } from './_templates/order-created.tsx'
import { OrderStatusUpdatedEmail } from './_templates/order-status-updated.tsx'

const resendApiKey = Deno.env.get("RESEND_API_KEY");
console.log('RESEND_API_KEY configured:', !!resendApiKey);

if (!resendApiKey) {
  console.error('RESEND_API_KEY is not configured');
}

const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
  type: 'order_created' | 'status_updated'
  orderId: string
  isCustomerOrder?: boolean
  oldStatus?: string
  newStatus?: string
}

// Hardcoded external Supabase URL for consistent connection
const EXTERNAL_SUPABASE_URL = 'https://huwhbxjlyucamitwwhyg.supabase.co';

const supabase = createClient(
  EXTERNAL_SUPABASE_URL,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, orderId, isCustomerOrder = false, oldStatus, newStatus }: OrderEmailRequest = await req.json();

    console.log('Email request received:', { type, orderId, isCustomerOrder });
    console.log('Function environment check - RESEND_API_KEY exists:', !!Deno.env.get("RESEND_API_KEY"));

    // Fetch order details from appropriate table
    // Note: we accept isCustomerOrder hint, but also fall back to the other table
    const requestedTable = isCustomerOrder ? 'customer_orders' : 'orders';
    const fallbackTable = isCustomerOrder ? 'orders' : 'customer_orders';

    let actualIsCustomerOrder = isCustomerOrder;

    let { data: order, error: orderError } = await supabase
      .from(requestedTable)
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) {
      console.warn('Order not found in requested table, trying fallback:', {
        requestedTable,
        fallbackTable,
        orderError,
      });

      const fallback = await supabase
        .from(fallbackTable)
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      order = fallback.data;
      orderError = fallback.error;
      if (order) actualIsCustomerOrder = !isCustomerOrder;
    }

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      throw new Error('Order not found');
    }

    console.log('Order fetched successfully:', order.order_number, 'actualIsCustomerOrder:', actualIsCustomerOrder);

    // Determine the order summary URL - use production domain
    // Always use 'order-summary' path as it's public and accessible without auth
    const baseUrl = 'https://mozamandu.com';
    const orderSummaryUrl = `${baseUrl}/order-summary/${orderId}`;

    let emailHtml = '';
    let subject = '';

    if (type === 'order_created') {
      subject = `Order Confirmation - #${order.order_number}`;
      emailHtml = await renderAsync(
        React.createElement(OrderCreatedEmail, {
          customerName: order.customer_name,
          orderNumber: order.order_number,
          totalAmount: parseFloat(order.total_amount),
          paidAmount: parseFloat(order.paid_amount),
          remainingAmount: parseFloat(order.remaining_amount),
          orderSummaryUrl,
          isCustomerOrder: actualIsCustomerOrder,
        })
      );
    } else if (type === 'status_updated' && oldStatus && newStatus) {
      subject = `Order Status Update - #${order.order_number}`;
      emailHtml = await renderAsync(
        React.createElement(OrderStatusUpdatedEmail, {
          customerName: order.customer_name,
          orderNumber: order.order_number,
          oldStatus,
          newStatus,
          totalAmount: parseFloat(order.total_amount),
          orderSummaryUrl,
        })
      );
    } else {
      throw new Error('Invalid email type or missing parameters');
    }

    // Send email
    console.log('Attempting to send email to:', order.customer_email);
    console.log('Email subject:', subject);

    const emailResponse = await resend.emails.send({
      from: "Mozamandu <orders@mozamandu.com>",
      to: [order.customer_email],
      subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      message: 'Email sent successfully' 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-order-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
