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
  selling_price: number | null;
  image_url: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  subcategory_description: string | null;
  subcategory_min_selling_price: number | null;
  subcategory_max_selling_price: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Subcategory {
  name: string;
  description: string | null;
  min_selling_price: number | null;
  max_selling_price: number | null;
  category_name: string | null;
}

interface InventoryItem {
  product_id: string;
  sku: string;
  color_name: string | null;
  size_name: string | null;
  selling_price: number | null;
  stock_quantity: number;
  available_stock: number | null;
  reserved_stock: number;
  created_at: string | null;
  updated_at: string | null;
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
      selling_price,
      image_url,
      created_at,
      updated_at,
      categories(name),
      subcategories(name, description, min_selling_price, max_selling_price)
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
    selling_price: p.selling_price,
    image_url: p.image_url,
    category_name: p.categories?.name || null,
    subcategory_name: p.subcategories?.name || null,
    subcategory_description: p.subcategories?.description || null,
    subcategory_min_selling_price: p.subcategories?.min_selling_price ?? null,
    subcategory_max_selling_price: p.subcategories?.max_selling_price ?? null,
    created_at: p.created_at ?? null,
    updated_at: p.updated_at ?? null,
  }));
}

async function fetchSubcategories(): Promise<Subcategory[]> {
  const { data, error } = await supabase
    .from('subcategories')
    .select(`
      name,
      description,
      min_selling_price,
      max_selling_price,
      categories(name)
    `)
    .eq('status', 'on')
    .order('name');

  if (error) {
    console.error('Error fetching subcategories:', error);
    return [];
  }

  return (data || []).map((s: any) => ({
    name: s.name,
    description: s.description ?? null,
    min_selling_price: s.min_selling_price ?? null,
    max_selling_price: s.max_selling_price ?? null,
    category_name: s.categories?.name ?? null,
  }));
}

async function fetchActiveInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('product_inventory')
    .select(
      'product_id, sku, color_name, size_name, selling_price, stock_quantity, available_stock, reserved_stock, created_at, updated_at'
    )
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching inventory:', error);
    return [];
  }

  return (data || []).map((i: any) => ({
    product_id: i.product_id,
    sku: i.sku,
    color_name: i.color_name ?? null,
    size_name: i.size_name ?? null,
    selling_price: i.selling_price ?? null,
    stock_quantity: i.stock_quantity ?? 0,
    available_stock: i.available_stock ?? null,
    reserved_stock: i.reserved_stock ?? 0,
    created_at: i.created_at ?? null,
    updated_at: i.updated_at ?? null,
  }));
}

async function fetchChatbotKnowledge(): Promise<string> {
  const { data, error } = await supabase
    .from('chatbot_knowledge')
    .select('knowledge_text')
    .eq('slug', 'default')
    .maybeSingle();

  if (error) {
    console.error('Error fetching chatbot knowledge:', error);
    return '';
  }

  return data?.knowledge_text ?? '';
}

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  return `Rs ${Number(value)}`;
}

