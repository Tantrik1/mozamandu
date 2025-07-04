
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  categories: { name: string } | null;
  subcategories: { name: string } | null;
}

interface ColorVariant {
  id: string;
  color_name: string;
  stock_quantity: number;
  product_name: string;
  category_name: string;
  subcategory_name: string;
}

interface SizeVariant {
  id: string;
  size_name: string;
  stock_quantity: number;
  color_name: string;
  product_name: string;
  category_name: string;
  subcategory_name: string;
}

const serve_handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting low stock alert check...');

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
      type: 'product' | 'color_variant' | 'size_variant';
      name: string;
      stock: number;
      category?: string;
      subcategory?: string;
      variant?: string;
    }> = [];

    // Check products without variants
    console.log('Checking products without variants...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        stock_quantity,
        has_color_variants,
        categories(name),
        subcategories(name)
      `)
      .eq('status', 'active')
      .eq('has_color_variants', false)
      .lt('stock_quantity', 10);

    if (productsError) {
      console.error('Error fetching products:', productsError);
    } else if (products) {
      console.log(`Found ${products.length} products with low stock`);
      products.forEach((product: any) => {
        if (product.stock_quantity < 10) {
          lowStockItems.push({
            type: 'product',
            name: product.name,
            stock: product.stock_quantity || 0,
            category: product.categories?.name,
            subcategory: product.subcategories?.name
          });
        }
      });
    }

    // Check color variants without sizes
    console.log('Checking color variants without sizes...');
    const { data: colorVariants, error: colorVariantsError } = await supabase
      .from('color_variants')
      .select(`
        id,
        color_name,
        stock_quantity,
        has_sizes,
        products!inner(
          name,
          status,
          categories(name),
          subcategories(name)
        )
      `)
      .eq('products.status', 'active')
      .eq('has_sizes', false)
      .lt('stock_quantity', 10);

    if (colorVariantsError) {
      console.error('Error fetching color variants:', colorVariantsError);
    } else if (colorVariants) {
      console.log(`Found ${colorVariants.length} color variants with low stock`);
      colorVariants.forEach((variant: any) => {
        if (variant.stock_quantity < 10) {
          lowStockItems.push({
            type: 'color_variant',
            name: variant.products.name,
            stock: variant.stock_quantity || 0,
            category: variant.products.categories?.name,
            subcategory: variant.products.subcategories?.name,
            variant: `Color: ${variant.color_name}`
          });
        }
      });
    }

    // Check size variants
    console.log('Checking size variants...');
    const { data: sizeVariants, error: sizeVariantsError } = await supabase
      .from('size_variants')
      .select(`
        id,
        size_name,
        stock_quantity,
        color_variants!inner(
          color_name,
          products!inner(
            name,
            status,
            categories(name),
            subcategories(name)
          )
        )
      `)
      .eq('color_variants.products.status', 'active')
      .lt('stock_quantity', 10);

    if (sizeVariantsError) {
      console.error('Error fetching size variants:', sizeVariantsError);
    } else if (sizeVariants) {
      console.log(`Found ${sizeVariants.length} size variants with low stock`);
      sizeVariants.forEach((variant: any) => {
        if (variant.stock_quantity < 10) {
          lowStockItems.push({
            type: 'size_variant',
            name: variant.color_variants.products.name,
            stock: variant.stock_quantity || 0,
            category: variant.color_variants.products.categories?.name,
            subcategory: variant.color_variants.products.subcategories?.name,
            variant: `${variant.color_variants.color_name} - ${variant.size_name}`
          });
        }
      });
    }

    console.log(`Total low stock items found: ${lowStockItems.length}`);

    // Send email if there are low stock items
    if (lowStockItems.length > 0) {
      const emailContent = generateEmailContent(lowStockItems);
      
      const emailResponse = await resend.emails.send({
        from: 'Mozamandu Store <noreply@mozamandu.com>',
        to: ['info@mozamandu.com'],
        subject: `🚨 LOW STOCK ALERT - ${lowStockItems.length} items need attention`,
        html: emailContent,
      });

      console.log('Email sent successfully:', emailResponse);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Low stock alert sent for ${lowStockItems.length} items`,
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
          message: 'No low stock items found',
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
  type: 'product' | 'color_variant' | 'size_variant';
  name: string;
  stock: number;
  category?: string;
  subcategory?: string;
  variant?: string;
}>): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let itemsHtml = '';
  
  lowStockItems.forEach((item, index) => {
    const stockColor = item.stock === 0 ? '#dc2626' : item.stock < 5 ? '#ea580c' : '#d97706';
    const stockStatus = item.stock === 0 ? 'OUT OF STOCK' : `${item.stock} remaining`;
    
    itemsHtml += `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; text-align: left;">${index + 1}</td>
        <td style="padding: 12px; text-align: left;">
          <div style="font-weight: 600; color: #111827;">${item.name}</div>
          ${item.variant ? `<div style="font-size: 14px; color: #6b7280;">${item.variant}</div>` : ''}
        </td>
        <td style="padding: 12px; text-align: left;">
          <div>${item.category || 'N/A'}</div>
          <div style="font-size: 14px; color: #6b7280;">${item.subcategory || ''}</div>
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
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
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
          <div class="alert-icon">🚨</div>
          <h1 style="margin: 0; font-size: 24px;">LOW STOCK ALERT</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Immediate attention required for inventory management</p>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin-top: 0;">⚠️ Stock Level Warning</h2>
          <p>Dear Admin,</p>
          <p>This is an automated alert to inform you that <strong>${lowStockItems.length}</strong> product(s) in your inventory have stock levels below the threshold of 10 units.</p>
          <p><strong>Date:</strong> ${currentDate}</p>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th style="width: 60px;">#</th>
              <th>Product Name</th>
              <th>Category</th>
              <th style="width: 120px; text-align: center;">Stock Status</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="footer">
          <h3 style="color: #dc2626; margin-top: 0;">Recommended Actions:</h3>
          <ul style="text-align: left; display: inline-block; margin: 0;">
            <li>Review and reorder items marked as "OUT OF STOCK" immediately</li>
            <li>Consider restocking items with less than 5 units remaining</li>
            <li>Update product visibility if items are temporarily unavailable</li>
            <li>Check for any pending orders that might affect these items</li>
          </ul>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              This is an automated message from Mozamandu Inventory Management System.<br>
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
