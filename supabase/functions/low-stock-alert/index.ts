
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InventoryItem {
  id: string;
  sku: string;
  product_name: string;
  color_name: string | null;
  size_name: string | null;
  available_stock: number;
  stock_quantity: number;
  reserved_stock: number;
}

const serve_handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting low stock alert check with new inventory system...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not found in environment variables');
    }
    const resend = new Resend(resendApiKey);

    const lowStockItems: Array<{
      type: 'inventory_item';
      sku: string;
      name: string;
      variant: string;
      available_stock: number;
      stock_quantity: number;
      reserved_stock: number;
    }> = [];

    // Check inventory items with low available stock
    console.log('Checking inventory items with low stock...');
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('is_active', true)
      .lt('available_stock', 10);

    if (inventoryError) {
      console.error('Error fetching inventory items:', inventoryError);
    } else if (inventoryItems) {
      console.log(`Found ${inventoryItems.length} inventory items with low stock`);
      inventoryItems.forEach((item: any) => {
        let variant = '';
        if (item.color_name && item.size_name) {
          variant = `${item.color_name} - ${item.size_name}`;
        } else if (item.color_name) {
          variant = `Color: ${item.color_name}`;
        } else if (item.size_name) {
          variant = `Size: ${item.size_name}`;
        } else {
          variant = 'Default';
        }

        lowStockItems.push({
          type: 'inventory_item',
          sku: item.sku,
          name: item.product_name,
          variant: variant,
          available_stock: item.available_stock || 0,
          stock_quantity: item.stock_quantity || 0,
          reserved_stock: item.reserved_stock || 0
        });
      });
    }

    console.log(`Total low stock items found: ${lowStockItems.length}`);

    // Send email if there are low stock items
    if (lowStockItems.length > 0) {
      const emailContent = generateEmailContent(lowStockItems);
      
      const emailResponse = await resend.emails.send({
        from: 'Mozamandu Store <noreply@mozamandu.com>',
        to: ['info@mozamandu.com'],
        subject: `🚨 INVENTORY ALERT - ${lowStockItems.length} items need attention`,
        html: emailContent,
      });

      console.log('Email sent successfully:', emailResponse);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Low stock alert sent for ${lowStockItems.length} inventory items`,
          items: lowStockItems,
          emailResponse
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    } else {
      console.log('No low stock items found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No low stock items found in inventory',
          items: []
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

  } catch (error: any) {
    console.error('Error in low-stock-alert function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

function generateEmailContent(lowStockItems: Array<{
  type: 'inventory_item';
  sku: string;
  name: string;
  variant: string;
  available_stock: number;
  stock_quantity: number;
  reserved_stock: number;
}>): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let itemsHtml = '';
  
  lowStockItems.forEach((item, index) => {
    const stockColor = item.available_stock === 0 ? '#dc2626' : item.available_stock < 5 ? '#ea580c' : '#d97706';
    const stockStatus = item.available_stock === 0 ? 'OUT OF STOCK' : `${item.available_stock} available`;
    
    itemsHtml += `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; text-align: left;">${index + 1}</td>
        <td style="padding: 12px; text-align: left;">
          <div style="font-weight: 600; color: #111827;">${item.name}</div>
          <div style="font-size: 12px; font-family: monospace; color: #6b7280;">${item.sku}</div>
          <div style="font-size: 14px; color: #6b7280;">${item.variant}</div>
        </td>
        <td style="padding: 12px; text-align: center;">
          <div style="font-weight: 600;">${item.stock_quantity}</div>
          <div style="font-size: 12px; color: #6b7280;">Total</div>
        </td>
        <td style="padding: 12px; text-align: center;">
          <div style="font-weight: 600; color: #ea580c;">${item.reserved_stock}</div>
          <div style="font-size: 12px; color: #6b7280;">Reserved</div>
        </td>
        <td style="padding: 12px; text-align: center;">
          <span style="
            background-color: ${stockColor}; 
            color: white; 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-weight: 600;
            font-size: 12px;
          ">
            ${stockStatus}
          </span>
        </td>
      </tr>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 900px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626, #ea580c); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
        .alert-icon { font-size: 48px; margin-bottom: 10px; }
        .table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .table th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; color: #374151; }
        .footer { margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="alert-icon">📦</div>
          <h1 style="margin: 0; font-size: 24px;">INVENTORY ALERT</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Low stock detected in inventory system</p>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin-top: 0;">⚠️ Inventory Low Stock Warning</h2>
          <p>Dear Admin,</p>
          <p>This is an automated alert from the new inventory management system. <strong>${lowStockItems.length}</strong> inventory item(s) have available stock below the threshold of 10 units.</p>
          <p><strong>Date:</strong> ${currentDate}</p>
          <p><em>Note: Available stock = Total stock - Reserved stock</em></p>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th style="width: 60px;">#</th>
              <th>Product & SKU</th>
              <th style="width: 100px; text-align: center;">Total Stock</th>
              <th style="width: 100px; text-align: center;">Reserved</th>
              <th style="width: 120px; text-align: center;">Available</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="footer">
          <h3 style="color: #dc2626; margin-top: 0;">Recommended Actions:</h3>
          <ul style="text-align: left; display: inline-block; margin: 0;">
            <li>Review items marked as "OUT OF STOCK" immediately</li>
            <li>Consider restocking items with less than 5 available units</li>
            <li>Check reserved stock for pending orders</li>
            <li>Update product visibility if items are temporarily unavailable</li>
            <li>Use the new inventory management system for precise tracking</li>
          </ul>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              This alert is generated by the enhanced Mozamandu Inventory Management System.<br>
              Generated on ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(serve_handler);