function buildProductContext(
  products: Product[],
  subcategories: Subcategory[],
  inventory: InventoryItem[],
  knowledgeText: string
): string {
  const inventoryByProductId = new Map<string, InventoryItem[]>();
  for (const item of inventory) {
    const existing = inventoryByProductId.get(item.product_id);
    if (existing) existing.push(item);
    else inventoryByProductId.set(item.product_id, [item]);
  }

  const productPricing = new Map<
    string,
    {
      minPrice: number | null;
      maxPrice: number | null;
      variantCount: number;
      totalStock: number;
      totalAvailable: number;
    }
  >();

  for (const p of products) {
    const items = inventoryByProductId.get(p.id) ?? [];
    const prices = items.map(i => i.selling_price).filter((v): v is number => typeof v === 'number');
    const minInv = prices.length ? Math.min(...prices) : null;
    const maxInv = prices.length ? Math.max(...prices) : null;
    const minPrice = minInv ?? p.selling_price ?? null;
    const maxPrice = maxInv ?? p.selling_price ?? null;

    const totalStock = items.reduce((sum, i) => sum + (i.stock_quantity ?? 0), 0);
    const totalAvailable = items.reduce((sum, i) => sum + (i.available_stock ?? 0), 0);

    productPricing.set(p.id, {
      minPrice,
      maxPrice,
      variantCount: items.length,
      totalStock,
      totalAvailable,
    });
  }

  const categoryNames = Array.from(
    new Set(subcategories.map(s => s.category_name).filter((n): n is string => Boolean(n)))
  ).sort((a, b) => a.localeCompare(b));

  const categoryList = categoryNames.join(', ');

  const subcategorySummaries = subcategories
    .map(s => {
      const relatedProducts = products.filter(p => p.subcategory_name === s.name);
      const relatedIds = relatedProducts.map(p => p.id);
      const relatedPrices = relatedIds
        .map(id => productPricing.get(id))
        .flatMap(v => (v?.minPrice !== null && v?.minPrice !== undefined ? [v.minPrice] : []));
      const computedMin = relatedPrices.length ? Math.min(...relatedPrices) : null;
      const relatedMaxPrices = relatedIds
        .map(id => productPricing.get(id))
        .flatMap(v => (v?.maxPrice !== null && v?.maxPrice !== undefined ? [v.maxPrice] : []));
      const computedMax = relatedMaxPrices.length ? Math.max(...relatedMaxPrices) : null;

      const configuredMin = s.min_selling_price ?? null;
      const configuredMax = s.max_selling_price ?? null;

      return `- ${s.category_name ?? 'Uncategorized'} > ${s.name}: ${s.description ?? 'No description'} | Price range: ${formatPrice(computedMin ?? configuredMin)} - ${formatPrice(computedMax ?? configuredMax)} | Products: ${relatedProducts.length}`;
    })
    .join('\n');

  const productSummaries = products
    .map(p => {
      const pricing = productPricing.get(p.id);
      const pricePart = pricing
        ? pricing.minPrice !== null && pricing.maxPrice !== null && pricing.minPrice !== pricing.maxPrice
          ? `${formatPrice(pricing.minPrice)} - ${formatPrice(pricing.maxPrice)}`
          : formatPrice(pricing.minPrice)
        : formatPrice(p.selling_price);

      const stockPart = pricing
        ? `Variants: ${pricing.variantCount} | Stock: ${pricing.totalStock} | Available: ${pricing.totalAvailable}`
        : `Variants: 0 | Stock: 0 | Available: 0`;

      const datesPart = `Created: ${p.created_at ?? 'N/A'} | Updated: ${p.updated_at ?? 'N/A'}`;

      return `- ${p.name} (ID: ${p.id}): ${p.description || 'No description'} | Category: ${p.category_name || 'Uncategorized'} | Subcategory: ${p.subcategory_name || 'None'} | Selling price: ${pricePart} | ${stockPart} | ${datesPart}`;
    })
    .join('\n');

  return `
You are a helpful shopping assistant for Mozamandu, a gear and apparel shop. Your role is to help customers find the perfect products based on their needs.

ADMIN KNOWLEDGE (high priority, must follow):
${knowledgeText?.trim() ? knowledgeText.trim() : '(none)'}

AVAILABLE CATEGORIES: ${categoryList}

AVAILABLE SUBCATEGORIES (with descriptions & price ranges):
${subcategorySummaries}

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
11. For pricing, ONLY use the provided selling prices and computed ranges in the context. Do not guess or invent prices. If a price is N/A, say pricing is not available.
12. Only answer questions using the provided context (products/categories/subcategories/inventory and admin knowledge). If asked about unrelated topics, politely say you can only help with Mozamandu products and store information.

Remember: You are representing Mozamandu. Be professional yet friendly!
`;
}

