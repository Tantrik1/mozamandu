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
  available_stock: number | null;
}

// Hardcoded external Supabase URL for consistent connection
const EXTERNAL_SUPABASE_URL = 'https://huwhbxjlyucamitwwhyg.supabase.co';

const supabase = createClient(
  EXTERNAL_SUPABASE_URL,
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

  // Also fetch inventory for stock info
  const { data: inventory } = await supabase
    .from('product_inventory')
    .select('product_id, available_stock')
    .eq('is_active', true);

  const stockMap = new Map<string, number>();
  (inventory || []).forEach((inv: any) => {
    const current = stockMap.get(inv.product_id) || 0;
    stockMap.set(inv.product_id, current + (inv.available_stock || 0));
  });

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
    available_stock: stockMap.get(p.id) || 0,
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

async function fetchFAQs(): Promise<Array<{question: string, answer: string}>> {
  const { data, error } = await supabase
    .from('faqs')
    .select('question, answer')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('Error fetching FAQs:', error);
    return [];
  }

  return data || [];
}

function buildProductContext(products: Product[], categories: string[], faqs: Array<{question: string, answer: string}>): string {
  const categoryList = categories.join(', ');
  
  const productSummaries = products.slice(0, 50).map(p => {
    const price = p.min_selling_price || p.selling_price || p.cost_price;
    const stock = p.available_stock && p.available_stock > 0 ? `${p.available_stock} in stock` : 'Limited stock';
    return `• ${p.name} [ID:${p.id}] - Rs ${price.toLocaleString()} (${p.category_name || 'General'}) - ${stock}`;
  }).join('\n');

  const faqSummaries = faqs.slice(0, 10).map(f => 
    `Q: ${f.question}\nA: ${f.answer}`
  ).join('\n\n');

  return `You are the friendly AI shopping assistant for Mozamandu, Nepal's premium gear and apparel store.

STORE INFO:
- Name: Mozamandu
- Location: Nepal  
- Currency: Nepali Rupees (Rs)
- Categories: ${categoryList || 'Various categories'}

CURRENT PRODUCTS (${products.length} available):
${productSummaries || 'Products loading...'}

FAQS:
${faqSummaries || 'Contact us for questions!'}

CRITICAL RESPONSE RULES:
1. Be warm, helpful, and conversational - like a friendly shop assistant
2. Keep responses SHORT and FOCUSED (2-3 sentences max for simple queries)
3. When mentioning products, use this EXACT format: **Product Name** - Rs X,XXX [PRODUCT_ID:uuid-here]
4. ALWAYS include the [PRODUCT_ID:uuid] tag right after the price - this creates clickable links
5. Recommend 1-3 products max per response - quality over quantity
6. Use bullet points (•) for lists, NOT asterisks
7. Don't use raw markdown asterisks for emphasis in regular text
8. If a product isn't in stock or doesn't exist, say so honestly
9. For order/account questions, direct to their dashboard
10. End with a helpful follow-up question when appropriate

GOOD RESPONSE EXAMPLE:
"Here are some great new arrivals! 🎉

• **Premium Cotton Hoodie** - Rs 2,500 [PRODUCT_ID:abc-123] - Super comfy and perfect for the weather
• **Winter Beanie** - Rs 800 [PRODUCT_ID:def-456] - Our bestseller this season

Would you like to know more about any of these?"

BAD RESPONSE (never do this):
"* **Product** - Rs 900 - Stay..." ← incomplete, uses asterisks, no product ID

Remember: Always complete your sentences, use proper formatting, and include product IDs for linking!`;
}

async function callLovableAI(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  // Build messages array
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    { role: 'user', content: userMessage }
  ];

  console.log('Calling Lovable AI with', messages.length, 'messages');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 800,
      }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error('AI is busy right now. Please try again in a moment.');
    }
    if (response.status === 402) {
      throw new Error('AI service temporarily unavailable.');
    }
    throw new Error(`AI service error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from AI');
  }

  return data.choices[0].message?.content || "I'm sorry, I couldn't generate a response. Please try again.";
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

    // Fetch products, categories, and FAQs in parallel
    const [products, categories, faqs] = await Promise.all([
      fetchAllProducts(),
      fetchCategories(),
      fetchFAQs()
    ]);

    console.log(`Loaded ${products.length} products, ${categories.length} categories, ${faqs.length} FAQs`);

    // Build context with product data
    const systemPrompt = buildProductContext(products, categories, faqs);

    // Call Lovable AI
    const response = await callLovableAI(systemPrompt, message, conversationHistory);

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
        response: error.message.includes('busy') || error.message.includes('unavailable')
          ? error.message
          : "I'm sorry, I'm having trouble right now. Please try again in a moment.",
      }),
      {
        status: error.message.includes('busy') ? 429 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
