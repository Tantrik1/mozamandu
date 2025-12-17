import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
  selling_price: number | null;
  image_url: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  min_selling_price: number | null;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      cost_price,
      selling_price,
      image_url,
      categories(name),
      subcategories(name, min_selling_price)
    `)
    .eq('status', 'active')
    .order('name');

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    cost_price: p.cost_price,
    selling_price: p.selling_price,
    image_url: p.image_url,
    category_name: p.categories?.name || null,
    subcategory_name: p.subcategories?.name || null,
    min_selling_price: p.subcategories?.min_selling_price || null,
  }));
}

async function fetchCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('name')
    .eq('status', 'on')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return (data || []).map((c: any) => c.name);
}

function buildProductContext(products: Product[], categories: string[]): string {
  const categoryList = categories.join(', ');
  
  const productSummaries = products.map(p => {
    const price = p.min_selling_price || p.selling_price || p.cost_price;
    return `- ${p.name} (ID: ${p.id}): ${p.description || 'No description'} | Category: ${p.category_name || 'Uncategorized'} | Subcategory: ${p.subcategory_name || 'None'} | Price: Rs ${price}`;
  }).join('\n');

  return `
You are a helpful shopping assistant for Mozamandu, a gear and apparel shop. Your role is to help customers find the perfect products based on their needs.

AVAILABLE CATEGORIES: ${categoryList}

AVAILABLE PRODUCTS:
${productSummaries}

INSTRUCTIONS:
1. Be friendly, helpful, and conversational
2. When recommending products, always include the product name and price
3. If a customer asks about a specific category, filter your recommendations accordingly
4. If you recommend a product, format it as: **[Product Name]** - Rs [Price] - [Brief description]
5. You can recommend up to 3-5 products at a time
6. If the customer's request is unclear, ask clarifying questions
7. Always be honest - if a product doesn't exist or you're unsure, say so
8. Include product IDs in your response using this format: [PRODUCT_ID:uuid] so the frontend can create links
9. Keep responses concise but helpful
10. If asked about stock, sizes, or colors, mention that customers can check the product page for current availability
11. For pricing, use the min_selling_price if available, otherwise selling_price, otherwise cost_price

Remember: You are representing Mozamandu. Be professional yet friendly!
`;
}

async function callGeminiAPI(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Build conversation for Gemini
  const contents = [];
  
  // Add conversation history
  for (const msg of conversationHistory) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    });
  }
  
  // Add current user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response from Gemini');
  }

  const candidate = data.candidates[0];
  if (candidate.finishReason === 'SAFETY') {
    return "I apologize, but I can't respond to that. How can I help you find products today?";
  }

  return candidate.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response. Please try again.";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] }: ChatRequest = await req.json();

    if (!message || typeof message !== 'string') {
      throw new Error('Message is required');
    }

    console.log('Chat request received:', { message: message.substring(0, 100) });

    // Fetch products and categories
    const [products, categories] = await Promise.all([
      fetchAllProducts(),
      fetchCategories()
    ]);

    console.log(`Loaded ${products.length} products and ${categories.length} categories`);

    // Build context with product data
    const systemPrompt = buildProductContext(products, categories);

    // Call Gemini API
    const response = await callGeminiAPI(systemPrompt, message, conversationHistory);

    // Extract product IDs from response for frontend linking
    const productIdRegex = /\[PRODUCT_ID:([a-f0-9-]+)\]/gi;
    const mentionedProductIds: string[] = [];
    let match;
    while ((match = productIdRegex.exec(response)) !== null) {
      mentionedProductIds.push(match[1]);
    }

    // Clean response by removing product ID markers
    const cleanResponse = response.replace(/\[PRODUCT_ID:[a-f0-9-]+\]/gi, '');

    // Get product details for mentioned products
    const mentionedProducts = products.filter(p => mentionedProductIds.includes(p.id));

    return new Response(
      JSON.stringify({
        success: true,
        response: cleanResponse,
        mentionedProducts: mentionedProducts.map(p => ({
          id: p.id,
          name: p.name,
          image_url: p.image_url,
          price: p.min_selling_price || p.selling_price || p.cost_price,
        })),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in product-chatbot function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        response: "I'm sorry, I'm having trouble right now. Please try again in a moment.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
