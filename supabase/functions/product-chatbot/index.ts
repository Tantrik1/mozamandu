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
    const stock = p.available_stock && p.available_stock > 0 ? 'In Stock' : 'Low Stock';
    return `- ${p.name} (ID: ${p.id}): ${p.description?.substring(0, 100) || 'Premium quality product'} | Category: ${p.category_name || 'General'} | Price: Rs ${price} | ${stock}`;
  }).join('\n');

  const faqSummaries = faqs.slice(0, 10).map(f => 
    `Q: ${f.question}\nA: ${f.answer}`
  ).join('\n\n');

  return `You are the AI shopping assistant for Mozamandu, a premium gear and apparel shop in Nepal. You are helpful, friendly, and knowledgeable about our products.

STORE INFO:
- Name: Mozamandu
- Speciality: Quality gear and apparel
- Currency: Nepali Rupees (Rs)

AVAILABLE CATEGORIES: ${categoryList || 'Various categories'}

TOP PRODUCTS (${products.length} total):
${productSummaries || 'Various products available'}

FREQUENTLY ASKED QUESTIONS:
${faqSummaries || 'Ask me anything about our products!'}

RESPONSE GUIDELINES:
1. Be conversational, helpful, and enthusiastic about our products
2. When recommending products, format as: **Product Name** - Rs Price
3. Always include the product ID in this exact format for linking: [PRODUCT_ID:uuid-here]
4. Recommend 1-3 relevant products at a time, not more
5. If asked about stock/availability, sizes, or colors, suggest checking the product page
6. For pricing, show the best available price (min_selling_price or selling_price)
7. If you don't know something, be honest and suggest contacting customer support
8. Keep responses concise but helpful (2-4 sentences max for general queries)
9. Use emojis sparingly to add personality ✨
10. For order status or account questions, direct them to login to their account

EXAMPLE PRODUCT RECOMMENDATION:
"I'd recommend checking out **Premium Cotton T-Shirt** - Rs 1,200 [PRODUCT_ID:abc-123] - it's one of our bestsellers! 🌟"

Remember: You represent Mozamandu. Be professional, helpful, and enthusiastic!`;
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
      max_tokens: 500,
      temperature: 0.7,
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
