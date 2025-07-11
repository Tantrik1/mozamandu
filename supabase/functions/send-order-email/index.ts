
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import React from 'npm:react@18.3.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { OrderCreatedEmail } from './_templates/order-created.tsx'
import { OrderStatusUpdatedEmail } from './_templates/order-status-updated.tsx'

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
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

    // Fetch order details from appropriate table
    const tableName = isCustomerOrder ? 'customer_orders' : 'orders';
    const { data: order, error: orderError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      throw new Error('Order not found');
    }

    console.log('Order fetched successfully:', order.order_number);

    // Determine the order summary URL
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/supabase', '') || 'https://your-domain.com';
    const summaryPath = isCustomerOrder ? 'customer-order-summary' : 'order-summary';
    const orderSummaryUrl = `${baseUrl}/${summaryPath}/${orderId}`;

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
          isCustomerOrder,
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
    const emailResponse = await resend.emails.send({
      from: "Mozamandu <orders@resend.dev>",
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
