import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ModernNavbar } from '@/components/navbar';
import { Footer } from '@/components/layout/Footer';
import { SimilarProducts, MoreSubcategories, ProductReviews } from '@/components/product';
import { MoreFromMozamandu } from '@/components/product/MoreFromMozamandu';
import { ProductImageGallery } from '@/components/product/ProductImageGallery';
import { ProductInfo } from '@/components/product/ProductInfo';
import { ProductDetailsAccordion } from '@/components/product/ProductDetailsAccordion';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useRobustCart } from '@/hooks/useRobustCart';
import { getProductStockSummary, getBatchVariantStock, getSizeVariantStock } from '@/utils/stockCalculation';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Package, Home as HomeIcon } from 'lucide-react';

const SITE_URL = 'https://mozamandu.com';

interface Product {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
  selling_price: number | null;
  image_url: string | null;
  is_featured: boolean;
  has_color_variants: boolean;
  color_has_size_variants: boolean;
  category_id: string;
  subcategory_id: string;
  status: string;
  material_composition: string | null;
  care_instructions: string | null;
  // SEO fields
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string[] | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
}

interface ColorVariant {
  id: string;
  color_name: string;
  has_sizes: boolean;
  image_url: string | null;
  hex_code: string | null;
}

interface SizeVariant {
  id: string;
  size_name: string;
}

interface DiscountTier {
  id: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}

interface Subcategory {
  id: string;
  name: string;
  min_selling_price: number;
  minimum_quantity: number;
  description: string | null;
  category: { id: string; name: string } | null;
}

// Data fetching functions
const fetchProduct = async (productId: string) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
  if (error) throw error;
  return data;
};

const fetchSubcategory = async (subcategoryId: string): Promise<Subcategory | null> => {
  const { data } = await supabase
    .from('subcategories')
    .select('*, category:categories(id, name)')
    .eq('id', subcategoryId)
    .single();
  return data;
};

const fetchDiscountTiers = async (subcategoryId: string): Promise<DiscountTier[]> => {
  const { data } = await supabase
    .from('discount_tiers')
    .select('*')
    .eq('subcategory_id', subcategoryId)
    .order('min_quantity');
  // Support both discount_amount (external DB) and discount_percentage (Lovable Cloud) columns
  return (data || []).map((tier: any) => ({
    id: tier.id,
    min_quantity: tier.min_quantity,
    max_quantity: tier.max_quantity,
    // Prefer discount_amount, fallback to discount_percentage for backward compatibility
    discount_amount: tier.discount_amount ?? tier.discount_percentage ?? 0,
  })) as DiscountTier[];
};

const fetchColorVariants = async (productId: string): Promise<ColorVariant[]> => {
  const { data } = await supabase
    .from('color_variants')
    .select('id, color_name, has_sizes, image_url, colors(hex_code)')
    .eq('product_id', productId);
  const variants = (data || []).map((cv: any) => ({
    id: cv.id,
    color_name: cv.color_name,
    has_sizes: cv.has_sizes,
    image_url: cv.image_url,
    hex_code: cv.colors?.hex_code || null,
  }));
  
  // Filter out color variants with 0 stock
  if (variants.length === 0) return variants;
  const colorStockMap = await getBatchVariantStock(productId);
  return variants.filter(v => (colorStockMap[v.id] || 0) > 0);
};

const fetchAdditionalImages = async (productId: string): Promise<string[]> => {
  // Try product_additional_images table first (external DB structure)
  const { data: additionalData, error: additionalError } = await supabase
    .from('product_additional_images' as any)
    .select('image_url')
    .eq('product_id', productId)
    .order('display_order');
  
  // If the table exists and has data, use it
  if (!additionalError && additionalData && additionalData.length > 0) {
    return (additionalData as any[]).map(img => img.image_url);
  }
  
  // Fallback to product_images table (Lovable Cloud structure)
  const { data } = await supabase
    .from('product_images')
    .select('image_url')
    .eq('product_id', productId);
  
  return data?.map(img => img.image_url) || [];
};

