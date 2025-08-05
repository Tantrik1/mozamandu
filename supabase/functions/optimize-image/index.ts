import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OptimizeImageRequest {
  imageUrl: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, width, height, quality = 80, format = 'webp' }: OptimizeImageRequest = await req.json();
    
    console.log(`Optimizing image: ${imageUrl} - ${width}x${height} - ${quality}% - ${format}`);

    // Fetch the original image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);

    // For a production implementation, you would use a proper image processing library
    // This is a simplified version that just serves the original with cache headers
    
    // Determine output format and content type
    let contentType = 'image/jpeg';
    let outputBuffer = uint8Array;

    switch (format) {
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      default:
        contentType = 'image/jpeg';
    }

    // Log the optimization for analytics
    await supabase.from('image_optimizations').insert({
      original_url: imageUrl,
      width,
      height,
      quality,
      format,
      original_size: imageBuffer.byteLength,
      optimized_size: outputBuffer.byteLength,
      created_at: new Date().toISOString()
    }).then(({ error }) => {
      if (error) console.warn('Failed to log optimization:', error);
    });

    return new Response(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': outputBuffer.byteLength.toString(),
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in optimize-image function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);