async function callGeminiAPI(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<{ text: string; retryAfterSeconds?: number; rateLimited?: boolean }> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  const primaryModel = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  const fallbackModelsEnv = Deno.env.get('GEMINI_FALLBACK_MODELS');
  const fallbackModels = (fallbackModelsEnv
    ? fallbackModelsEnv.split(',').map((m: string) => m.trim()).filter(Boolean)
    : [
        'gemini-2.5-flash-lite',
        'gemma-3-4b',
        'gemma-3-12b',
        'gemma-3-2b',
        'gemma-3-1b',
      ]);

  const modelChain = Array.from(new Set([primaryModel, ...fallbackModels]));
  
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

  let lastRetryAfterSeconds: number | undefined;

  for (const geminiModel of modelChain) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
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
      console.error(`Gemini API error (model=${geminiModel}, status=${response.status}):`, errorText);

      // Retryable failures: model not found / quota / transient server errors
      const isRetryable = response.status === 404 || response.status === 429 || response.status >= 500;

      if (response.status === 429) {
        try {
          const parsed = JSON.parse(errorText);
          const retryInfo = parsed?.error?.details?.find((d: any) => d?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
          const retryDelay = retryInfo?.retryDelay as string | undefined;
          if (retryDelay && typeof retryDelay === 'string') {
            const match = retryDelay.match(/^(\d+)s$/);
            if (match) lastRetryAfterSeconds = Number(match[1]);
          }
        } catch {
          // ignore parse errors
        }
      }

      if (isRetryable) {
        continue;
      }

      // Non-retryable failures (bad auth/request): fail fast
      return {
        text: "I'm sorry, I'm having trouble right now. Please try again in a moment.",
      };
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      // Try next model (rare but possible)
      continue;
    }

    const candidate = data.candidates[0];
    if (candidate.finishReason === 'SAFETY') {
      return { text: "I apologize, but I can't respond to that. How can I help you find products today?" };
    }

    return {
      text: candidate.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response. Please try again.",
    };
  }

  // All models failed
  if (lastRetryAfterSeconds !== undefined) {
    return {
      text: "I'm temporarily busy due to API limits. Please wait a bit and try again.",
      retryAfterSeconds: lastRetryAfterSeconds,
      rateLimited: true,
    };
  }

  return {
    text: "I'm sorry, I'm having trouble right now. Please try again in a moment.",
  };
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

    // Fetch products, subcategories, inventory, and admin knowledge
    const [products, subcategories, inventory, knowledgeText] = await Promise.all([
      fetchAllProducts(),
      fetchSubcategories(),
      fetchActiveInventory(),
      fetchChatbotKnowledge(),
    ]);

    console.log(`Loaded ${products.length} products, ${subcategories.length} subcategories, and ${inventory.length} inventory rows`);

    // Build context with product data + admin knowledge
    const systemPrompt = buildProductContext(products, subcategories, inventory, knowledgeText);

    // Call Gemini API
    const gemini = await callGeminiAPI(systemPrompt, message, conversationHistory);
    const responseText = gemini.text;

    // Extract product IDs from response for frontend linking
    const productIdRegex = /\[PRODUCT_ID:([a-f0-9-]+)\]/gi;
    const mentionedProductIds: string[] = [];
    let match;
    while ((match = productIdRegex.exec(responseText)) !== null) {
      mentionedProductIds.push(match[1]);
    }

    // Clean response by removing product ID markers
    const cleanResponse = responseText.replace(/\[PRODUCT_ID:[a-f0-9-]+\]/gi, '');

    // Get product details for mentioned products
    const inventoryByProductId = new Map<string, InventoryItem[]>();
    for (const item of inventory) {
      const existing = inventoryByProductId.get(item.product_id);
      if (existing) existing.push(item);
      else inventoryByProductId.set(item.product_id, [item]);
    }

    const mentionedProducts = products.filter(p => mentionedProductIds.includes(p.id));

    return new Response(
      JSON.stringify({
        success: true,
        response: cleanResponse,
        mentionedProducts: mentionedProducts.map(p => ({
          id: p.id,
          name: p.name,
          image_url: p.image_url,
          price: (() => {
            const items = inventoryByProductId.get(p.id) ?? [];
            const prices = items.map(i => i.selling_price).filter((v): v is number => typeof v === 'number');
            const minInv = prices.length ? Math.min(...prices) : null;
            return minInv ?? p.selling_price ?? 0;
          })(),
        })),
        retryAfterSeconds: gemini.retryAfterSeconds,
        rateLimited: gemini.rateLimited,
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