const fetchProductRating = async (productId: string) => {
  const { data } = await supabase
    .from('product_reviews')
    .select('rating')
    .eq('product_id', productId)
    .eq('status', 'approved');
  
  if (!data || data.length === 0) {
    return { average_rating: 0, review_count: 0 };
  }
  
  const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
  return { average_rating: totalRating / data.length, review_count: data.length };
};

interface ProductFAQ {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
}

const fetchProductFAQs = async (productId: string): Promise<ProductFAQ[]> => {
  const { data, error } = await supabase
    .from('product_faqs' as any)
    .select('id, question, answer, is_active')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  
  if (error) {
    console.error('Error fetching product FAQs:', error);
    return [];
  }
  return (data as unknown) as ProductFAQ[];
};

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>([]);

  const { addToCart, cartItems } = useRobustCart();

  // Data queries with caching
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId!),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: subcategory } = useQuery({
    queryKey: ['product-subcategory', product?.subcategory_id],
    queryFn: () => fetchSubcategory(product!.subcategory_id),
    enabled: !!product?.subcategory_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: discountTiersData = [] } = useQuery({
    queryKey: ['discount-tiers', product?.subcategory_id],
    queryFn: () => fetchDiscountTiers(product!.subcategory_id),
    enabled: !!product?.subcategory_id,
    staleTime: 10 * 60 * 1000,
  });

  const { data: colorVariants = [] } = useQuery({
    queryKey: ['color-variants', productId],
    queryFn: () => fetchColorVariants(productId!),
    enabled: !!productId && product?.has_color_variants,
    staleTime: 5 * 60 * 1000,
  });

  const { data: additionalImages = [] } = useQuery({
    queryKey: ['product-images', productId],
    queryFn: () => fetchAdditionalImages(productId!),
    enabled: !!productId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: productStock = 0 } = useQuery({
    queryKey: ['product-stock', productId],
    queryFn: () => getProductStockSummary(productId!),
    enabled: !!productId,
    staleTime: 1 * 60 * 1000,
  });

  const { data: ratingData } = useQuery({
    queryKey: ['product-rating-detail', productId],
    queryFn: () => fetchProductRating(productId!),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch product FAQs for FAQ schema
  const { data: productFAQs = [] } = useQuery({
    queryKey: ['product-faqs-public', productId],
    queryFn: () => fetchProductFAQs(productId!),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });

  // Build image gallery
  const images = useMemo(() => {
    const imgs: string[] = [];

    const selectedCv = colorVariants.find(cv => cv.id === selectedColor);
    if (selectedCv?.image_url) imgs.push(selectedCv.image_url);

    if (product?.image_url) imgs.push(product.image_url);
    additionalImages.forEach(img => {
      if (!imgs.includes(img)) imgs.push(img);
    });
    colorVariants.forEach(cv => {
      if (cv.id === selectedColor) return;
      if (cv.image_url && !imgs.includes(cv.image_url)) {
        imgs.push(cv.image_url);
      }
    });
    return imgs;
  }, [product?.image_url, additionalImages, colorVariants, selectedColor]);

  // Reset selections when product changes
  useEffect(() => {
    setSelectedColor('');
    setSelectedSize('');
    setSizeVariants([]);
    setQuantity(1);
  }, [productId]);

  // Set initial color selection when colorVariants load
  useEffect(() => {
    if (colorVariants.length > 0 && !selectedColor) {
      setSelectedColor(colorVariants[0].id);
    }
  }, [colorVariants]);

  // Fetch size variants when color changes
  useEffect(() => {
    if (selectedColor && product?.color_has_size_variants) {
      fetchSizeVariantsForColor(selectedColor);
    }
  }, [selectedColor, product?.color_has_size_variants]);

  const fetchSizeVariantsForColor = async (colorVariantId: string) => {
    const { data } = await supabase
      .from('size_variants')
      .select('id, size_name')
      .eq('color_variant_id', colorVariantId);

    // Filter out size variants with 0 stock
    const allSizes = data || [];
    if (allSizes.length > 0) {
      const sizeStockMap = await getSizeVariantStock(colorVariantId);
      const inStockSizes = allSizes.filter(s => (sizeStockMap[s.id] || 0) > 0);
      setSizeVariants(inStockSizes);
      if (inStockSizes.length > 0) {
        setSelectedSize(inStockSizes[0].id);
      }
    } else {
      setSizeVariants([]);
    }
  };

  // Cart quantity calculation - handle undefined/null/empty string consistently
  const getCartQuantity = () => {
    const cartItem = cartItems.find(item => {
      const productMatch = item.productId === product?.id;
      
      // Normalize values - treat undefined, null, and empty string as equivalent
      const itemColorId = item.colorVariantId || null;
      const itemSizeId = item.sizeVariantId || null;
      const currentColorId = selectedColor || null;
      const currentSizeId = selectedSize || null;
      
      if (!product?.has_color_variants) {
        return productMatch && !itemColorId && !itemSizeId;
      }
      if (product?.has_color_variants && !product?.color_has_size_variants) {
        return productMatch && itemColorId === currentColorId && !itemSizeId;
      }
      if (product?.has_color_variants && product?.color_has_size_variants) {
        return productMatch && itemColorId === currentColorId && itemSizeId === currentSizeId;
      }
      return productMatch;
    });
    return cartItem?.quantity || 0;
  };

  const currentCartQuantity = getCartQuantity();
  // If selling_price is 0 or null, fall back to subcategory min_selling_price, then cost_price
  const basePrice =
    (product?.selling_price && product.selling_price > 0)
      ? product.selling_price
      : (subcategory?.min_selling_price ?? product?.cost_price ?? 0);

  // Calculate total subcategory quantity with current selection
  const getTotalSubcategoryQuantityWithCurrent = () => {
    const existingQuantity = cartItems
      .filter(item => item.subcategoryId === product?.subcategory_id)
      .reduce((total, item) => total + item.quantity, 0);
    return existingQuantity + quantity;
  };

  // Get applicable discount tier
  const getApplicableTier = (totalQty: number) => {
    const sortedTiers = [...discountTiersData].sort((a, b) => b.min_quantity - a.min_quantity);
    for (const tier of sortedTiers) {
      if (
        totalQty >= tier.min_quantity &&
        (tier.max_quantity === null || totalQty <= tier.max_quantity)
      ) {
        return tier;
      }
    }
    return null;
  };

  const totalSubcategoryQuantityWithCurrent = getTotalSubcategoryQuantityWithCurrent();
  const applicableTier = getApplicableTier(totalSubcategoryQuantityWithCurrent);
  
  const discountedPrice = applicableTier 
    ? basePrice - applicableTier.discount_amount 
    : basePrice;
  
  const savings = applicableTier ? applicableTier.discount_amount * quantity : 0;
  const discountPercent = applicableTier && basePrice > 0
    ? Math.round((applicableTier.discount_amount / basePrice) * 100)
    : 0;

  const handleAddToCart = async () => {
    if (!product) return;
    
    setActionLoading(true);
    try {
      // useRobustCart already shows toast on success/failure
      await addToCart({
        productId: product.id,
        productName: product.name,
        quantity,
        colorVariantId: selectedColor || undefined,
        sizeVariantId: selectedSize || undefined,
        unitPrice: basePrice,
      });
      // Reset quantity after adding
      setQuantity(1);
    } catch {
      // Error toast already handled by useRobustCart
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    
    const added = await addToCart({
      productId: product.id,
      productName: product.name,
      quantity,
      colorVariantId: selectedColor || undefined,
      sizeVariantId: selectedSize || undefined,
      unitPrice: basePrice,
    });
    
    if (!added) return;
    
    const currentCartTotal = cartItems.reduce((total, item) => total + item.totalPrice, 0);
    const itemPrice = basePrice;
    const newTotal = currentCartTotal + (itemPrice * quantity);
    
    if (newTotal >= 1000) {
      navigate('/checkout');
      return;
    }
    
    const { data: subcategoryData } = await supabase
      .from('subcategories')
      .select('minimum_quantity')
      .eq('id', product.subcategory_id)
      .single();
    
    if (subcategoryData) {
      const subcategoryQuantity = cartItems
        .filter(item => item.subcategoryId === product.subcategory_id)
        .reduce((total, item) => total + item.quantity, 0) + quantity;
      
      if (subcategoryQuantity < subcategoryData.minimum_quantity) {
        toast({
          title: 'Minimum Order Not Met',
          description: `You need at least ${subcategoryData.minimum_quantity} items from this category, or reach Rs. 1000 total`,
          variant: 'destructive'
        });
        return;
      }
    }
    
    navigate('/checkout');
  };

  // Loading state
  if (productLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ModernNavbar />
        <div className="max-w-7xl mx-auto px-4 py-6 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="aspect-[4/5] lg:aspect-square bg-muted rounded-xl lg:rounded-2xl animate-pulse" />
            <div className="space-y-6">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-10 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="h-32 bg-muted rounded-xl animate-pulse" />
              <div className="h-14 bg-muted rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <ModernNavbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-muted rounded-full mx-auto flex items-center justify-center mb-6">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">This product may have been removed or does not exist.</p>
          <Button onClick={() => navigate('/')} size="lg" className="rounded-full">
            <HomeIcon className="w-4 h-4 mr-2" />
            Return Home
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Generate SEO data
  const canonicalUrl = `${SITE_URL}/product/${productId}`;
  const categoryName = subcategory?.category?.name || '';
  const subcategoryName = subcategory?.name || '';
  
  // Cast product to include SEO fields (added manually to external Supabase)
  const productWithSEO = product as Product;
  
  // Meta title - use product's custom meta_title or generate from name
  const seoTitle = productWithSEO.meta_title || `${product.name}${categoryName ? ` - ${categoryName}` : ''} | Buy at Mozamandu Nepal`;
  
  // Meta description - use custom or generate from product description
  const seoDescription = productWithSEO.meta_description || 
    (product.description 
      ? `Buy ${product.name} at Rs. ${discountedPrice}. ${product.description.replace(/<[^>]*>/g, '').slice(0, 100)}... Shop at Mozamandu Nepal.`
      : `Buy ${product.name} at the best price of Rs. ${discountedPrice}. Premium quality products with fast delivery across Nepal.`
    ).slice(0, 160);
  
  // Keywords
  const seoKeywords = productWithSEO.meta_keywords?.join(', ') || 
    `${product.name}, ${categoryName}, ${subcategoryName}, buy online, nepal, mozamandu`.toLowerCase();
  
  // Open Graph
  const ogTitle = productWithSEO.og_title || seoTitle;
  const ogDescription = productWithSEO.og_description || seoDescription;
  const ogImage = productWithSEO.og_image_url || product.image_url || images[0] || '';
  
  // Build all product images for schema
  const allProductImages = images.filter(Boolean);
  
  // Product Schema JSON-LD
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description?.replace(/<[^>]*>/g, '') || seoDescription,
    "image": allProductImages,
    "brand": {
      "@type": "Brand",
      "name": "Mozamandu"
    },
    "sku": productId,
    "mpn": productId,
    "offers": {
      "@type": "Offer",
      "url": canonicalUrl,
      "priceCurrency": "NPR",
      "price": discountedPrice,
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "availability": productStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Mozamandu"
      }
    },
    ...(ratingData && ratingData.review_count > 0 && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": ratingData.average_rating.toFixed(1),
        "reviewCount": ratingData.review_count,
        "bestRating": "5",
        "worstRating": "1"
      }
    })
  };
  
  // Breadcrumb Schema JSON-LD
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": SITE_URL
      },
      ...(categoryName ? [{
        "@type": "ListItem",
        "position": 2,
        "name": categoryName,
        "item": `${SITE_URL}/shop?category=${encodeURIComponent(categoryName)}`
      }] : []),
      ...(subcategoryName ? [{
        "@type": "ListItem",
        "position": categoryName ? 3 : 2,
        "name": subcategoryName,
        "item": `${SITE_URL}/shop?subcategory=${subcategory?.id}`
      }] : []),
      {
        "@type": "ListItem",
        "position": (categoryName ? 3 : 2) + (subcategoryName ? 1 : 0),
        "name": product.name
      }
    ]
  };

  // FAQ Schema JSON-LD (for Google rich results)
  const faqSchema = productFAQs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": productFAQs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  } : null;

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={seoKeywords} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Mozamandu" />
        <meta property="product:price:amount" content={String(discountedPrice)} />
        <meta property="product:price:currency" content="NPR" />
        <meta property="product:availability" content={productStock > 0 ? "in stock" : "out of stock"} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
        
        {/* Product Schema JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(productSchema)}
        </script>
        
        {/* Breadcrumb Schema JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        
        {/* FAQ Schema JSON-LD */}
        {faqSchema && (
          <script type="application/ld+json">
            {JSON.stringify(faqSchema)}
          </script>
        )}
      </Helmet>

      <ModernNavbar />
      
      <main className="max-w-7xl mx-auto px-4 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
          {/* Left: Image Gallery */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductImageGallery
              images={images}
              productName={product.name}
              isFeatured={product.is_featured}
              discountPercent={discountPercent}
            />
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            <ProductInfo
              productName={product.name}
              subcategoryName={subcategory?.name}
              subcategoryId={subcategory?.id}
              basePrice={basePrice}
              stock={productStock}
              quantity={quantity}
              cartQuantity={currentCartQuantity}
              colorVariants={colorVariants}
              sizeVariants={sizeVariants}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              discountTiers={discountTiersData}
              hasColorVariants={product.has_color_variants || false}
              hasSizeVariants={product.color_has_size_variants || false}
              averageRating={Number(ratingData?.average_rating) || 0}
              reviewCount={ratingData?.review_count || 0}
              cartItems={cartItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                subcategoryId: item.subcategoryId,
                basePrice: item.basePrice,
                totalPrice: item.totalPrice
              }))}
              onQuantityChange={setQuantity}
              onColorChange={setSelectedColor}
              onSizeChange={setSelectedSize}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              isLoading={actionLoading}
            />

            {/* Product Details Accordion */}
            <ProductDetailsAccordion
              description={product.description}
              materialComposition={product.material_composition}
              careInstructions={product.care_instructions}
            />

            {/* Product FAQs Section */}
            {productFAQs.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Frequently Asked Questions</h3>
                <Accordion type="single" collapsible className="w-full">
                  {productFAQs.map((faq, index) => (
                    <AccordionItem key={faq.id} value={`faq-${index}`} className="border-b border-border">
                      <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline py-4">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-4">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Similar Products */}
      {product.category_id && (
        <SimilarProducts 
          categoryId={product.category_id} 
          currentProductId={product.id} 
        />
      )}

      {/* More Subcategories */}
      {product.category_id && product.subcategory_id && (
        <MoreSubcategories 
          categoryId={product.category_id} 
          currentSubcategoryId={product.subcategory_id} 
        />
      )}

      {/* Customer Reviews */}
      <div className="max-w-7xl mx-auto px-4">
        <ProductReviews productId={product.id} />
      </div>

      {/* More from Mozamandu */}
      <MoreFromMozamandu currentProductId={product.id} />

      <Footer />
    </div>
  );
}
